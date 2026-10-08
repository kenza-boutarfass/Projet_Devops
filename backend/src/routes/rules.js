const express = require('express');
const {
  listRules,
  discoverRules,
  updateRuleStatus,
  deleteRule,
} = require('../controllers/ruleController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/:projectId/rules', listRules);
router.post('/:projectId/rules/discover', discoverRules);
router.put('/:projectId/rules/:ruleId/status', updateRuleStatus);
router.delete('/:projectId/rules/:ruleId', deleteRule);

module.exports = router;
