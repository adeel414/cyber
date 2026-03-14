// routes/monitor.routes.js - Continuous monitoring routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMonitor } = require('../middleware/planCheck.middleware');
const { ssrfProtection } = require('../middleware/ssrfProtection.middleware');
const { normalizeUrl } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/monitor
 * Get all monitors for user
 */
router.get('/', authenticate, requireMonitor, async (req, res) => {
  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: monitors });
  } catch (error) {
    logger.error('Get monitors error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch monitors.' });
  }
});

/**
 * POST /api/monitor
 * Add a new URL to monitoring
 */
router.post(
  '/',
  authenticate,
  requireMonitor,
  ssrfProtection,
  [
    body('url').trim().notEmpty().withMessage('URL is required'),
    body('frequency')
      .isIn(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'])
      .withMessage('Invalid frequency'),
    body('alertThreshold')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Threshold must be 0-100'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      let normalizedUrl;
      try {
        normalizedUrl = normalizeUrl(req.body.url);
      } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
      }

      // Check monitor count based on plan
      const monitorCount = await prisma.monitor.count({
        where: { userId: req.user.id },
      });

      const maxMonitors = req.user.plan?.name === 'PRO' || req.user.plan?.name === 'ENTERPRISE'
        ? 20 : 5;

      if (monitorCount >= maxMonitors) {
        return res.status(403).json({
          success: false,
          error: `Monitor limit reached (${monitorCount}/${maxMonitors}).`,
        });
      }

      const { frequency, alertThreshold = 70 } = req.body;

      // Calculate next scan time
      const nextScan = calculateNextScan(frequency);

      const monitor = await prisma.monitor.create({
        data: {
          userId: req.user.id,
          url: normalizedUrl,
          frequency,
          alertThreshold,
          nextScan,
        },
      });

      res.status(201).json({ success: true, data: monitor });
    } catch (error) {
      logger.error('Create monitor error:', error);
      res.status(500).json({ success: false, error: 'Failed to create monitor.' });
    }
  }
);

/**
 * PATCH /api/monitor/:id
 * Update a monitor
 */
router.patch('/:id', authenticate, requireMonitor, async (req, res) => {
  try {
    const monitor = await prisma.monitor.findUnique({
      where: { id: req.params.id },
    });

    if (!monitor || monitor.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    const { active, frequency, alertThreshold } = req.body;
    const data = {};
    if (active !== undefined) data.active = active;
    if (frequency) {
      data.frequency = frequency;
      data.nextScan = calculateNextScan(frequency);
    }
    if (alertThreshold !== undefined) data.alertThreshold = alertThreshold;

    const updated = await prisma.monitor.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to update monitor.' });
  }
});

/**
 * DELETE /api/monitor/:id
 * Delete a monitor
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const monitor = await prisma.monitor.findUnique({
      where: { id: req.params.id },
    });

    if (!monitor || monitor.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    await prisma.monitor.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Monitor deleted.' });
  } catch (error) {
    logger.error('Delete monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete monitor.' });
  }
});

/**
 * Calculate next scan time based on frequency
 */
const calculateNextScan = (frequency) => {
  const now = new Date();
  switch (frequency) {
    case 'HOURLY':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'DAILY':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'MONTHLY':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
};

module.exports = router;
