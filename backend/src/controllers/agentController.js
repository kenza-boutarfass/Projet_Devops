const { pool, query } = require('../db');
const { planTaskRequest } = require('../services/agentPlanner');
const { getTool } = require('../services/toolRegistry');

async function createExecution(req, res) {
  let plan;
  try {
    plan = planTaskRequest(req.body?.request, req.user.role);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const executionResult = await client.query(
      `INSERT INTO agent_executions (user_id, user_request, intent, plan, status)
       VALUES ($1, $2, $3, $4, 'AWAITING_APPROVAL')
       RETURNING id, user_request, intent, plan, status, created_at`,
      [req.user.id, req.body.request.trim(), plan.intent, JSON.stringify(plan)]
    );
    const execution = executionResult.rows[0];
    const step = plan.steps[0];

    await client.query(
      `INSERT INTO execution_steps (execution_id, step_index, tool_name, summary, input, requires_approval)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [execution.id, step.index, step.tool, step.summary, JSON.stringify(step.input), step.requiresApproval]
    );
    await client.query(
      'INSERT INTO approval_requests (execution_id, user_id) VALUES ($1, $2)',
      [execution.id, req.user.id]
    );
    await client.query(
      `INSERT INTO audit_events (user_id, execution_id, event_type, summary)
       VALUES ($1, $2, 'PLAN_CREATED', 'A task creation plan is awaiting your approval')`,
      [req.user.id, execution.id]
    );
    await client.query('COMMIT');
    return res.status(201).json({ success: true, execution });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create agent plan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create action plan' });
  } finally {
    client.release();
  }
}

async function listExecutions(req, res) {
  try {
    const result = await query(
      `SELECT id, user_request, intent, plan, status, tool_result, verification_result,
              error_message, created_at, updated_at, completed_at
       FROM agent_executions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json({ success: true, executions: result.rows });
  } catch (error) {
    console.error('List agent executions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity' });
  }
}

async function approveExecution(req, res) {
  const client = await pool.connect();
  let execution;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, plan, status FROM agent_executions
       WHERE id::text = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    execution = result.rows[0];
    if (!execution) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Action plan not found' });
    }
    if (execution.status !== 'AWAITING_APPROVAL') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This action is no longer awaiting approval' });
    }

    const step = execution.plan.steps?.[0];
    const tool = getTool(step?.tool);
    if (!tool || !tool.requiresApproval) throw new Error('Approved tool is not registered for execution');

    await client.query(
      `UPDATE agent_executions SET status = 'RUNNING', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    await client.query(
      `UPDATE approval_requests SET status = 'APPROVED', decided_at = NOW() WHERE execution_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    await client.query(
      `UPDATE execution_steps SET status = 'RUNNING', started_at = NOW() WHERE execution_id = $1 AND step_index = 0`,
      [req.params.id]
    );
    await client.query(
      `INSERT INTO audit_events (user_id, execution_id, event_type, summary)
       VALUES ($1, $2, 'ACTION_APPROVED', 'You approved task creation')`,
      [req.user.id, req.params.id]
    );

    const task = await tool.execute({
      client,
      userId: req.user.id,
      executionId: req.params.id,
      input: step.input,
    });
    await client.query(`UPDATE agent_executions SET status = 'VERIFYING', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    await client.query(`UPDATE execution_steps SET status = 'VERIFYING' WHERE execution_id = $1 AND step_index = 0`, [req.params.id]);
    const verification = await client.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [task.id, req.user.id]
    );
    if (!verification.rows[0]) throw new Error('Created task could not be verified');

    await client.query(
      `UPDATE execution_steps SET status = 'COMPLETED', output = $1, completed_at = NOW()
       WHERE execution_id = $2 AND step_index = 0`,
      [JSON.stringify({ taskId: task.id }), req.params.id]
    );
    await client.query(
      `UPDATE agent_executions SET status = 'COMPLETED', tool_result = $1, verification_result = $2,
       updated_at = NOW(), completed_at = NOW() WHERE id = $3`,
      [JSON.stringify({ taskId: task.id }), JSON.stringify({ verified: true, taskId: task.id }), req.params.id]
    );
    await client.query(
      `INSERT INTO audit_events (user_id, execution_id, event_type, summary)
       VALUES ($1, $2, 'ACTION_VERIFIED', 'Task creation completed and was verified in the database')`,
      [req.user.id, req.params.id]
    );
    await client.query('COMMIT');
    return res.json({ success: true, status: 'COMPLETED', verified: true, task });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Approve agent action error:', error);
    if (execution) {
      try {
        await query(
          `UPDATE agent_executions SET status = 'FAILED', error_message = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3 AND status = 'AWAITING_APPROVAL'`,
          [error.message, req.params.id, req.user.id]
        );
      } catch (recordError) {
        console.error('Could not record agent failure:', recordError);
      }
    }
    return res.status(500).json({ success: false, message: 'Action failed; no success was recorded' });
  } finally {
    client.release();
  }
}

async function rejectExecution(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, status FROM agent_executions WHERE id::text = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Action plan not found' });
    }
    if (result.rows[0].status !== 'AWAITING_APPROVAL') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This action can no longer be rejected' });
    }
    await client.query(
      `UPDATE agent_executions SET status = 'CANCELLED', updated_at = NOW(), completed_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    await client.query(
      `UPDATE approval_requests SET status = 'REJECTED', decided_at = NOW() WHERE execution_id = $1`,
      [req.params.id]
    );
    await client.query(
      `UPDATE execution_steps SET status = 'CANCELLED', completed_at = NOW() WHERE execution_id = $1`,
      [req.params.id]
    );
    await client.query(
      `INSERT INTO audit_events (user_id, execution_id, event_type, summary)
       VALUES ($1, $2, 'ACTION_REJECTED', 'You rejected the proposed task creation')`,
      [req.user.id, req.params.id]
    );
    await client.query('COMMIT');
    return res.json({ success: true, status: 'CANCELLED' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Reject agent action error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject action plan' });
  } finally {
    client.release();
  }
}

async function listActivity(req, res) {
  try {
    const result = await query(
      `SELECT id, execution_id, event_type, summary, created_at
       FROM audit_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    return res.json({ success: true, events: result.rows });
  } catch (error) {
    console.error('List agent activity error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity history' });
  }
}

module.exports = { createExecution, listExecutions, approveExecution, rejectExecution, listActivity };