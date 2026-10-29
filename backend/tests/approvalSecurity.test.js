const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const db = require('../src/db');
const { planTaskRequest, computePlanHash, PLAN_TTL_MS } = require('../src/services/agentPlanner');
const { approveExecution, rejectExecution, createExecution } = require('../src/controllers/agentController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test('Security & Cryptography: plan includes cryptographic hash and TTL', () => {
  const plan = planTaskRequest('Create a task to study Docker and CI/CD', 'STUDENT');

  assert.ok(plan.planHash, 'plan must have a planHash');
  assert.equal(plan.planHash.length, 64, 'SHA-256 hash must be 64 hex characters');
  assert.ok(plan.expiresAt, 'plan must have expiresAt ISO string');
  assert.ok(new Date(plan.expiresAt) > new Date(), 'expiresAt must be in the future');

  // Verify hash matches expected canonical payload
  const recomputed = computePlanHash(plan.steps, plan.intent);
  assert.equal(plan.planHash, recomputed);
});

test('Security & Cryptography: detects altered parameters or modified plan', () => {
  const plan = planTaskRequest('Create a task to build Kubernetes cluster', 'PROFESSIONAL');
  const originalHash = plan.planHash;

  // Simulate an attacker or bug changing the task title in the plan
  const tamperedSteps = JSON.parse(JSON.stringify(plan.steps));
  tamperedSteps[0].input.title = 'DROP DATABASE users;';

  const tamperedHash = computePlanHash(tamperedSteps, plan.intent);
  assert.notEqual(tamperedHash, originalHash, 'Tampered steps must result in a different hash');
});

test('Security & Multi-Tenancy: User B cannot approve User A’s action plan', async () => {
  const originalConnect = db.pool.connect;

  // Mock DB where execution belongs to User A ('user-aaa'), but requester is User B ('user-bbb')
  db.pool.connect = async () => ({
    query: async (sql, params) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'exec-123',
            user_id: 'user-aaa',
            status: 'AWAITING_APPROVAL',
            plan: planTaskRequest('Create a task to prepare release notes', 'STUDENT'),
            created_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req = {
      user: { id: 'user-bbb', role: 'STUDENT' }, // Different user!
      params: { id: 'exec-123' },
      body: {},
    };
    const res = createMockRes();

    await approveExecution(req, res);

    assert.equal(res.statusCode, 403, 'Must return 403 Forbidden for cross-tenant approval');
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Forbidden.*cannot approve another user/i);
  } finally {
    db.pool.connect = originalConnect;
  }
});

