const ROLE_LABELS = {
  STUDENT: 'academic',
  PROFESSOR: 'teaching and administrative',
  PROFESSIONAL: 'professional',
};

function planTaskRequest(request, role) {
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

  return {
    intent: 'CREATE_TASK',
    interpretation: `Create one task in your ${ROLE_LABELS[role] || 'personal'} workspace.`,
    requiresApproval: true,
    steps: [{
      index: 0,
      tool: 'create_task',
      summary: `Create task: ${taskTitle}`,
      requiresApproval: true,
      input: { title: taskTitle, description: normalizedRequest, priority: 'MEDIUM' },
    }],
  };
}

module.exports = { planTaskRequest };