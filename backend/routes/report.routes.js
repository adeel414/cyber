// routes/report.routes.js - Report generation and download
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/reports/:id
 * Get a specific report
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        scan: {
          include: {
            vulnerabilities: {
              orderBy: [{ severity: 'asc' }, { cvssScore: 'desc' }],
            },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    // Ownership check
    if (report.userId !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Increment download count
    await prisma.report.update({
      where: { id: report.id },
      data: { downloadCount: { increment: 1 } },
    });

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report.' });
  }
});

/**
 * GET /api/reports/share/:token
 * Access a shared report via share token (no auth required)
 */
router.get('/share/:token', async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { shareToken: req.params.token },
      include: {
        scan: {
          include: {
            vulnerabilities: {
              orderBy: [{ severity: 'asc' }],
            },
          },
        },
        user: { select: { name: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    await prisma.report.update({
      where: { id: report.id },
      data: { downloadCount: { increment: 1 } },
    });

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Shared report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report.' });
  }
});

/**
 * GET /api/reports
 * Get all reports for authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          scan: {
            select: {
              url: true,
              riskScore: true,
              riskLevel: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.report.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports.' });
  }
});

module.exports = router;
