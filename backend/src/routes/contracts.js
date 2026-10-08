const express = require('express');
const {
  getContract,
  generateContract,
  downloadYaml,
} = require('../controllers/contractController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Récupérer le contrat actuel du projet
router.get('/:projectId/contract', getContract);

// Générer ou recompiler le contrat de données (Owner uniquement)
router.post('/:projectId/contract/generate', generateContract);

// Télécharger le fichier YAML brut
router.get('/:projectId/contract/export/yaml', downloadYaml);

module.exports = router;
