const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, role = 'employee' } = req.body;

    if (!username || !email || !password) {
      return next(new AppError('Please provide username, email, and password.', 400));
    }

    if (username.length < 3) {
      return next(new AppError('Username must be at least 3 characters long.', 400));
    }

    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long.', 400));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address.', 400));
    }

    // Check duplicate username or email
    const existing = await db.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [username.trim(), email.trim().toLowerCase()]
    );

    if (existing.rows && existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.username.toLowerCase() === username.trim().toLowerCase()) {
        return next(new AppError('Username is already taken.', 409));
      }
      return next(new AppError('Email is already registered.', 409));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const validRoles = ['admin', 'manager', 'employee'];
    const safeRole = validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'employee';

    const insertSql = `
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `;
    const insertResult = await db.query(insertSql, [
      username.trim(),
      email.trim().toLowerCase(),
      hashedPassword,
      safeRole,
    ]);

    const userId = insertResult.insertId;
    let newUser;
    if (userId) {
      const fetchUser = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [userId]);
      newUser = fetchUser.rows[0];
    } else {
      const fetchUser = await db.query('SELECT id, username, email, role, created_at FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      newUser = fetchUser.rows[0];
    }

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Log in an existing user
 */
const login = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return next(new AppError('Please provide username/email and password.', 400));
    }

    const cleanInput = usernameOrEmail.trim();
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [cleanInput, cleanInput]
    );

    if (!result.rows || result.rows.length === 0) {
      return next(new AppError('Invalid credentials.', 401));
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials.', 401));
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get profile of current authenticated user
 */
const getMe = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!result.rows || result.rows.length === 0) {
      return next(new AppError('User not found.', 404));
    }
    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
