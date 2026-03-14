// routes/admin.routes.js - Admin panel routes
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/dashboard
 * Admin overview statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalScans,
      completedScans,
      totalVulnerabilities,
      recentUsers,
      recentScans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.scan.count(),
      prisma.scan.count({ where: { status: 'COMPLETED' } }),
      prisma.vulnerability.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true, plan: { select: { name: true } } },
      }),
      prisma.scan.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, url: true, riskScore: true, riskLevel: true, status: true, createdAt: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalScans,
          completedScans,
          totalVulnerabilities,
        },
        recentUsers,
        recentScans,
      },
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin data.' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          plan: { select: { name: true } },
          _count: { select: { scans: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (role, plan, etc.)
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { role, planId } = req.body;
    const data = {};
    if (role) data.role = role;
    if (planId) data.planId = planId;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ADMIN_UPDATE_USER',
        details: { targetId: req.params.id, changes: data },
        ip: req.ip,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Admin update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account.' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ADMIN_DELETE_USER',
        details: { targetId: req.params.id },
        ip: req.ip,
      },
    });

    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
});

/**
 * GET /api/admin/scans
 * Get all scans
 */
router.get('/scans', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { vulnerabilities: true } },
        },
      }),
      prisma.scan.count(),
    ]);

    res.json({
      success: true,
      data: {
        scans,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    logger.error('Admin get scans error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scans.' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    logger.error('Admin audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
