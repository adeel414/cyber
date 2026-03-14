// middleware/ssrfProtection.middleware.js - Prevent SSRF attacks
const { isPrivateIP } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Middleware to block SSRF attacks by rejecting requests to private IPs
 */
const ssrfProtection = (req, res, next) => {
  const urlParam = req.body.url || req.query.url;
  if (!urlParam) return next();

  try {
    let normalizedUrl = urlParam;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const parsed = new URL(normalizedUrl);

    if (isPrivateIP(parsed.hostname)) {
      logger.warn(`SSRF attempt blocked: ${parsed.hostname} from IP ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'Scanning private/internal IP addresses is not allowed.',
      });
    }

    // Block non-HTTP(S) schemes
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        error: 'Only HTTP and HTTPS URLs are allowed.',
      });
    }

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format.',
    });
  }
};

module.exports = { ssrfProtection };
