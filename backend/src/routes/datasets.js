const express = require('express');
const multer = require('multer');
const {
  listDatasets,
  getDataset,
  ingestDataset,
  attachSample,
} = require('../controllers/datasetController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // limite 10MB
});

router.use(authenticate);

router.get('/:projectId/datasets', listDatasets);
router.get('/:projectId/datasets/:datasetId', getDataset);
router.post('/:projectId/datasets/upload', upload.single('file'), ingestDataset);
router.post('/:projectId/datasets/sample', attachSample);

module.exports = router;
