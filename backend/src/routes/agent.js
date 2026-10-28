const express = require('express');
const {
  createExecution,
  listExecutions,
  approveExecution,
  rejectExecution,
  listActivity,
} = require('../controllers/agentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.get('/executions', listExecutions);
router.post('/executions', createExecution);
router.post('/executions/:id/approve', approveExecution);
router.post('/executions/:id/reject', rejectExecution);
router.get('/activity', listActivity);

module.exports = router;