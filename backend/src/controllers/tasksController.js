const { randomUUID } = require('crypto');
const { query } = require('../db');

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function sanitizeChecklist(items) {
  if (!Array.isArray(items)) return null;
  return items.map((item, index) => ({
    id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : randomUUID(),
    text: typeof item?.text === 'string' ? item.text.trim().slice(0, 300) : `Item ${index + 1}`,
    completed: Boolean(item?.completed),
  }));
}

async function listTasks(req, res) {
  const { status, priority, due, search } = req.query || {};

  try {
    const conditions = ['user_id = $1'];
    const values = [req.user.id];
    let paramIndex = 2;

    if (status && status !== 'ALL') {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (priority && priority !== 'ALL') {
      conditions.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    if (due && due !== 'ALL') {
      if (due === 'OVERDUE') {
        conditions.push(`due_date < CURRENT_DATE AND status != 'COMPLETED'`);
      } else if (due === 'TODAY') {
        conditions.push(`due_date = CURRENT_DATE`);
      } else if (due === 'UPCOMING') {
        conditions.push(`due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days'`);
      } else if (due === 'NO_DUE_DATE') {
        conditions.push(`due_date IS NULL`);
      } else if (isValidDate(due)) {
        conditions.push(`due_date = $${paramIndex}`);
        values.push(due);
        paramIndex++;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const sql = `
      SELECT id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at
      FROM tasks
      WHERE ${whereClause}
      ORDER BY
        CASE status WHEN 'PENDING' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END,
        due_date ASC NULLS LAST,
        created_at DESC
    `;

    const result = await query(sql, values);
    return res.json({ success: true, tasks: result.rows });
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tasks' });
  }
}

async function getTask(req, res) {
  try {
    const result = await query(
      `SELECT id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at
       FROM tasks WHERE id::text = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    return res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve task' });
  }
}

async function createTask(req, res) {
  const { title, description, priority, dueDate, checklist } = req.body || {};

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
    return res.status(400).json({ success: false, message: 'Task title must contain 1 to 200 characters' });
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({ success: false, message: 'Task description must not exceed 2000 characters' });
  }
  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
    return res.status(400).json({ success: false, message: 'Priority must be LOW, MEDIUM, or HIGH' });
  }
  if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
    return res.status(400).json({ success: false, message: 'Due date must be a valid YYYY-MM-DD date' });
  }

  const sanitizedChecklist = checklist ? sanitizeChecklist(checklist) : [];
  if (checklist !== undefined && sanitizedChecklist === null) {
    return res.status(400).json({ success: false, message: 'Checklist must be an array of items' });
  }

  try {
    const result = await query(
      `INSERT INTO tasks (user_id, title, description, priority, due_date, checklist)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at`,
      [
        req.user.id,
        title.trim(),
        description ? description.trim() : '',
        priority || 'MEDIUM',
        dueDate || null,
        JSON.stringify(sanitizedChecklist || []),
      ]
    );

    const task = result.rows[0];

    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_CREATED', $2, $3::jsonb)`,
      [
        req.user.id,
        `You created task “${task.title}”`,
        JSON.stringify({ taskId: task.id, title: task.title, priority: task.priority }),
      ]
    );

    return res.status(201).json({ success: true, task });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create task' });
  }
}

async function updateTask(req, res) {
  const { title, description, priority, dueDate, status, checklist } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 200)) {
    return res.status(400).json({ success: false, message: 'Task title must contain 1 to 200 characters' });
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({ success: false, message: 'Task description must not exceed 2000 characters' });
  }
  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
    return res.status(400).json({ success: false, message: 'Priority must be LOW, MEDIUM, or HIGH' });
  }
  if (status !== undefined && !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be PENDING, IN_PROGRESS, or COMPLETED' });
  }
  if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
    return res.status(400).json({ success: false, message: 'Due date must be a valid YYYY-MM-DD date' });
  }

  let sanitizedChecklist = undefined;
  if (checklist !== undefined) {
    sanitizedChecklist = sanitizeChecklist(checklist);
    if (sanitizedChecklist === null) {
      return res.status(400).json({ success: false, message: 'Checklist must be an array of items' });
    }
  }

  try {
    const result = await query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority),
         due_date = CASE WHEN $4 THEN $5::date ELSE due_date END,
         status = COALESCE($6, status),
         checklist = CASE WHEN $7 THEN $8::jsonb ELSE checklist END,
         completed_at = CASE WHEN $6 = 'COMPLETED' THEN COALESCE(completed_at, NOW()) WHEN $6 IN ('PENDING', 'IN_PROGRESS') THEN NULL ELSE completed_at END,
         updated_at = NOW()
       WHERE id::text = $9 AND user_id = $10
       RETURNING id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        priority || null,
        dueDate !== undefined,
        dueDate ?? null,
        status || null,
        sanitizedChecklist !== undefined,
        sanitizedChecklist !== undefined ? JSON.stringify(sanitizedChecklist) : null,
        req.params.id,
        req.user.id,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    const task = result.rows[0];

    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_UPDATED', $2, $3::jsonb)`,
      [req.user.id, `You updated task “${task.title}”`, JSON.stringify({ taskId: task.id, title: task.title })]
    );

    return res.json({ success: true, task });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update task' });
  }
}

