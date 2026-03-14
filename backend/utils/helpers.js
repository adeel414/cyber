// utils/helpers.js - Utility helper functions for CyberLens AI
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a secure random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a UUID
 */
const generateId = () => uuidv4();

/**
 * Sanitize a URL to prevent SSRF attacks
 */
const isPrivateIP = (hostname) => {
  const privateRanges = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,        // Link-local
    /^::1$/,              // IPv6 loopback
    /^fc00:/i,            // IPv6 private
    /^fe80:/i,            // IPv6 link-local
    /^0\./,               // Reserved
    /^metadata\.google\.internal$/i,
  ];
  return privateRanges.some((range) => range.test(hostname));
};

/**
 * Normalize and validate a URL
 */
const normalizeUrl = (url) => {
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);
    if (isPrivateIP(parsed.hostname)) {
      throw new Error('Private IP addresses are not allowed');
    }
    return parsed.href;
  } catch (err) {
    throw new Error(`Invalid URL: ${err.message}`);
  }
};

/**
 * Calculate risk level from score
 */
const getRiskLevel = (score) => {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
};

/**
 * Format file size
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 10) => {
  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (parsedPage - 1) * parsedLimit;
  return { skip, take: parsedLimit, page: parsedPage };
};

/**
 * Mask sensitive data
 */
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
};

/**
 * Sleep for n milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  generateToken,
  generateId,
  isPrivateIP,
  normalizeUrl,
  getRiskLevel,
  formatBytes,
  paginate,
  maskEmail,
  sleep,
  isValidEmail,
};
