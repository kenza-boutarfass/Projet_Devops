const express = require('express');
const {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes de projets nécessitent d'être connecté
router.use(authenticate);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
