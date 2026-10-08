const { query } = require('../db');
const { generateMarkdownReport, generateGitHubActionsSnippet } = require('../engine/reportGenerator');

// Helper pour vérifier l'accès au projet
async function checkProjectAccess(projectId, user) {
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

  if (!isOwner && !isSupervisingProf) {
    return {
      errorStatus: 403,
      message: 'Forbidden: Access restricted.',
    };
  }

  return { project, isOwner, isSupervisingProf };
}

// Obtenir le rapport de qualité consolidé
async function getQualityReport(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const { project } = access;

    // 1. Dataset
    const dsRes = await query(`SELECT * FROM datasets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const dataset = dsRes.rows[0] || null;

    // 2. Contrat actif
    const contractRes = await query(`SELECT * FROM data_contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const contract = contractRes.rows[0] || null;

    // 3. Dernière exécution de validation
    const valRes = await query(`SELECT * FROM validation_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const latestRun = valRes.rows[0] || null;

    // 4. Dernier avis ou feedback professeur
    const repRes = await query(
      `SELECT r.*, u.full_name AS reviewer_name 
       FROM quality_reports r
       LEFT JOIN users u ON r.reviewed_by = u.id
       WHERE r.project_id = $1
       ORDER BY r.created_at DESC LIMIT 1`,
      [project.id]
    );
    const existingReport = repRes.rows[0] || null;

    // 5. Synthèse des métriques du Quality Gate
    const score = latestRun ? Number(latestRun.quality_score) : (project.quality_score || 90);
    const sloMinimum = latestRun ? Number(latestRun.slo_minimum) : 90;
    const sloMet = latestRun ? latestRun.slo_met : score >= sloMinimum;
    const gateStatus = sloMet ? 'PASSED' : 'FAILED';

    const professorFeedback = existingReport ? existingReport.professor_feedback : null;
    const reviewerName = existingReport ? existingReport.reviewer_name : null;
    const reviewedAt = existingReport ? existingReport.reviewed_at : null;

    // 6. Génération des livrables
    const markdownReport = generateMarkdownReport(project, dataset, contract, latestRun, professorFeedback);
    const githubActionsSnippet = generateGitHubActionsSnippet(project);

    return res.json({
      success: true,
      report: {
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          environment: project.environment,
          ownerName: project.owner_name,
        },
        dataset: dataset ? { id: dataset.id, name: dataset.name, rows: dataset.row_count, columns: dataset.column_count } : null,
        contract: contract ? { id: contract.id, version: contract.version, assertionsCount: contract.contract_spec?.qualityRules?.length || 0 } : null,
        validation: latestRun ? {
          id: latestRun.id,
          status: latestRun.status,
          qualityScore: score,
          sloMinimum,
          sloMet,
          passedAssertions: latestRun.passed_assertions,
          failedAssertions: latestRun.failed_assertions,
          totalAssertions: latestRun.total_assertions,
          executionTimeMs: latestRun.execution_time_ms,
          evaluatedAt: latestRun.created_at,
          breachesCount: (latestRun.assertions_result || []).filter(a => a.status === 'FAILED').length,
        } : null,
        gate: {
          status: gateStatus,
          passed: sloMet,
          score,
          sloMinimum,
          policy: contract?.contract_spec?.serviceLevelObjectives?.policyOnBreach || 'BLOCK_PIPELINE',
          exitCode: sloMet ? 0 : 1,
        },
        supervision: {
          professorFeedback,
          reviewerName,
          reviewedAt,
        },
        markdownReport,
        githubActionsSnippet,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get quality report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate quality report', error: error.message });
  }
}

// Télécharger le rapport complet au format Markdown
async function downloadReportMarkdown(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const { project } = access;
    const dsRes = await query(`SELECT * FROM datasets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const contractRes = await query(`SELECT * FROM data_contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const valRes = await query(`SELECT * FROM validation_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const repRes = await query(`SELECT * FROM quality_reports WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);

    const md = generateMarkdownReport(project, dsRes.rows[0], contractRes.rows[0], valRes.rows[0], repRes.rows[0]?.professor_feedback);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${project.slug}-quality-report.md"`);
    res.send(md);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ success: false, message: 'Failed to download report', error: error.message });
  }
}

// Télécharger le payload JSON normalisé pour CI/CD
async function downloadReportJson(req, res) {
  try {
    const { projectId } = req.params;
    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    const { project } = access;
    const dsRes = await query(`SELECT * FROM datasets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const contractRes = await query(`SELECT * FROM data_contracts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const valRes = await query(`SELECT * FROM validation_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [project.id]);
    const latestRun = valRes.rows[0];

    const score = latestRun ? Number(latestRun.quality_score) : (project.quality_score || 90);
    const sloMin = latestRun ? Number(latestRun.slo_minimum) : 90;
    const sloMet = latestRun ? latestRun.slo_met : score >= sloMin;

    const payload = {
      project: project.slug,
      environment: project.environment,
      qualityScore: score,
      gateStatus: sloMet ? 'PASSED' : 'FAILED',
      exitCode: sloMet ? 0 : 1,
      sloMinimum: sloMin,
      totalAssertions: latestRun?.total_assertions || 0,
      passedAssertions: latestRun?.passed_assertions || 0,
      failedAssertions: latestRun?.failed_assertions || 0,
      assertions: latestRun?.assertions_result || [],
      evaluatedAt: latestRun?.created_at || new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${project.slug}-quality-gate.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('Download JSON error:', error);
    res.status(500).json({ success: false, message: 'Failed to export JSON', error: error.message });
  }
}

// Soumettre un retour d'évaluation par un professeur superviseur
async function submitProfessorFeedback(req, res) {
  try {
    const { projectId } = req.params;
    const { feedback } = req.body;

    if (req.user.role !== 'PROFESSOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only professors can submit supervision evaluation reviews.',
      });
    }

    const access = await checkProjectAccess(projectId, req.user);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.message });
    }

    if (access.project.owner_role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Supervision reviews can only be submitted for student projects.',
      });
    }

    const valRes = await query(`SELECT * FROM validation_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [access.project.id]);
    const latestRun = valRes.rows[0];

    const insertRes = await query(
      `INSERT INTO quality_reports (
        project_id, validation_run_id, contract_id, gate_status, quality_score,
        slo_minimum, slo_met, professor_feedback, reviewed_by, reviewed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        access.project.id,
        latestRun ? latestRun.id : null,
        latestRun ? latestRun.contract_id : null,
        latestRun ? latestRun.status : 'PASSED',
        latestRun ? latestRun.quality_score : 100,
        latestRun ? latestRun.slo_minimum : 90,
        latestRun ? latestRun.slo_met : true,
        feedback,
        req.user.id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Professor supervision review submitted successfully!',
      review: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review', error: error.message });
  }
}

module.exports = {
  getQualityReport,
  downloadReportMarkdown,
  downloadReportJson,
  submitProfessorFeedback,
};
