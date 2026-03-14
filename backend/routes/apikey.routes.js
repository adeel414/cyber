// routes/apikey.routes.js - API key management
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireApiAccess } = require('../middleware/planCheck.middleware');
const { generateToken } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/apikeys
 * Get all API keys for user
 */
router.get('/', authenticate, requireApiAccess, async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsed: true,
        requestCount: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask keys for security (show only last 8 chars)
    const maskedKeys = keys.map((k) => ({
      ...k,
      key: `cl_****${k.key.slice(-8)}`,
    }));

    res.json({ success: true, data: maskedKeys });
  } catch (error) {
    logger.error('Get API keys error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API keys.' });
  }
});

/**
 * POST /api/apikeys
 * Create a new API key
 */
router.post(
  '/',
  authenticate,
  requireApiAccess,
  [body('name').trim().notEmpty().withMessage('Key name is required').isLength({ max: 100 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const keyCount = await prisma.apiKey.count({
        where: { userId: req.user.id, active: true },
      });

      if (keyCount >= 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 5 API keys allowed.',
        });
      }

      const key = `cl_${generateToken(32)}`;

      const apiKey = await prisma.apiKey.create({
        data: {
          userId: req.user.id,
          name: req.body.name,
          key,
        },
      });

      logger.info(`API key created for user: ${req.user.id}`);

      // Return full key only on creation
      res.status(201).json({
        success: true,
        message: 'Save this key — it will not be shown again.',
        data: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key,
          createdAt: apiKey.createdAt,
        },
      });
    } catch (error) {
      logger.error('Create API key error:', error);
      res.status(500).json({ success: false, error: 'Failed to create API key.' });
    }
  }
);

/**
 * DELETE /api/apikeys/:id
 * Revoke an API key
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });

    if (!key || key.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'API key not found.' });
    }

    await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { active: false },
    });

    res.json({ success: true, message: 'API key revoked.' });
  } catch (error) {
    logger.error('Revoke API key error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke API key.' });
  }
});

module.exports = router;
