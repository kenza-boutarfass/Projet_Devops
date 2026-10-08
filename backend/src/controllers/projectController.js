const { query } = require('../db');

// Liste des projets selon le rôle (RBAC)
async function listProjects(req, res) {
  try {
    const user = req.user;
    let sqlQuery = '';
    let params = [];

    if (user.role === 'PROFESSOR') {
      // Les professeurs voient tous les projets des étudiants (supervision) + leurs propres projets
      sqlQuery = `
        SELECT p.id, p.name, p.slug, p.description, p.environment, 
               p.dataset_name, p.status, p.quality_score, p.created_at, p.updated_at,
               u.id AS owner_id, u.full_name AS owner_name, u.role AS owner_role, u.email AS owner_email
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE u.role = 'STUDENT' OR p.owner_id = $1
        ORDER BY p.updated_at DESC
      `;
      params = [user.id];
    } else {
      // Étudiants et Professionnels voient uniquement leurs propres projets
      sqlQuery = `
        SELECT p.id, p.name, p.slug, p.description, p.environment, 
               p.dataset_name, p.status, p.quality_score, p.created_at, p.updated_at,
               u.id AS owner_id, u.full_name AS owner_name, u.role AS owner_role, u.email AS owner_email
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.owner_id = $1
        ORDER BY p.updated_at DESC
      `;
      params = [user.id];
    }

    const result = await query(sqlQuery, params);

    return res.json({
      success: true,
      count: result.rows.length,
      userRole: user.role,
      projects: result.rows,
    });
  } catch (error) {
    console.error('List projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects',
      error: error.message,
    });
  }
}

// Obtenir le détail d'un projet avec vérification de permissions (RBAC)
async function getProject(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const findQuery = `
      SELECT p.id, p.name, p.slug, p.description, p.environment, 
             p.dataset_name, p.status, p.quality_score, p.created_at, p.updated_at,
             u.id AS owner_id, u.full_name AS owner_name, u.role AS owner_role, u.email AS owner_email
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id::text = $1 OR p.slug = $1
    `;
    const result = await query(findQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = result.rows[0];

    // Vérification des droits d'accès
    const isOwner = project.owner_id === user.id;
    const isProfSupervisingStudent = user.role === 'PROFESSOR' && project.owner_role === 'STUDENT';

    if (!isOwner && !isProfSupervisingStudent) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this project',
      });
    }

    return res.json({
      success: true,
      isOwner,
      isSupervisionView: isProfSupervisingStudent && !isOwner,
      project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve project details',
      error: error.message,
    });
  }
}

// Créer un nouveau projet
async function createProject(req, res) {
  try {
    const user = req.user;
    const { name, description, environment, datasetName } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Project name must be at least 3 characters long',
      });
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const insertQuery = `
      INSERT INTO projects (name, slug, description, environment, dataset_name, quality_score, status, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      trimmedName,
      slug,
      (description || '').trim(),
      environment || 'Development',
      datasetName || 'Not connected',
      90, // score initial
      'Healthy',
      user.id,
    ];

    const result = await query(insertQuery, values);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        ...result.rows[0],
        owner_name: user.full_name,
        owner_role: user.role,
      },
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message,
    });
  }
}

// Modifier un projet (seul le propriétaire peut modifier)
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { name, description, environment, datasetName, status, qualityScore } = req.body;

    const findQuery = 'SELECT id, owner_id FROM projects WHERE id::text = $1 OR slug = $1';
    const checkRes = await query(findQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const existing = checkRes.rows[0];

    // Seul le propriétaire peut modifier son projet
    if (existing.owner_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the project owner can modify this project. Supervisors have read-only access.',
      });
    }

    const updateQuery = `
      UPDATE projects
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          environment = COALESCE($3, environment),
          dataset_name = COALESCE($4, dataset_name),
          status = COALESCE($5, status),
          quality_score = COALESCE($6, quality_score),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await query(updateQuery, [
      name ? name.trim() : null,
      description !== undefined ? description.trim() : null,
      environment || null,
      datasetName || null,
      status || null,
      qualityScore !== undefined ? Number(qualityScore) : null,
      existing.id,
    ]);

    return res.json({
      success: true,
      message: 'Project updated successfully',
      project: result.rows[0],
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message,
    });
  }
}

// Supprimer un projet (seul le propriétaire peut supprimer)
async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const findQuery = 'SELECT id, owner_id FROM projects WHERE id::text = $1 OR slug = $1';
    const checkRes = await query(findQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const existing = checkRes.rows[0];

    if (existing.owner_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the project owner can delete this project.',
      });
    }

    await query('DELETE FROM projects WHERE id = $1', [existing.id]);

    return res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message,
    });
  }
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};
