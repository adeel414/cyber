// routes/auth.routes.js - Authentication routes for CyberLens AI
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { generateToken } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Generate JWT access and refresh tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Email is already registered.',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate email verification token
      const verifyToken = generateToken(32);

      // Get free plan
      const freePlan = await prisma.plan.findFirst({ where: { name: 'FREE' } });

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          verifyToken,
          planId: freePlan?.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Create default alert preferences
      await prisma.alertPreference.create({
        data: { userId: user.id },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_SIGNUP',
          ip: req.ip,
          details: { email },
        },
      });

      // TODO: Send verification email
      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please verify your email.',
        data: {
          user,
          verifyToken: process.env.NODE_ENV === 'development' ? verifyToken : undefined,
        },
      });
    } catch (error) {
      logger.error('Signup error:', error);
      res.status(500).json({ success: false, error: 'Registration failed.' });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate a user and return JWT tokens
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: { plan: true },
      });

      if (!user || !user.password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        logger.warn(`Failed login attempt for: ${email}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Store refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          ip: req.ip,
          details: { email },
        },
      });

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            plan: user.plan,
          },
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Login failed.' });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid refresh token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { plan: true },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ success: false, error: 'Token refresh failed.' });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate the user's refresh token
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_LOGOUT',
        ip: req.ip,
      },
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

/**
 * GET /api/auth/verify-email/:token
 * Verify user email address
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null },
    });

    logger.info(`Email verified for: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ success: false, error: 'Email verification failed.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If your email is registered, you will receive a reset link.',
        });
      }

      const resetToken = generateToken(32);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verifyToken: resetToken,
          updatedAt: new Date(),
        },
      });

      // TODO: Send reset email
      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If your email is registered, you will receive a reset link.',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({ success: false, error: 'Password reset request failed.' });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset user's password using token
 */
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { token, password } = req.body;

      const user = await prisma.user.findFirst({
        where: { verifyToken: token },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token.',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          verifyToken: null,
          refreshToken: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          ip: req.ip,
        },
      });

      logger.info(`Password reset for: ${user.email}`);

      res.json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({ success: false, error: 'Password reset failed.' });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            scanLimit: true,
            teamLimit: true,
            hasAPI: true,
            hasDarkWeb: true,
            hasChatbot: true,
            hasMonitor: true,
          },
        },
      },
    });

    const currentMonthScans = await prisma.scan.count({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...user,
        currentMonthScans,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
});

module.exports = router;
