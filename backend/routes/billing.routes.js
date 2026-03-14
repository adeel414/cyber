// routes/billing.routes.js - Billing and subscription management
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/billing/plans
 * Get all available plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plans.' });
  }
});

/**
 * GET /api/billing/history
 * Get payment history for user
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { name: true, price: true } },
      },
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Get payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment history.' });
  }
});

/**
 * POST /api/billing/upgrade
 * Request plan upgrade (placeholder for payment integration)
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { planId, method } = req.body;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        planId,
        amount: plan.price,
        method: method || 'STRIPE',
        status: 'PENDING',
      },
    });

    // In production: redirect to payment gateway
    res.json({
      success: true,
      message: 'Payment initiated. Complete payment to activate plan.',
      data: {
        paymentId: payment.id,
        amount: plan.price,
        planName: plan.name,
      },
    });
  } catch (error) {
    logger.error('Upgrade error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate upgrade.' });
  }
});

module.exports = router;