async function startTask(req, res) {
  try {
    const result = await query(
      `UPDATE tasks SET status = 'IN_PROGRESS', updated_at = NOW()
       WHERE id::text = $1 AND user_id = $2
       RETURNING id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at`,
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    const task = result.rows[0];

    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_STARTED', $2, $3::jsonb)`,
      [req.user.id, `You started task “${task.title}”`, JSON.stringify({ taskId: task.id })]
    );

    return res.json({ success: true, task });
  } catch (error) {
    console.error('Start task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start task' });
  }
}

async function completeTask(req, res) {
  try {
    const result = await query(
      `UPDATE tasks SET status = 'COMPLETED', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
       WHERE id::text = $1 AND user_id = $2
       RETURNING id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at`,
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    const task = result.rows[0];

    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_COMPLETED', $2, $3::jsonb)`,
      [req.user.id, `You completed task “${task.title}”`, JSON.stringify({ taskId: task.id })]
    );

    return res.json({ success: true, task });
  } catch (error) {
    console.error('Complete task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete task' });
  }
}

async function deleteTask(req, res) {
  try {
    const result = await query(
      `DELETE FROM tasks WHERE id::text = $1 AND user_id = $2
       RETURNING id, title`,
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    const deleted = result.rows[0];

    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_DELETED', $2, $3::jsonb)`,
      [req.user.id, `You deleted task “${deleted.title}”`, JSON.stringify({ taskId: deleted.id, title: deleted.title })]
    );

    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
}

async function addChecklist(req, res) {
  const { items } = req.body || {};
  let newChecklist = [];

  if (Array.isArray(items) && items.length > 0) {
    const sanitized = sanitizeChecklist(items);
    if (!sanitized) {
      return res.status(400).json({ success: false, message: 'Invalid checklist format' });
    }
    newChecklist = sanitized;
  } else {
    newChecklist = [
      { id: randomUUID(), text: 'First checklist item', completed: false },
    ];
  }

  try {
    const check = await query(
      `SELECT id, title, checklist FROM tasks WHERE id::text = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!check.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    const existing = check.rows[0];

    const currentChecklist = Array.isArray(existing.checklist) ? existing.checklist : [];
    // If checklist already exists and has items, keep existing and append or return existing
    const finalChecklist = currentChecklist.length > 0 ? currentChecklist : newChecklist;

    const result = await query(
      `UPDATE tasks SET checklist = $1, updated_at = NOW()
       WHERE id::text = $2 AND user_id = $3
       RETURNING id, title, description, priority, status, due_date, checklist, created_at, updated_at, completed_at`,
      [JSON.stringify(finalChecklist), req.params.id, req.user.id]
    );

    const task = result.rows[0];

    await query(
      `INSERT INTO audit_events (user_id, event_type, summary, metadata)
       VALUES ($1, 'TASK_CHECKLIST_ADDED', $2, $3::jsonb)`,
      [
        req.user.id,
        `You added a checklist to task “${task.title}”`,
        JSON.stringify({ taskId: task.id, itemCount: finalChecklist.length }),
      ]
    );

    return res.json({ success: true, task });
  } catch (error) {
    console.error('Add checklist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add checklist to task' });
  }
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  startTask,
  completeTask,
  deleteTask,
  addChecklist,
};