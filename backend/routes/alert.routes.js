// routes/alert.routes.js - Alert management routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/alerts
 * Get alerts for authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.read = false;

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          scan: { select: { url: true, riskScore: true } },
        },
      }),
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { userId: req.user.id, read: false } }),
    ]);

    res.json({
      success: true,
      data: {
        alerts,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts.' });
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Mark alert as read
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert || alert.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Alert not found.' });
    }

    await prisma.alert.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json({ success: true, message: 'Alert marked as read.' });
  } catch (error) {
    logger.error('Mark alert read error:', error);
    res.status(500).json({ success: false, error: 'Failed to update alert.' });
  }
});

/**
 * PATCH /api/alerts/read-all
 * Mark all alerts as read
 */
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.alert.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ success: true, message: 'All alerts marked as read.' });
  } catch (error) {
    logger.error('Mark all alerts read error:', error);
    res.status(500).json({ success: false, error: 'Failed to update alerts.' });
  }
});

/**
 * GET /api/alerts/preferences
 * Get alert preferences
 */
router.get('/preferences', authenticate, async (req, res) => {
  try {
    let prefs = await prisma.alertPreference.findUnique({
      where: { userId: req.user.id },
    });

    if (!prefs) {
      prefs = await prisma.alertPreference.create({
        data: { userId: req.user.id },
      });
    }

    res.json({ success: true, data: prefs });
  } catch (error) {
    logger.error('Get alert prefs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences.' });
  }
});

/**
 * PUT /api/alerts/preferences
 * Update alert preferences
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { email, whatsapp, sms, push, phone, onVuln, onRiskIncrease, onSSLExpiry, weeklyDigest, onAttack } = req.body;

    const prefs = await prisma.alertPreference.upsert({
      where: { userId: req.user.id },
      update: {
        email, whatsapp, sms, push, phone,
        onVuln, onRiskIncrease, onSSLExpiry, weeklyDigest, onAttack,
      },
      create: {
        userId: req.user.id,
        email, whatsapp, sms, push, phone,
        onVuln, onRiskIncrease, onSSLExpiry, weeklyDigest, onAttack,
      },
    });

    res.json({ success: true, data: prefs });
  } catch (error) {
    logger.error('Update alert prefs error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences.' });
  }
});

module.exports = router;
