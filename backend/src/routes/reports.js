const express = require('express');
const {
  getQualityReport,
  downloadReportMarkdown,
  downloadReportJson,
  submitProfessorFeedback,
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Obtenir le rapport de qualité consolidé
router.get('/:projectId/report', getQualityReport);

// Exporter le rapport au format Markdown (.md)
router.get('/:projectId/report/export/md', downloadReportMarkdown);

// Exporter le payload JSON pour CI/CD (.json)
router.get('/:projectId/report/export/json', downloadReportJson);

// Soumettre un retour d'évaluation par un professeur superviseur
router.post('/:projectId/report/feedback', submitProfessorFeedback);

module.exports = router;
