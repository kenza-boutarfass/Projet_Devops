const test = require('node:test');
const assert = require('node:assert/strict');
const { planTaskRequest } = require('../src/services/agentPlanner');

test('plans task creation with explicit approval and registered tool input', () => {
  const plan = planTaskRequest('Create a task to review lecture notes', 'STUDENT');

  assert.equal(plan.intent, 'CREATE_TASK');
  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.steps[0].tool, 'create_task');
  assert.equal(plan.steps[0].input.title, 'review lecture notes');
});

test('rejects unsupported requests instead of inventing an executable action', () => {
  assert.throws(() => planTaskRequest('Summarize my unread emails', 'STUDENT'), /currently plan internal task creation/);
});

test('rejects malformed or oversized requests', () => {
  assert.throws(() => planTaskRequest('no', 'PROFESSIONAL'), /between 4 and 1000/);
  assert.throws(() => planTaskRequest(`Create a task to ${'x'.repeat(1000)}`, 'PROFESSIONAL'), /between 4 and 1000/);
});