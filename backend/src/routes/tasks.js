const express = require('express');
const { listTasks, updateTask, completeTask } = require('../controllers/tasksController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.get('/', listTasks);
router.patch('/:id', updateTask);
router.post('/:id/complete', completeTask);

module.exports = router;