const { query } = require('../db');
const { parseCSV, profileDataset } = require('../engine/profiler');

// Échantillons prêts à l'emploi pour démo immédiate
const BENCHMARK_SAMPLES = {
  customers: {
    name: 'customers_2025.csv',
    content: `customer_id,full_name,email,age,signup_date,country,is_active
1001,John Doe,john.doe@example.com,32,2024-01-15,USA,true
1002,Jane Smith,jane.smith@example.com,28,2024-02-10,Canada,true
1003,Bob Martin,,45,2024-03-01,France,false
1004,Alice Leroy,alice.leroy@domain.fr,23,2024-03-12,France,true
1005,Carlos Gomez,carlos@sample.es,39,2024-04-05,Spain,true
1006,David Miller,david.m@sample.com,,2024-04-20,USA,true
1007,Emma Wilson,emma@service.co.uk,31,2024-05-02,UK,false
1008,Liam Brown,liam.b@example.org,50,2024-05-18,Canada,true
1009,Sophie Dubois,sophie.d@orange.fr,27,2024-06-01,France,true
1010,Lucas Bernard,lucas@free.fr,34,2024-06-15,France,true`,
  },
  orders: {
    name: 'orders_stream.csv',
    content: `order_id,customer_id,amount,currency,status,created_at
ord_501,1001,149.99,EUR,COMPLETED,2025-01-10
ord_502,1002,89.50,EUR,COMPLETED,2025-01-11
ord_503,1003,0.00,EUR,CANCELLED,2025-01-12
ord_504,1004,230.10,USD,PENDING,2025-01-14
ord_505,1005,45.00,EUR,COMPLETED,2025-01-15
ord_506,1001,12.50,EUR,REFUNDED,2025-01-16
ord_507,1006,,USD,PENDING,2025-01-18
ord_508,1008,310.00,CAD,COMPLETED,2025-01-19`,
  },
};

// Vérifier les permissions de l'utilisateur sur le projet parent
async function checkProjectAccess(projectId, user, requireOwnership = false) {
  const res = await query(
    `SELECT p.*, u.role AS owner_role FROM projects p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id::text = $1 OR p.slug = $1`,
    [projectId]
  );

  if (res.rows.length === 0) return { errorStatus: 404, message: 'Project not found' };

  const project = res.rows[0];
  const isOwner = project.owner_id === user.id;
  const isSupervisingProf = user.role === 'PROFESSOR' && project.owner_role === 'STUDENT';

  if (requireOwnership && !isOwner) {
    return {
      errorStatus: 403,
      message: 'Forbidden: Only the project owner can add or modify datasets.',
    };
  }

  if (!isOwner && !isSupervisingProf) {
    return {
      errorStatus: 403,
      message: 'Forbidden: You do not have permission to view this project datasets.',
    };
  }

  return { project, isOwner, isSupervisingProf };
}

// Lister les datasets d'un projet
async function listDatasets(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const datasetsRes = await query(
      `SELECT id, project_id, name, file_format, row_count, column_count, 
              file_size_bytes, profile_summary->'qualityHealth' AS quality_health, created_at, updated_at
       FROM datasets
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [access.project.id]
    );

    return res.json({
      success: true,
      count: datasetsRes.rows.length,
      datasets: datasetsRes.rows,
    });
  } catch (error) {
    console.error('List datasets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list datasets', error: error.message });
  }
}

// Obtenir le profil complet d'un dataset
async function getDataset(req, res) {
  try {
    const { projectId, datasetId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const resDb = await query(
      'SELECT * FROM datasets WHERE id = $1 AND project_id = $2',
      [datasetId, access.project.id]
    );

    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dataset not found' });
    }

    return res.json({
      success: true,
      dataset: resDb.rows[0],
    });
  } catch (error) {
    console.error('Get dataset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dataset', error: error.message });
  }
}

// Ingestion et profilage d'un dataset (fichier ou texte CSV)
async function ingestDataset(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    let csvContent = '';
    let fileName = req.body.datasetName || 'dataset.csv';
    let fileSizeBytes = 0;

    if (req.file) {
      csvContent = req.file.buffer.toString('utf8');
      fileName = req.file.originalname || fileName;
      fileSizeBytes = req.file.size;
    } else if (req.body.csvContent) {
      csvContent = req.body.csvContent;
      fileSizeBytes = Buffer.byteLength(csvContent, 'utf8');
    } else {
      return res.status(400).json({
        success: false,
        message: 'No CSV file or csvContent provided for profiling',
      });
    }

    // Exécution du moteur de profilage déterministe
    const parsed = parseCSV(csvContent);
    if (parsed.headers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or could not be parsed',
      });
    }

    const profile = profileDataset(parsed);
    const rawPreview = parsed.rows.slice(0, 10);

    // Sauvegarde en base de données PostgreSQL
    const insertRes = await query(
      `INSERT INTO datasets (project_id, name, file_format, row_count, column_count, file_size_bytes, raw_preview, profile_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        access.project.id,
        fileName,
        'csv',
        profile.totalRows,
        profile.totalColumns,
        fileSizeBytes,
        JSON.stringify(rawPreview),
        JSON.stringify(profile),
      ]
    );

    // Mettre à jour le projet avec le nom du dataset et le score de qualité
    const newScore = profile.qualityHealth.overallScore;
    await query(
      `UPDATE projects
       SET dataset_name = $1, quality_score = $2, updated_at = NOW()
       WHERE id = $3`,
      [fileName, newScore, access.project.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Dataset uploaded and profiled successfully',
      dataset: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Ingest dataset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to profile dataset', error: error.message });
  }
}

// Attacher un dataset de benchmark pré-configuré (1-clic pour démonstration)
async function attachSample(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const sampleKey = req.body.sampleType || 'customers';
    const sample = BENCHMARK_SAMPLES[sampleKey] || BENCHMARK_SAMPLES.customers;

    const parsed = parseCSV(sample.content);
    const profile = profileDataset(parsed);
    const rawPreview = parsed.rows.slice(0, 10);
    const sizeBytes = Buffer.byteLength(sample.content, 'utf8');

    const insertRes = await query(
      `INSERT INTO datasets (project_id, name, file_format, row_count, column_count, file_size_bytes, raw_preview, profile_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        access.project.id,
        sample.name,
        'csv',
        profile.totalRows,
        profile.totalColumns,
        sizeBytes,
        JSON.stringify(rawPreview),
        JSON.stringify(profile),
      ]
    );

    await query(
      `UPDATE projects
       SET dataset_name = $1, quality_score = $2, updated_at = NOW()
       WHERE id = $3`,
      [sample.name, profile.qualityHealth.overallScore, access.project.id]
    );

    return res.status(201).json({
      success: true,
      message: `Sample dataset ${sample.name} attached and profiled successfully`,
      dataset: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Attach sample error:', error);
    return res.status(500).json({ success: false, message: 'Failed to attach sample dataset', error: error.message });
  }
}

module.exports = {
  listDatasets,
  getDataset,
  ingestDataset,
  attachSample,
};
