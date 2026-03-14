// routes/scan.routes.js - Scan routes for CyberLens AI
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { scanLimiter } = require('../middleware/rateLimit.middleware');
const { ssrfProtection } = require('../middleware/ssrfProtection.middleware');
const { checkScanLimit } = require('../middleware/planCheck.middleware');
const {
  runScan,
  calculateOWASPScore,
} = require('../services/scanner.service');
const { normalizeUrl, getRiskLevel } = require('../utils/helpers');
const logger = require('../utils/logger');
const axios = require('axios');

const prisma = new PrismaClient();

/**
 * POST /api/scans
 * Start a new security scan
 */
router.post(
  '/',
  scanLimiter,
  ssrfProtection,
  optionalAuth,
  [
    body('url')
      .trim()
      .notEmpty()
      .withMessage('URL is required')
      .isLength({ max: 2048 })
      .withMessage('URL too long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // If authenticated, check scan limits
      if (req.user) {
        const planCheckMiddleware = checkScanLimit;
        // Inline check for authenticated users
        const plan = req.user.plan;
        const scanLimit = plan?.scanLimit ?? 5;
        const scanCount = await prisma.scan.count({
          where: {
            userId: req.user.id,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        });

        if (scanLimit !== -1 && scanCount >= scanLimit) {
          return res.status(403).json({
            success: false,
            error: `Monthly scan limit reached (${scanCount}/${scanLimit}). Upgrade to continue.`,
            upgradeRequired: true,
          });
        }
      }

      let normalizedUrl;
      try {
        normalizedUrl = normalizeUrl(req.body.url);
      } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
      }

      const io = req.app.get('io');

      // Create scan record (PENDING status)
      const scan = await prisma.scan.create({
        data: {
          url: normalizedUrl,
          status: 'IN_PROGRESS',
          userId: req.user?.id || 'anonymous',
        },
      });

      // Return scan ID immediately so client can subscribe to Socket.io updates
      res.status(202).json({
        success: true,
        message: 'Scan started',
        data: { scanId: scan.id },
      });

      // Run scan asynchronously
      (async () => {
        try {
          const results = await runScan(normalizedUrl, scan.id, io);

          // Get AI risk score
          let riskScore = 50;
          let aiConfidence = 0;
          try {
            const aiResponse = await axios.post(
              `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/predict`,
              {
                ssl_valid: results.ssl?.hasSSL ? 1 : 0,
                has_csp: results.headers['content-security-policy']?.present ? 1 : 0,
                has_hsts: results.headers['strict-transport-security']?.present ? 1 : 0,
                has_xframe: results.headers['x-frame-options']?.present ? 1 : 0,
                has_xcontent: results.headers['x-content-type-options']?.present ? 1 : 0,
                sqli_found: results.sqliFound ? 1 : 0,
                xss_found: results.xssFound ? 1 : 0,
                csrf_found: results.csrfFound ? 1 : 0,
                vuln_count: results.vulnerabilities.length,
                critical_count: results.vulnerabilities.filter((v) => v.severity === 'CRITICAL').length,
              },
              { timeout: 10000 }
            );
            riskScore = aiResponse.data.risk_score;
            aiConfidence = aiResponse.data.confidence;
          } catch (aiErr) {
            logger.warn('AI service unavailable, using fallback scoring');
            // Fallback scoring
            riskScore = calculateFallbackScore(results);
          }

          const owaspScore = calculateOWASPScore(results.vulnerabilities);
          const riskLevel = getRiskLevel(riskScore);

          // Update scan with results
          const updatedScan = await prisma.scan.update({
            where: { id: scan.id },
            data: {
              status: 'COMPLETED',
              riskScore,
              riskLevel,
              ssl: results.ssl,
              sqliFound: results.sqliFound,
              xssFound: results.xssFound,
              csrfFound: results.csrfFound,
              headersJson: results.headers,
              owaspScore,
            },
          });

          // Save vulnerabilities
          if (results.vulnerabilities.length > 0) {
            await prisma.vulnerability.createMany({
              data: results.vulnerabilities.map((v) => ({
                scanId: scan.id,
                type: v.type,
                severity: v.severity,
                title: v.title,
                description: v.description,
                solution: v.solution,
                codeSnippet: v.codeSnippet || null,
                cvssScore: v.cvssScore || 0,
                owaspCategory: v.owaspCategory || null,
              })),
            });
          }

          // Create report
          const report = await prisma.report.create({
            data: {
              scanId: scan.id,
              userId: req.user?.id || 'anonymous',
            },
          });

          // Update scan with reportId
          await prisma.scan.update({
            where: { id: scan.id },
            data: { reportId: report.id },
          });

          // Emit completion event
          if (io) {
            io.to(`scan-${scan.id}`).emit('scan-complete', {
              scanId: scan.id,
              riskScore,
              riskLevel,
              vulnerabilityCount: results.vulnerabilities.length,
              reportId: report.id,
            });

            // Notify user
            if (req.user) {
              io.to(`user-${req.user.id}`).emit('scan-complete', {
                scanId: scan.id,
                url: normalizedUrl,
                riskScore,
                riskLevel,
              });
            }
          }

          logger.info(`Scan completed: ${scan.id}, risk: ${riskScore}, url: ${normalizedUrl}`);
        } catch (scanError) {
          logger.error(`Scan failed for ${scan.id}:`, scanError);

          await prisma.scan.update({
            where: { id: scan.id },
            data: { status: 'FAILED' },
          });

          if (io) {
            io.to(`scan-${scan.id}`).emit('scan-error', {
              scanId: scan.id,
              error: scanError.message,
            });
          }
        }
      })();
    } catch (error) {
      logger.error('Scan route error:', error);
      res.status(500).json({ success: false, error: 'Failed to start scan.' });
    }
  }
);

