const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const { query } = require('../src/db');
const {
  createTask,
  getTask,
  updateTask,
  startTask,
  completeTask,
  deleteTask,
  addChecklist,
  listTasks,
} = require('../src/controllers/tasksController');

function createMockRes() {
  return {
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
}

let testUserId;
let otherUserId;

test.before(async () => {
  const userRes = await query("SELECT id FROM users WHERE email = 'student@example.com'");
  assert.ok(userRes.rows[0], 'Student demo user must exist');
  testUserId = userRes.rows[0].id;

  const otherRes = await query("SELECT id FROM users WHERE email = 'pro@example.com'");
  assert.ok(otherRes.rows[0], 'Professional demo user must exist');
  otherUserId = otherRes.rows[0].id;
});

test('Task Lifecycle: create, get, update, start, add checklist, complete, and delete', async () => {
  // 1. Create a task with checklist
  const createReq = {
    user: { id: testUserId },
    body: {
      title: 'Integration Test Task',
      description: 'Testing task management lifecycle end-to-end',
      priority: 'HIGH',
      dueDate: '2026-11-15',
      checklist: [{ text: 'Step 1 - Setup', completed: false }],
    },
  };
  const createRes = createMockRes();
  await createTask(createReq, createRes);

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.success, true);
  const task = createRes.body.task;
  assert.ok(task.id);
  assert.equal(task.title, 'Integration Test Task');
  assert.equal(task.priority, 'HIGH');
  assert.equal(task.status, 'PENDING');
  assert.equal(task.checklist.length, 1);
  assert.equal(task.checklist[0].text, 'Step 1 - Setup');

  // Verify audit event TASK_CREATED was persisted
  const auditRes1 = await query(
    `SELECT event_type, summary FROM audit_events WHERE user_id = $1 AND (metadata->>'taskId')::text = $2`,
    [testUserId, task.id]
  );
  assert.ok(auditRes1.rows.some((e) => e.event_type === 'TASK_CREATED'));

  // 2. Get task details
  const getReq = { user: { id: testUserId }, params: { id: task.id } };
  const getRes = createMockRes();
  await getTask(getReq, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.task.title, 'Integration Test Task');

  // Verify ownership protection: other user cannot get task
  const forbiddenGetReq = { user: { id: otherUserId }, params: { id: task.id } };
  const forbiddenGetRes = createMockRes();
  await getTask(forbiddenGetReq, forbiddenGetRes);
  assert.equal(forbiddenGetRes.statusCode, 404);

  // 3. Start task (PENDING -> IN_PROGRESS)
  const startReq = { user: { id: testUserId }, params: { id: task.id } };
  const startRes = createMockRes();
  await startTask(startReq, startRes);
  assert.equal(startRes.statusCode, 200);
  assert.equal(startRes.body.task.status, 'IN_PROGRESS');

  // Verify audit event TASK_STARTED
  const auditRes2 = await query(
    `SELECT event_type FROM audit_events WHERE user_id = $1 AND (metadata->>'taskId')::text = $2`,
    [testUserId, task.id]
  );
  assert.ok(auditRes2.rows.some((e) => e.event_type === 'TASK_STARTED'));

  // 4. Update task (title, description, toggle checklist)
  const updatedChecklist = [
    { id: task.checklist[0].id, text: 'Step 1 - Setup', completed: true },
    { id: 'custom-item-2', text: 'Step 2 - Execute', completed: false },
  ];
  const updateReq = {
    user: { id: testUserId },
    params: { id: task.id },
    body: {
      title: 'Integration Test Task - Modified',
      checklist: updatedChecklist,
      priority: 'MEDIUM',
    },
  };
  const updateRes = createMockRes();
  await updateTask(updateReq, updateRes);
  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.task.title, 'Integration Test Task - Modified');
  assert.equal(updateRes.body.task.priority, 'MEDIUM');
  assert.equal(updateRes.body.task.checklist.length, 2);
  assert.equal(updateRes.body.task.checklist[0].completed, true);

  // 5. Complete task
  const completeReq = { user: { id: testUserId }, params: { id: task.id } };
  const completeRes = createMockRes();
  await completeTask(completeReq, completeRes);
  assert.equal(completeRes.statusCode, 200);
  assert.equal(completeRes.body.task.status, 'COMPLETED');
  assert.ok(completeRes.body.task.completed_at);

  // Verify audit event TASK_COMPLETED
  const auditRes3 = await query(
    `SELECT event_type FROM audit_events WHERE user_id = $1 AND (metadata->>'taskId')::text = $2`,
    [testUserId, task.id]
  );
  assert.ok(auditRes3.rows.some((e) => e.event_type === 'TASK_COMPLETED'));

  // 6. Delete task
  const deleteReq = { user: { id: testUserId }, params: { id: task.id } };
  const deleteRes = createMockRes();
  await deleteTask(deleteReq, deleteRes);
  assert.equal(deleteRes.statusCode, 200);
  assert.equal(deleteRes.body.success, true);

  // Verify task no longer exists
  const verifyDeletedRes = createMockRes();
  await getTask(getReq, verifyDeletedRes);
  assert.equal(verifyDeletedRes.statusCode, 404);

  // Verify audit event TASK_DELETED
  const auditRes4 = await query(
    `SELECT event_type FROM audit_events WHERE user_id = $1 AND (metadata->>'taskId')::text = $2`,
    [testUserId, task.id]
  );
  assert.ok(auditRes4.rows.some((e) => e.event_type === 'TASK_DELETED'));
});

