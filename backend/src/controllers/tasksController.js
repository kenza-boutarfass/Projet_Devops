const { query } = require('../db');

async function listTasks(req, res) {
  try {
    const result = await query(
      `SELECT id, title, description, priority, status, due_date, created_at, updated_at, completed_at
       FROM tasks WHERE user_id = $1 ORDER BY
       CASE status WHEN 'PENDING' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END,
       due_date ASC NULLS LAST, created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, tasks: result.rows });
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tasks' });
  }
}

async function updateTask(req, res) {
  const { title, description, priority, dueDate, status } = req.body || {};
  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 200)) {
    return res.status(400).json({ success: false, message: 'Task title must contain 1 to 200 characters' });
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({ success: false, message: 'Task description must not exceed 2000 characters' });
  }
  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
    return res.status(400).json({ success: false, message: 'Priority must be LOW, MEDIUM, or HIGH' });
  }
  if (status !== undefined && !['PENDING', 'IN_PROGRESS'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Use the complete action to finish a task' });
  }
  if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
    return res.status(400).json({ success: false, message: 'Due date must be a valid YYYY-MM-DD date' });
  }

  try {
    const result = await query(
      `UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description),
       priority = COALESCE($3, priority), due_date = CASE WHEN $4 THEN $5::date ELSE due_date END,
       status = COALESCE($6, status), updated_at = NOW()
       WHERE id::text = $7 AND user_id = $8
       RETURNING id, title, description, priority, status, due_date, created_at, updated_at, completed_at`,
      [title?.trim() || null, description ?? null, priority || null, dueDate !== undefined, dueDate ?? null, status || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    return res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update task' });
  }
}

async function completeTask(req, res) {
  try {
    const result = await query(
      `UPDATE tasks SET status = 'COMPLETED', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
       WHERE id::text = $1 AND user_id = $2
       RETURNING id, title, description, priority, status, due_date, created_at, updated_at, completed_at`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_COMPLETED', 'You completed a task', jsonb_build_object('taskId', $2))`,
      [req.user.id, result.rows[0].id]
    );
    return res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Complete task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete task' });
  }
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

module.exports = { listTasks, updateTask, completeTask };