/**
 * Fallback risk score calculator
 */
const calculateFallbackScore = (results) => {
  let score = 0;

  // SSL (20 points)
  if (!results.ssl?.hasSSL) score += 20;

  // Critical vulnerabilities (15 points each, max 30)
  const criticalCount = results.vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
  score += Math.min(criticalCount * 15, 30);

  // High vulnerabilities (10 points each, max 20)
  const highCount = results.vulnerabilities.filter((v) => v.severity === 'HIGH').length;
  score += Math.min(highCount * 10, 20);

  // Medium vulnerabilities (5 points each, max 15)
  const mediumCount = results.vulnerabilities.filter((v) => v.severity === 'MEDIUM').length;
  score += Math.min(mediumCount * 5, 15);

  // Specific checks
  if (results.sqliFound) score += 15;
  if (results.xssFound) score += 10;
  if (results.csrfFound) score += 8;

  return Math.min(score, 100);
};

/**
 * GET /api/scans
 * Get scan history for authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, riskLevel } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          _count: { select: { vulnerabilities: true } },
          report: { select: { id: true, shareToken: true } },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        scans,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get scans error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scans.' });
  }
});

/**
 * GET /api/scans/:id
 * Get a specific scan with vulnerabilities
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: req.params.id },
      include: {
        vulnerabilities: {
          orderBy: [{ severity: 'asc' }, { cvssScore: 'desc' }],
        },
        report: {
          select: { id: true, shareToken: true, type: true, downloadCount: true },
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (!scan) {
      return res.status(404).json({ success: false, error: 'Scan not found.' });
    }

    // Ownership check - allow owner or if scan is completed (public access for sharing)
    if (req.user && scan.userId !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({ success: true, data: scan });
  } catch (error) {
    logger.error('Get scan error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scan.' });
  }
});

/**
 * DELETE /api/scans/:id
 * Delete a scan
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: req.params.id },
    });

    if (!scan) {
      return res.status(404).json({ success: false, error: 'Scan not found.' });
    }

    if (scan.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    await prisma.scan.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Scan deleted successfully.' });
  } catch (error) {
    logger.error('Delete scan error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete scan.' });
  }
});

/**
 * GET /api/scans/stats/overview
 * Get scan statistics overview for the user
 */
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalScans, criticalCount, highCount, avgRiskScore] = await Promise.all([
      prisma.scan.count({ where: { userId } }),
      prisma.vulnerability.count({
        where: { scan: { userId }, severity: 'CRITICAL' },
      }),
      prisma.vulnerability.count({
        where: { scan: { userId }, severity: 'HIGH' },
      }),
      prisma.scan.aggregate({
        where: { userId, status: 'COMPLETED' },
        _avg: { riskScore: true },
      }),
    ]);

    // Recent scan history for trend (last 7 scans)
    const recentScans = await prisma.scan.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: { riskScore: true, createdAt: true, url: true },
    });

    const currentMonthScans = await prisma.scan.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalScans,
        currentMonthScans,
        criticalVulnerabilities: criticalCount,
        highVulnerabilities: highCount,
        avgRiskScore: Math.round(avgRiskScore._avg.riskScore || 0),
        recentScans: recentScans.reverse(),
        scanLimit: req.user.plan?.scanLimit ?? 5,
      },
    });
  } catch (error) {
    logger.error('Stats overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics.' });
  }
});

module.exports = router;
