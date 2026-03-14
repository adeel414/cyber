// server.js - CyberLens AI Honeypot Decoy Server
// This is a fake server that mimics a vulnerable website to attract and log attackers.
// All traffic to this server is malicious — the real server is protected behind Nginx.

const http = require('http');
const { URL } = require('url');
const mongoose = require('mongoose');
const axios = require('axios');

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ─── MongoDB Schema ───────────────────────────────────────────────────────────

const attackLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  ip: { type: String, required: true },
  method: String,
  path: String,
  query: String,
  body: String,
  userAgent: String,
  headers: Object,
  attackType: {
    type: String,
    enum: ['SQLI', 'XSS', 'SSRF', 'PATH_TRAVERSAL', 'PORT_SCAN', 'UNKNOWN'],
    default: 'UNKNOWN',
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM',
  },
  isp: String,
  country: String,
  city: String,
  blocked: { type: Boolean, default: false },
});

const AttackLog = mongoose.model('AttackLog', attackLogSchema);

// Blocklist for IPs that should receive no response
const blockedIPs = new Set();

// ─── Attack Classification ────────────────────────────────────────────────────

/**
 * Classify the type of attack based on request characteristics
 */
function classifyAttack(method, path, query, body, headers) {
  const raw = `${path} ${query} ${body}`.toLowerCase();

  // SQL Injection patterns
  if (
    /('|"|;|--|\/\*|\*\/|union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*set|or\s+1=1|and\s+1=1|sleep\s*\()/i.test(raw)
  ) {
    return { type: 'SQLI', severity: 'CRITICAL' };
  }

  // XSS patterns
  if (
    /(<script|javascript:|on\w+\s*=|<iframe|<img[^>]+onerror|alert\s*\(|prompt\s*\(|confirm\s*\()/i.test(raw)
  ) {
    return { type: 'XSS', severity: 'HIGH' };
  }

  // Path Traversal
  if (/(\.\.\/|\.\.\\|%2e%2e%2f|%252e%252e%252f|\/etc\/passwd|\/etc\/shadow|\/windows\/system32)/i.test(raw)) {
    return { type: 'PATH_TRAVERSAL', severity: 'HIGH' };
  }

  // SSRF patterns
  if (/(127\.0\.0\.1|localhost|169\.254|10\.\d+\.\d+\.\d+|192\.168\.|file:\/\/|dict:\/\/|gopher:\/\/)/i.test(raw)) {
    return { type: 'SSRF', severity: 'HIGH' };
  }

  // Port scanning / automated probes
  if (
    path.includes('/admin') ||
    path.includes('/.env') ||
    path.includes('/wp-admin') ||
    path.includes('/.git') ||
    path.includes('/phpinfo') ||
    path.includes('/config') ||
    (headers['user-agent'] || '').match(/masscan|nmap|zgrab|shodan|censys|dirbuster|nikto/i)
  ) {
    return { type: 'PORT_SCAN', severity: 'MEDIUM' };
  }

  return { type: 'UNKNOWN', severity: 'LOW' };
}

/**
 * Generate a realistic-looking fake error response to deceive attackers
 */
function getFakeResponse(attackType, path) {
  const responses = {
    SQLI: {
      status: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: "You have an error in your SQL syntax near '1=1'",
        version: 'MySQL 5.7.32',
      }),
      contentType: 'application/json',
    },
    XSS: {
      status: 200,
      body: `<html><body>
        <p>Welcome back, <span id="user">guest</span></p>
        <script>console.log('session_id: abc123')</script>
      </body></html>`,
      contentType: 'text/html',
    },
    PATH_TRAVERSAL: {
      status: 403,
      body: 'Access denied.',
      contentType: 'text/plain',
    },
    SSRF: {
      status: 200,
      body: JSON.stringify({ internal: true, env: 'production', db: 'postgresql://internal:5432' }),
      contentType: 'application/json',
    },
    PORT_SCAN: {
      status: 200,
      body: JSON.stringify({ status: 'ok', version: '1.0.0', server: 'Apache/2.4.41' }),
      contentType: 'application/json',
    },
    UNKNOWN: {
      status: 200,
      body: JSON.stringify({ status: 'ok' }),
      contentType: 'application/json',
    },
  };

  return responses[attackType] || responses.UNKNOWN;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const clientIP =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  // Silently drop requests from blocked IPs
  if (blockedIPs.has(clientIP)) {
    res.socket.destroy();
    return;
  }

  // Parse URL
  const baseUrl = `http://${req.headers.host || 'localhost'}`;
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, baseUrl);
  } catch {
    parsedUrl = { pathname: req.url, search: '' };
  }

  const path = parsedUrl.pathname || '/';
  const query = parsedUrl.search || '';

  // Read request body
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
    if (body.length > 10000) body = body.substring(0, 10000); // limit
  });

  req.on('end', async () => {
    const { type: attackType, severity } = classifyAttack(
      req.method,
      path,
      query,
      body,
      req.headers
    );

    // Log the attack
    const logEntry = {
      ip: clientIP,
      method: req.method,
      path,
      query,
      body: body.substring(0, 1000),
      userAgent: req.headers['user-agent'] || '',
      headers: req.headers,
      attackType,
      severity,
    };

    // Save to MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await AttackLog.create(logEntry);

        // Notify backend via HTTP (non-blocking)
        axios
          .post(`${BACKEND_URL}/api/internal/honeypot-attack`, {
            ...logEntry,
            id: doc._id,
          })
          .catch(() => {}); // ignore errors - backend may be unavailable
      } catch (err) {
        console.error('Failed to log attack:', err.message);
      }
    }

    console.log(`[HONEYPOT] ${attackType} from ${clientIP} - ${req.method} ${path}`);

    // Send fake response
    const fakeResp = getFakeResponse(attackType, path);
    res.writeHead(fakeResp.status, {
      'Content-Type': fakeResp.contentType,
      'Server': 'Apache/2.4.41',
      'X-Powered-By': 'PHP/7.4.3',
    });
    res.end(fakeResp.body);
  });
});

// ─── Database Connection ──────────────────────────────────────────────────────

async function start() {
  if (MONGO_URL) {
    try {
      await mongoose.connect(MONGO_URL, {
        dbName: 'cyberlens_logs',
        authSource: 'admin',
      });
      console.log('[HONEYPOT] MongoDB connected');
    } catch (err) {
      console.error('[HONEYPOT] MongoDB connection failed:', err.message);
      console.warn('[HONEYPOT] Continuing without database logging');
    }
  } else {
    console.warn('[HONEYPOT] MONGO_URL not set — attacks will not be persisted');
  }

  server.listen(PORT, () => {
    console.log(`[HONEYPOT] Decoy server listening on port ${PORT}`);
    console.log('[HONEYPOT] All requests to this port are malicious');
  });
}

start();