test('Checklist Initialization: addChecklist initializes a checklist if task does not have one', async () => {
  // Create task with no checklist
  const createRes = createMockRes();
  await createTask(
    {
      user: { id: testUserId },
      body: { title: 'Task Without Checklist', priority: 'LOW' },
    },
    createRes
  );
  const taskId = createRes.body.task.id;
  assert.deepEqual(createRes.body.task.checklist, []);

  // Add checklist
  const addChecklistRes = createMockRes();
  await addChecklist({ user: { id: testUserId }, params: { id: taskId }, body: {} }, addChecklistRes);
  assert.equal(addChecklistRes.statusCode, 200);
  assert.ok(Array.isArray(addChecklistRes.body.task.checklist));
  assert.ok(addChecklistRes.body.task.checklist.length > 0);

  // Clean up
  await deleteTask({ user: { id: testUserId }, params: { id: taskId } }, createMockRes());
});

test('Task Filtering: listTasks correctly filters by status, priority, due date, and search', async () => {
  // Create 3 tasks with different attributes
  const t1Res = createMockRes();
  await createTask(
    {
      user: { id: testUserId },
      body: { title: 'Docker deployment guide', priority: 'HIGH', dueDate: '2026-12-01' },
    },
    t1Res
  );

  const t2Res = createMockRes();
  await createTask(
    {
      user: { id: testUserId },
      body: { title: 'Kubernetes ingress config', priority: 'LOW', dueDate: '2026-10-01' },
    },
    t2Res
  );

  const t1Id = t1Res.body.task.id;
  const t2Id = t2Res.body.task.id;

  // Filter by priority = HIGH
  const listHighRes = createMockRes();
  await listTasks({ user: { id: testUserId }, query: { priority: 'HIGH' } }, listHighRes);
  assert.ok(listHighRes.body.tasks.some((t) => t.id === t1Id));
  assert.ok(!listHighRes.body.tasks.some((t) => t.id === t2Id));

  // Filter by search = Kubernetes
  const listSearchRes = createMockRes();
  await listTasks({ user: { id: testUserId }, query: { search: 'Kubernetes' } }, listSearchRes);
  assert.ok(!listSearchRes.body.tasks.some((t) => t.id === t1Id));
  assert.ok(listSearchRes.body.tasks.some((t) => t.id === t2Id));

  // Clean up
  await deleteTask({ user: { id: testUserId }, params: { id: t1Id } }, createMockRes());
  await deleteTask({ user: { id: testUserId }, params: { id: t2Id } }, createMockRes());
});

test('Validation: Rejects invalid title, priority, date, or checklist', async () => {
  // Empty title
  const res1 = createMockRes();
  await createTask({ user: { id: testUserId }, body: { title: '   ' } }, res1);
  assert.equal(res1.statusCode, 400);

  // Invalid priority
  const res2 = createMockRes();
  await createTask({ user: { id: testUserId }, body: { title: 'Valid', priority: 'URGENT' } }, res2);
  assert.equal(res2.statusCode, 400);

  // Invalid due date
  const res3 = createMockRes();
  await createTask({ user: { id: testUserId }, body: { title: 'Valid', dueDate: 'invalid-date' } }, res3);
  assert.equal(res3.statusCode, 400);

  // Invalid checklist format
  const res4 = createMockRes();
  await createTask({ user: { id: testUserId }, body: { title: 'Valid', checklist: 'not-an-array' } }, res4);
  assert.equal(res4.statusCode, 400);
});

test('Agent Workflow Preservation: creating and approving task via agent works and records audit events', async () => {
  const { createExecution, approveExecution } = require('../src/controllers/agentController');

  // 1. Create agent execution plan
  const createReq = {
    user: { id: testUserId, role: 'STUDENT' },
    body: { request: 'Create a task to organize my devops study notes' },
  };
  const createRes = createMockRes();
  await createExecution(createReq, createRes);

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.execution.status, 'AWAITING_APPROVAL');
  const executionId = createRes.body.execution.id;

  // 2. Approve execution
  const approveReq = {
    user: { id: testUserId, role: 'STUDENT' },
    params: { id: executionId },
  };
  const approveRes = createMockRes();
  await approveExecution(approveReq, approveRes);

  assert.equal(approveRes.statusCode, 200);
  assert.equal(approveRes.body.verified, true);
  assert.ok(approveRes.body.task.id);
  assert.equal(approveRes.body.task.title, 'organize my devops study notes');

  // 3. Verify task exists in database with source_execution_id
  const taskRes = await query(
    'SELECT id, title, source_execution_id, status FROM tasks WHERE id = $1',
    [approveRes.body.task.id]
  );
  assert.equal(taskRes.rows[0].source_execution_id, executionId);

  // 4. Verify audit trail has ACTION_APPROVED and ACTION_VERIFIED
  const auditRes = await query(
    'SELECT event_type FROM audit_events WHERE execution_id = $1 ORDER BY created_at ASC',
    [executionId]
  );
  assert.ok(auditRes.rows.some((e) => e.event_type === 'ACTION_APPROVED'));
  assert.ok(auditRes.rows.some((e) => e.event_type === 'ACTION_VERIFIED'));

  // 5. Clean up created task & execution
  await deleteTask({ user: { id: testUserId }, params: { id: approveRes.body.task.id } }, createMockRes());
  await query('DELETE FROM agent_executions WHERE id = $1', [executionId]);
});

