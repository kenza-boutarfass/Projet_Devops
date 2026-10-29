const crypto = require('crypto');

const ROLE_LABELS = {
  STUDENT: 'academic',
  PROFESSOR: 'teaching and administrative',
  PROFESSIONAL: 'professional',
};

const PLAN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function sortObject(val) {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) {
    return val;
  }
  const sorted = {};
  for (const k of Object.keys(val).sort()) {
    sorted[k] = sortObject(val[k]);
  }
  return sorted;
}

function computePlanHash(steps, intent = 'CREATE_TASK') {
  const normalized = {
    intent,
    steps: (steps || []).map((step) => ({
      index: step.index,
      tool: step.tool,
      input: sortObject(step.input),
      requiresApproval: Boolean(step.requiresApproval),
    })),
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}


function planTaskRequest(request, role, options = {}) {
  if (typeof request !== 'string' || request.trim().length < 4 || request.trim().length > 1000) {
    throw new Error('Request must contain between 4 and 1000 characters');
  }

  const normalizedRequest = request.trim();
  const taskMatch = normalizedRequest.match(
    /^(?:please\s+)?(?:create|add|schedule|plan|track)\s+(?:a\s+)?(?:new\s+)?task(?:\s+to)?\s+(.+)$/i
  );
  const reminderMatch = normalizedRequest.match(/^(?:please\s+)?remind\s+me\s+to\s+(.+)$/i);
  const taskTitle = (taskMatch?.[1] || reminderMatch?.[1] || '').trim().replace(/[.!?]+$/, '').slice(0, 200);

  if (!taskTitle) {
    throw new Error('The demo planner can currently plan internal task creation. Start with “Create a task to…”');
  }

  const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : PLAN_TTL_MS;
  const now = options.now ? new Date(options.now) : new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  const steps = [{
    index: 0,
    tool: 'create_task',
    summary: `Create task: ${taskTitle}`,
    requiresApproval: true,
    input: { title: taskTitle, description: normalizedRequest, priority: 'MEDIUM' },
  }];

  const intent = 'CREATE_TASK';
  const planHash = computePlanHash(steps, intent);

  return {
    intent,
    interpretation: `Create one task in your ${ROLE_LABELS[role] || 'personal'} workspace.`,
    requiresApproval: true,
    planHash,
    expiresAt,
    steps,
  };
}

module.exports = { planTaskRequest, computePlanHash, PLAN_TTL_MS };