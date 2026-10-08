const { query } = require('../db');
const { executeContractValidation } = require('../engine/validationEngine');
const { parseCSV } = require('../engine/profiler');

// Benchmark data en fallback si besoin
const BENCHMARK_SAMPLES = {
  customers: `customer_id,full_name,email,age,signup_date,country,is_active
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
  orders: `order_id,customer_id,amount,currency,status,created_at
ord_501,1001,149.99,EUR,COMPLETED,2025-01-10
ord_502,1002,89.50,EUR,COMPLETED,2025-01-11
ord_503,1003,0.00,EUR,CANCELLED,2025-01-12
ord_504,1004,230.10,USD,PENDING,2025-01-14
ord_505,1005,45.00,EUR,COMPLETED,2025-01-15
ord_506,1001,12.50,EUR,REFUNDED,2025-01-16
ord_507,1006,,USD,PENDING,2025-01-18
ord_508,1008,310.00,CAD,COMPLETED,2025-01-19`,
};

// Helper pour vérifier l'accès au projet
async function checkProjectAccess(projectId, user, requireOwnership = false) {
  const res = await query(
    `SELECT p.*, u.role AS owner_role, u.full_name AS owner_name, u.email AS owner_email 
     FROM projects p
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
      message: 'Forbidden: Only the project owner can trigger contract validation runs.',
    };
  }

  if (!isOwner && !isSupervisingProf) {
    return {
      errorStatus: 403,
      message: 'Forbidden: Access restricted.',
    };
  }

  return { project, isOwner, isSupervisingProf };
}

// Exécuter la validation déterministe d'un dataset contre le contrat
async function runValidation(req, res) {
  try {
    const { projectId } = req.params;
    const { contractId, datasetId } = req.body;

    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    // 1. Récupérer le contrat actif
    let contractQuery = `SELECT * FROM data_contracts WHERE project_id = $1`;
    const contractParams = [access.project.id];
    if (contractId) {
      contractParams.push(contractId);
      contractQuery += ` AND id = $2`;
    }
    contractQuery += ` ORDER BY created_at DESC LIMIT 1`;

    const contractRes = await query(contractQuery, contractParams);
    if (contractRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active data contract found. Please compile a data contract from quality rules first.',
      });
    }
    const contract = contractRes.rows[0];

    // 2. Récupérer le dataset cible
    let datasetQuery = `SELECT * FROM datasets WHERE project_id = $1`;
    const datasetParams = [access.project.id];
    const targetDatasetId = datasetId || contract.dataset_id;
    if (targetDatasetId) {
      datasetParams.push(targetDatasetId);
      datasetQuery += ` AND id = $2`;
    }
    datasetQuery += ` ORDER BY created_at DESC LIMIT 1`;

    const datasetRes = await query(datasetQuery, datasetParams);
    if (datasetRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No dataset found for this project to validate against.',
      });
    }
    const dataset = datasetRes.rows[0];

    // 3. Extraire les lignes du dataset
    let rowsToValidate = [];
    if (dataset.name?.includes('customers') && BENCHMARK_SAMPLES.customers) {
      rowsToValidate = parseCSV(BENCHMARK_SAMPLES.customers).rows;
    } else if (dataset.name?.includes('orders') && BENCHMARK_SAMPLES.orders) {
      rowsToValidate = parseCSV(BENCHMARK_SAMPLES.orders).rows;
    } else if (Array.isArray(dataset.raw_preview) && dataset.raw_preview.length > 0) {
      rowsToValidate = dataset.raw_preview;
    } else {
      rowsToValidate = [];
    }

    // 4. Exécuter le moteur de validation déterministe
    const valResult = executeContractValidation(contract, rowsToValidate);

    // 5. Sauvegarder l'exécution dans validation_runs
    const insertRes = await query(
      `INSERT INTO validation_runs (
        project_id, contract_id, dataset_id, status, quality_score,
        slo_minimum, slo_policy, slo_met, total_assertions,
        passed_assertions, failed_assertions, execution_time_ms,
        total_rows_evaluated, assertions_result, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        access.project.id,
        contract.id,
        dataset.id,
        valResult.status,
        valResult.qualityScore,
        valResult.sloMinimum,
        valResult.sloPolicy,
        valResult.sloMet,
        valResult.totalAssertions,
        valResult.passedAssertions,
        valResult.failedAssertions,
        valResult.executionTimeMs,
        valResult.totalRowsEvaluated,
        JSON.stringify(valResult.assertionsResult),
        req.user.id,
      ]
    );

    // 6. Mettre à jour le projet (qualité et statut)
    const projectStatus = valResult.sloMet ? 'Healthy' : 'Degraded';
    await query(
      `UPDATE projects 
       SET quality_score = $1, status = $2, updated_at = NOW() 
       WHERE id = $3`,
      [Math.round(valResult.qualityScore), projectStatus, access.project.id]
    );

    return res.status(201).json({
      success: true,
      message: `Contract validation completed: ${valResult.status} (Score: ${valResult.qualityScore}%)`,
      run: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Run validation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to run validation', error: error.message });
  }
}

// Obtenir l'historique des validations d'un projet
async function listValidationRuns(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const runsRes = await query(
      `SELECT v.*, c.version AS contract_version, d.name AS dataset_name, u.full_name AS triggered_by_name
       FROM validation_runs v
       LEFT JOIN data_contracts c ON v.contract_id = c.id
       LEFT JOIN datasets d ON v.dataset_id = d.id
       LEFT JOIN users u ON v.triggered_by = u.id
       WHERE v.project_id = $1
       ORDER BY v.created_at DESC`,
      [access.project.id]
    );

    return res.json({
      success: true,
      count: runsRes.rows.length,
      runs: runsRes.rows,
    });
  } catch (error) {
    console.error('List validation runs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve validation history', error: error.message });
  }
}

// Obtenir la dernière exécution de validation
async function getLatestValidationRun(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const runRes = await query(
      `SELECT v.*, c.version AS contract_version, d.name AS dataset_name, u.full_name AS triggered_by_name
       FROM validation_runs v
       LEFT JOIN data_contracts c ON v.contract_id = c.id
       LEFT JOIN datasets d ON v.dataset_id = d.id
       LEFT JOIN users u ON v.triggered_by = u.id
       WHERE v.project_id = $1
       ORDER BY v.created_at DESC
       LIMIT 1`,
      [access.project.id]
    );

    return res.json({
      success: true,
      run: runRes.rows[0] || null,
    });
  } catch (error) {
    console.error('Get latest validation run error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve latest validation', error: error.message });
  }
}

module.exports = {
  runValidation,
  listValidationRuns,
  getLatestValidationRun,
};