test('Security & Multi-Tenancy: User B cannot reject User A’s action plan', async () => {
  const originalConnect = db.pool.connect;

  db.pool.connect = async () => ({
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'exec-456',
            user_id: 'user-aaa',
            status: 'AWAITING_APPROVAL',
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req = {
      user: { id: 'user-bbb', role: 'STUDENT' },
      params: { id: 'exec-456' },
    };
    const res = createMockRes();

    await rejectExecution(req, res);

    assert.equal(res.statusCode, 403, 'Must return 403 Forbidden for cross-tenant rejection');
    assert.equal(res.body.success, false);
  } finally {
    db.pool.connect = originalConnect;
  }
});

test('Security & Plan Integrity: rejects modified plan with corrupted hash', async () => {
  const originalConnect = db.pool.connect;
  const plan = planTaskRequest('Create a task to configure Grafana dashboard', 'PROFESSIONAL');
  // Corrupt the recorded hash
  plan.planHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

  db.pool.connect = async () => ({
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'exec-tampered',
            user_id: 'user-owner',
            status: 'AWAITING_APPROVAL',
            plan,
            created_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req = {
      user: { id: 'user-owner', role: 'PROFESSIONAL' },
      params: { id: 'exec-tampered' },
      body: {},
    };
    const res = createMockRes();

    await approveExecution(req, res);

    assert.equal(res.statusCode, 400, 'Must return 400 Bad Request for tampered plan hash');
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Plan integrity check failed/i);
  } finally {
    db.pool.connect = originalConnect;
  }
});

test('Security & Lifecycle: rejects approval for expired plans (TTL exceeded)', async () => {
  const originalConnect = db.pool.connect;
  const plan = planTaskRequest('Create a task to submit homework', 'STUDENT');
  // Set expired date in the past
  plan.expiresAt = new Date(Date.now() - 3600000).toISOString();

  db.pool.connect = async () => ({
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'exec-expired',
            user_id: 'user-student',
            status: 'AWAITING_APPROVAL',
            plan,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req = {
      user: { id: 'user-student', role: 'STUDENT' },
      params: { id: 'exec-expired' },
      body: {},
    };
    const res = createMockRes();

    await approveExecution(req, res);

    assert.equal(res.statusCode, 410, 'Must return 410 Gone for expired approval');
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /expired/i);
  } finally {
    db.pool.connect = originalConnect;
  }
});

test('Security & Idempotency: prevents double approval / re-approval of already completed execution', async () => {
  const originalConnect = db.pool.connect;

  db.pool.connect = async () => ({
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'exec-completed',
            user_id: 'user-me',
            status: 'COMPLETED', // Already completed!
            created_at: new Date().toISOString(),
          }],
        };
      }
      if (sql.includes('FROM tasks WHERE source_execution_id')) {
        return {
          rows: [{
            id: 'task-777',
            title: 'Existing task',
            status: 'PENDING',
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req = {
      user: { id: 'user-me', role: 'PROFESSIONAL' },
      params: { id: 'exec-completed' },
      body: {},
    };
    const res = createMockRes();

    await approveExecution(req, res);

    assert.equal(res.statusCode, 409, 'Must return 409 Conflict for double-click / already executed');
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already been approved/i);
  } finally {
    db.pool.connect = originalConnect;
  }
});

test('Security & Verification: returns failure and uncertain status when task cannot be verified in database', async () => {
  const originalConnect = db.pool.connect;
  const plan = planTaskRequest('Create a task to test database verification failure', 'PROFESSOR');

  db.pool.connect = async () => ({
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'exec-unverified',
            user_id: 'user-prof',
            status: 'AWAITING_APPROVAL',
            plan,
            created_at: new Date().toISOString(),
          }],
        };
      }
      // When verifying task in database: simulate empty result (task not found!)
      if (sql.includes('SELECT id, title, description, priority, status FROM tasks WHERE id =')) {
        return { rows: [] }; // NOT FOUND!
      }
      if (sql.includes('INSERT INTO tasks')) {
        return {
          rows: [{
            id: 'fake-task-id',
            title: 'test task',
            priority: 'MEDIUM',
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req = {
      user: { id: 'user-prof', role: 'PROFESSOR' },
      params: { id: 'exec-unverified' },
      body: {},
    };
    const res = createMockRes();

    await approveExecution(req, res);

    assert.equal(res.statusCode, 500, 'Must return 500 when verification fails');
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, 'UNCERTAIN');
    assert.equal(res.body.verified, false);
  } finally {
    db.pool.connect = originalConnect;
  }
});

test('Security & Concurrency: handles simultaneous concurrent approval requests safely', async () => {
  const originalConnect = db.pool.connect;
  const plan = planTaskRequest('Create a task to run concurrency stress test', 'PROFESSIONAL');

  // Shared execution state between concurrent requests
  let sharedStatus = 'AWAITING_APPROVAL';
  let taskCreatedCount = 0;

  db.pool.connect = async () => ({
    query: async (sql, params) => {
      if (sql === 'BEGIN') return {};
      if (sql === 'COMMIT') return {};
      if (sql === 'ROLLBACK') return {};

      // Simulated locked row query
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        const current = sharedStatus;
        if (current === 'AWAITING_APPROVAL') {
          // First query claims the row
          sharedStatus = 'RUNNING';
        }
        return {
          rows: [{
            id: 'exec-concurrent',
            user_id: 'user-concurrent',
            status: current,
            plan,
            created_at: new Date().toISOString(),
          }],
        };
      }

      if (sql.includes('UPDATE agent_executions SET status =')) {
        return {};
      }

      if (sql.includes('INSERT INTO tasks')) {
        taskCreatedCount += 1;
        return {
          rows: [{
            id: 'task-concurrent-1',
            title: 'run concurrency stress test',
            priority: 'MEDIUM',
          }],
        };
      }

      if (sql.includes('SELECT id, title, description, priority, status FROM tasks WHERE id =')) {
        return {
          rows: [{
            id: 'task-concurrent-1',
            title: 'run concurrency stress test',
            priority: 'MEDIUM',
            status: 'PENDING',
          }],
        };
      }

      return { rows: [] };
    },
    release: () => {},
  });

  try {
    const req1 = {
      user: { id: 'user-concurrent', role: 'PROFESSIONAL' },
      params: { id: 'exec-concurrent' },
      body: {},
    };
    const res1 = createMockRes();

    const req2 = {
      user: { id: 'user-concurrent', role: 'PROFESSIONAL' },
      params: { id: 'exec-concurrent' },
      body: {},
    };
    const res2 = createMockRes();

    // Fire both requests concurrently
    await Promise.all([
      approveExecution(req1, res1),
      approveExecution(req2, res2),
    ]);

    // One must succeed (200) and the other must be rejected with 409 Conflict
    const statuses = [res1.statusCode, res2.statusCode].sort();
    assert.deepEqual(statuses, [200, 409], 'Exactly one concurrent request succeeds (200) and the other conflicts (409)');
    assert.equal(taskCreatedCount, 1, 'Only one task may be created during concurrent attempts');
  } finally {
    db.pool.connect = originalConnect;
  }
});

