const express = require('express');
const {
  runValidation,
  listValidationRuns,
  getLatestValidationRun,
} = require('../controllers/validationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Obtenir la dernière exécution de validation
router.get('/:projectId/validation/latest', getLatestValidationRun);

// Obtenir l'historique complet des validations du projet
router.get('/:projectId/validation/runs', listValidationRuns);

// Déclencher une nouvelle validation contre le contrat (Owner uniquement)
router.post('/:projectId/validation/run', runValidation);

module.exports = router;
