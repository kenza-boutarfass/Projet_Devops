const { query } = require('../db');
const { discoverRulesForDataset } = require('../engine/ruleDiscovery');

// Helper pour vérifier l'accès au projet
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
      message: 'Forbidden: Only the project owner can propose or approve quality rules.',
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

// Lister les règles de qualité d'un projet
async function listRules(req, res) {
  try {
    const { projectId } = req.params;
    const { status, datasetId } = req.query;

    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    let sql = `SELECT * FROM quality_rules WHERE project_id = $1`;
    const params = [access.project.id];

    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND status = $${params.length}`;
    }

    if (datasetId) {
      params.push(datasetId);
      sql += ` AND dataset_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    // Calculer les compteurs par statut
    const countsRes = await query(
      `SELECT status, COUNT(*)::int AS count 
       FROM quality_rules 
       WHERE project_id = $1 
       GROUP BY status`,
      [access.project.id]
    );

    const counts = { PROPOSED: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 };
    countsRes.rows.forEach((r) => {
      counts[r.status] = r.count;
      counts.TOTAL += r.count;
    });

    return res.json({
      success: true,
      counts,
      isOwner: access.isOwner,
      isSupervisionView: access.isSupervisingProf,
      rules: result.rows,
    });
  } catch (error) {
    console.error('List rules error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve rules', error: error.message });
  }
}

// Découvrir automatiquement les règles via IA / heuristiques
async function discoverRules(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    // Trouver le dataset cible (passé en body ou le dernier importé)
    let dataset = null;
    if (req.body.datasetId) {
      const dsRes = await query('SELECT * FROM datasets WHERE id = $1 AND project_id = $2', [
        req.body.datasetId,
        access.project.id,
      ]);
      if (dsRes.rows.length > 0) dataset = dsRes.rows[0];
    }

    if (!dataset) {
      const latestDsRes = await query(
        'SELECT * FROM datasets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
        [access.project.id]
      );
      if (latestDsRes.rows.length > 0) dataset = latestDsRes.rows[0];
    }

    if (!dataset) {
      return res.status(400).json({
        success: false,
        message: 'No dataset found for this project. Please import a dataset before discovering rules.',
      });
    }

    // Générer les règles
    const candidateRules = await discoverRulesForDataset(dataset, {
      projectName: access.project.name,
      description: access.project.description,
    });

    // Sauvegarder dans PostgreSQL
    const insertedRules = [];
    for (const r of candidateRules) {
      const insertSql = `
        INSERT INTO quality_rules (project_id, dataset_id, column_name, rule_type, params, severity, description, rationale, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PROPOSED')
        RETURNING *
      `;
      const inserted = await query(insertSql, [
        access.project.id,
        dataset.id,
        r.column_name,
        r.rule_type,
        JSON.stringify(r.params || {}),
        r.severity,
        r.description,
        r.rationale,
      ]);
      insertedRules.push(inserted.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `AI discovered ${insertedRules.length} candidate rules for dataset "${dataset.name}"`,
      datasetName: dataset.name,
      rules: insertedRules,
    });
  } catch (error) {
    console.error('Discover rules error:', error);
    return res.status(500).json({ success: false, message: 'Rule discovery failed', error: error.message });
  }
}

// Revue humaine : Approuver ou rejeter une règle
async function updateRuleStatus(req, res) {
  try {
    const { projectId, ruleId } = req.params;
    const { status, severity, description } = req.body;

    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const validStatuses = ['PROPOSED', 'APPROVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updateSql = `
      UPDATE quality_rules
      SET status = $1,
          severity = COALESCE($2, severity),
          description = COALESCE($3, description),
          updated_at = NOW()
      WHERE id = $4 AND project_id = $5
      RETURNING *
    `;

    const result = await query(updateSql, [
      status.toUpperCase(),
      severity || null,
      description || null,
      ruleId,
      access.project.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    return res.json({
      success: true,
      message: `Rule status updated to ${status.toUpperCase()}`,
      rule: result.rows[0],
    });
  } catch (error) {
    console.error('Update rule status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update rule status', error: error.message });
  }
}

// Supprimer une règle
async function deleteRule(req, res) {
  try {
    const { projectId, ruleId } = req.params;
    const access = await checkProjectAccess(projectId, req.user, true);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const deleteSql = 'DELETE FROM quality_rules WHERE id = $1 AND project_id = $2 RETURNING id';
    const result = await query(deleteSql, [ruleId, access.project.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    return res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete rule', error: error.message });
  }
}

module.exports = {
  listRules,
  discoverRules,
  updateRuleStatus,
  deleteRule,
};
