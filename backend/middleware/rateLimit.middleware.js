// middleware/rateLimit.middleware.js - Rate limiting for CyberLens AI
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General rate limiter: 100 requests per 15 minutes
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Scan rate limiter: 5 requests per minute
 */
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many scan requests. Please wait before scanning again.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Scan rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Auth rate limiter: 10 requests per hour
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in an hour.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * API key rate limiter: 1000 requests per hour
 */
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: {
    success: false,
    error: 'API rate limit exceeded.',
  },
});

module.exports = {
  generalLimiter,
  scanLimiter,
  authLimiter,
  apiKeyLimiter,
};
