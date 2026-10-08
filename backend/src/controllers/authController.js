const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { generateToken } = require('../utils/jwt');

const ALLOWED_ROLES = ['STUDENT', 'PROFESSOR', 'PROFESSIONAL'];

async function register(req, res) {
  try {
    const { email, password, fullName, name, role } = req.body;

    const displayName = (fullName || name || '').trim();
    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required',
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required',
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Normalisation du rôle
    const normalizedRole = (role || 'STUDENT').toUpperCase().trim();
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    // Vérifier si l'email existe déjà
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Hachage du mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Insertion
    const insertRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, created_at`,
      [normalizedEmail, passwordHash, displayName, normalizedRole]
    );

    const user = insertRes.rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error',
      error: error.message,
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRes = await query(
      'SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error',
      error: error.message,
    });
  }
}

async function getMe(req, res) {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role,
      createdAt: req.user.created_at,
    },
  });
}

module.exports = {
  register,
  login,
  getMe,
};
