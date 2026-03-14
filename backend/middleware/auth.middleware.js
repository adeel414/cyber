// middleware/auth.middleware.js - JWT authentication middleware
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Authenticate user via JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { plan: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.',
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before continuing.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required.',
    });
  }
  next();
};

/**
 * Optional authentication (does not fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { plan: true },
      });
      if (user) req.user = user;
    } catch {
      // Token invalid — continue without user
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Authenticate via API Key
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required.',
      });
    }

    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: { include: { plan: true } } },
    });

    if (!keyRecord || !keyRecord.active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key.',
      });
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: {
        lastUsed: new Date(),
        requestCount: { increment: 1 },
      },
    });

    req.user = keyRecord.user;
    req.apiKey = keyRecord;
    next();
  } catch (error) {
    logger.error('API key auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication error.' });
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
  authenticateApiKey,
};
