const express = require('express');
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  startTask,
  completeTask,
  deleteTask,
  addChecklist,
} = require('../controllers/tasksController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', listTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/start', startTask);
router.post('/:id/complete', completeTask);
router.post('/:id/checklist', addChecklist);

module.exports = router;