const { verifyToken } = require('../utils/jwt');
const { query } = require('../db');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    // Vérifier si l'utilisateur existe toujours en base de données
    const userRes = await query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session: User no longer exists',
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
}

// Middleware RBAC (Role-Based Access Control)
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role(s): [${allowedRoles.join(', ')}], your role: '${req.user.role}'`,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRoles,
};
