const tools = {
  create_task: {
    purpose: 'Create a task in the authenticated user’s workspace.',
    permission: 'tasks:create',
    requiresApproval: true,
    async execute({ client, userId, executionId, input }) {
      if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200) {
        throw new Error('Task title must contain between 1 and 200 characters');
      }

      const result = await client.query(
        `INSERT INTO tasks (user_id, source_execution_id, title, description, priority)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_execution_id) DO NOTHING
         RETURNING id, title, description, priority, status, due_date, checklist, created_at`,
        [userId, executionId, input.title.trim(), input.description || '', input.priority || 'MEDIUM']
      );

      if (result.rows[0]) return result.rows[0];

      const existing = await client.query(
        `SELECT id, title, description, priority, status, due_date, checklist, created_at
         FROM tasks WHERE source_execution_id = $1 AND user_id = $2`,
        [executionId, userId]
      );
      if (!existing.rows[0]) throw new Error('Task creation could not be verified');
      return existing.rows[0];
    },
  },
};

function getTool(name) {
  return tools[name] || null;
}

module.exports = { getTool };