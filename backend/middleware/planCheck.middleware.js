// middleware/planCheck.middleware.js - Enforce plan-based permissions
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Check if user's plan allows API access
 */
const requireApiAccess = (req, res, next) => {
  if (!req.user?.plan?.hasAPI) {
    return res.status(403).json({
      success: false,
      error: 'API access requires Pro or Enterprise plan.',
      upgradeRequired: true,
    });
  }
  next();
};

/**
 * Check if user's plan allows dark web monitoring
 */
const requireDarkWeb = (req, res, next) => {
  if (!req.user?.plan?.hasDarkWeb) {
    return res.status(403).json({
      success: false,
      error: 'Dark web monitoring requires Pro or Enterprise plan.',
      upgradeRequired: true,
    });
  }
  next();
};

/**
 * Check if user's plan allows chatbot access
 */
const requireChatbot = (req, res, next) => {
  if (!req.user?.plan?.hasChatbot) {
    return res.status(403).json({
      success: false,
      error: 'AI Chatbot requires Starter or higher plan.',
      upgradeRequired: true,
    });
  }
  next();
};

/**
 * Check if user's plan allows monitoring
 */
const requireMonitor = (req, res, next) => {
  if (!req.user?.plan?.hasMonitor) {
    return res.status(403).json({
      success: false,
      error: 'Continuous monitoring requires Starter or higher plan.',
      upgradeRequired: true,
    });
  }
  next();
};

/**
 * Check scan limit for user's plan
 */
const checkScanLimit = async (req, res, next) => {
  try {
    const user = req.user;
    const plan = user.plan;

    if (!plan) {
      // Free plan defaults
      const scanCount = await prisma.scan.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });

      if (scanCount >= 5) {
        return res.status(403).json({
          success: false,
          error: 'Monthly scan limit reached (5/5). Upgrade to continue scanning.',
          upgradeRequired: true,
        });
      }
      return next();
    }

    // -1 means unlimited
    if (plan.scanLimit === -1) return next();

    const scanCount = await prisma.scan.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    if (scanCount >= plan.scanLimit) {
      return res.status(403).json({
        success: false,
        error: `Monthly scan limit reached (${plan.scanLimit}/${plan.scanLimit}). Upgrade to continue scanning.`,
        upgradeRequired: true,
        currentUsage: scanCount,
        limit: plan.scanLimit,
      });
    }

    req.scanCount = scanCount;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireApiAccess,
  requireDarkWeb,
  requireChatbot,
  requireMonitor,
  checkScanLimit,
};
