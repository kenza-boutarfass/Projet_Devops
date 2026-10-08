const { query } = require('../db');
const { buildDataContract } = require('../engine/contractBuilder');

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
      message: 'Forbidden: Only the project owner can generate or update data contracts.',
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

// Obtenir le contrat de données actuel du projet
async function getContract(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const result = await query(
      `SELECT c.*, d.name AS dataset_name 
       FROM data_contracts c
       LEFT JOIN datasets d ON c.dataset_id = d.id
       WHERE c.project_id = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [access.project.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        contract: null,
        message: 'No data contract has been compiled yet.',
      });
    }

    res.json({
      success: true,
      contract: result.rows[0],
    });
  } catch (err) {
    console.error('Error fetching data contract:', err);
    res.status(500).json({ success: false, message: 'Internal server error while fetching contract' });
  }
}

// Générer ou recompiler le contrat de données
async function generateContract(req, res) {
  try {
    const { projectId } = req.params;
    const { datasetId, version = 'v1.0.0' } = req.body;

    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    // Récupérer le dataset cible
    let datasetQuery = `SELECT * FROM datasets WHERE project_id = $1`;
    const datasetParams = [access.project.id];
    if (datasetId) {
      datasetParams.push(datasetId);
      datasetQuery += ` AND id = $2`;
    }
    datasetQuery += ` ORDER BY created_at DESC LIMIT 1`;

    const datasetRes = await query(datasetQuery, datasetParams);
    const dataset = datasetRes.rows[0] || null;

    // Récupérer les règles de qualité du projet (approuvées ou toutes si aucune n'est explicitement rejetée)
    const rulesRes = await query(
      `SELECT * FROM quality_rules 
       WHERE project_id = $1 AND status != 'REJECTED'
       ORDER BY column_name, rule_type`,
      [access.project.id]
    );

    const rules = rulesRes.rows;

    if (rules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active or approved quality rules found. Please discover and review rules before generating a contract.',
      });
    }

    // Compiler la spécification ODCS et le YAML
    const compiled = buildDataContract(access.project, dataset, rules, version);

    // Enregistrer le contrat dans la base de données
    const insertRes = await query(
      `INSERT INTO data_contracts (project_id, dataset_id, version, status, contract_spec, yaml_content)
       VALUES ($1, $2, $3, 'ACTIVE', $4, $5)
       RETURNING *`,
      [
        access.project.id,
        dataset ? dataset.id : null,
        version,
        JSON.stringify(compiled.contractSpec),
        compiled.yamlContent,
      ]
    );

    res.status(201).json({
      success: true,
      contract: insertRes.rows[0],
      stats: {
        assertionsCount: compiled.assertionsCount,
        approvedCount: compiled.approvedCount,
      },
      message: 'Data Contract successfully compiled and activated!',
    });
  } catch (err) {
    console.error('Error generating data contract:', err);
    res.status(500).json({ success: false, message: 'Internal server error while generating contract' });
  }
}

// Exporter le contrat au format YAML pur pour téléchargement
async function downloadYaml(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const result = await query(
      `SELECT * FROM data_contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [access.project.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    const contract = result.rows[0];
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${access.project.slug}-contract-${contract.version}.yaml"`);
    res.send(contract.yaml_content);
  } catch (err) {
    console.error('Error exporting YAML:', err);
    res.status(500).json({ success: false, message: 'Error exporting YAML' });
  }
}

module.exports = {
  getContract,
  generateContract,
  downloadYaml,
};
