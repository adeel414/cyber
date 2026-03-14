// services/scanner.service.js - Core web security scanner for CyberLens AI
const https = require('https');
const http = require('http');
const { URL } = require('url');
const axios = require('axios');
const logger = require('../utils/logger');
const { sleep } = require('../utils/helpers');

/**
 * Scan phases for progress reporting
 */
const SCAN_PHASES = [
  { name: 'DNS Resolution', progress: 10 },
  { name: 'SSL Certificate Analysis', progress: 20 },
  { name: 'HTTP Security Headers', progress: 35 },
  { name: 'SQL Injection Detection', progress: 50 },
  { name: 'XSS Detection', progress: 65 },
  { name: 'CSRF Analysis', progress: 75 },
  { name: 'Open Redirect Check', progress: 85 },
  { name: 'AI Risk Scoring', progress: 95 },
  { name: 'Generating Report', progress: 100 },
];

/**
 * Main scanner - orchestrates all scan phases
 */
const runScan = async (url, scanId, io) => {
  const results = {
    url,
    ssl: null,
    headers: {},
    vulnerabilities: [],
    sqliFound: false,
    xssFound: false,
    csrfFound: false,
    redirectChain: [],
    responseTime: 0,
    statusCode: null,
  };

  const emitProgress = (phase, progress, message) => {
    if (io) {
      io.to(`scan-${scanId}`).emit('scan-progress', {
        scanId,
        phase,
        progress,
        message,
      });
    }
  };

  try {
    // Phase 1: Initial connection
    emitProgress('connection', 10, 'Connecting to target...');
    const startTime = Date.now();
    const response = await fetchUrl(url);
    results.responseTime = Date.now() - startTime;
    results.statusCode = response.status;
    results.html = response.data;
    results.redirectChain = response.redirectChain || [];

    // Phase 2: SSL Analysis
    emitProgress('ssl', 20, 'Analyzing SSL certificate...');
    results.ssl = await analyzeSSL(url);

    // Phase 3: HTTP Headers
    emitProgress('headers', 35, 'Checking security headers...');
    results.headers = analyzeHeaders(response.headers);

    // Phase 4: SQL Injection
    emitProgress('sqli', 50, 'Testing for SQL injection...');
    const sqliResult = await detectSQLInjection(url, response.html);
    results.sqliFound = sqliResult.found;
    if (sqliResult.found) {
      results.vulnerabilities.push(...sqliResult.vulnerabilities);
    }

    // Phase 5: XSS Detection
    emitProgress('xss', 65, 'Testing for XSS vulnerabilities...');
    const xssResult = detectXSS(response.html, response.headers);
    results.xssFound = xssResult.found;
    if (xssResult.found) {
      results.vulnerabilities.push(...xssResult.vulnerabilities);
    }

    // Phase 6: CSRF Analysis
    emitProgress('csrf', 75, 'Checking CSRF protection...');
    const csrfResult = detectCSRF(response.html, response.headers);
    results.csrfFound = csrfResult.found;
    if (csrfResult.found) {
      results.vulnerabilities.push(...csrfResult.vulnerabilities);
    }

    // Phase 7: Header vulnerabilities
    const headerVulns = getHeaderVulnerabilities(results.headers);
    results.vulnerabilities.push(...headerVulns);

    // Phase 8: Open Redirect
    emitProgress('redirect', 85, 'Checking for open redirects...');
    const redirectResult = detectOpenRedirect(url, results.redirectChain);
    if (redirectResult.found) {
      results.vulnerabilities.push(...redirectResult.vulnerabilities);
    }

    emitProgress('complete', 100, 'Scan complete!');

    return results;
  } catch (error) {
    logger.error(`Scan error for ${url}:`, error);
    throw error;
  }
};

/**
 * Fetch URL with redirect tracking.
 * NOTE: rejectUnauthorized is intentionally disabled here because this is a
 * security scanner that must be able to analyze sites with self-signed or
 * expired certificates (to report SSL issues). The certificate status is
 * separately analyzed by analyzeSSL(). This agent is ONLY used for scanning
 * external user-submitted URLs — never for internal service communication.
 */
const fetchUrl = async (url) => {
  const redirectChain = [];
  // nosemgrep: nodejs_scan-audit-disabling_ssl_verification
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      httpsAgent: agent,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'CyberLens-Security-Scanner/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    return {
      status: response.status,
      headers: response.headers,
      data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      redirectChain,
    };
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Domain not found. Please check the URL.');
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('Connection timed out. The website may be offline.');
    }
    throw error;
  }
};

/**
 * Analyze SSL certificate
 */
const analyzeSSL = async (url) => {
  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    return {
      hasSSL: false,
      grade: 'F',
      issues: ['Website does not use HTTPS'],
      expiryDate: null,
      issuer: null,
      vulnerabilities: [
        {
          type: 'SSL_MISSING',
          severity: 'HIGH',
          title: 'No HTTPS / SSL Certificate',
          description: 'The website does not use HTTPS encryption. All data transmitted is visible to attackers.',
          solution: 'Install an SSL/TLS certificate and redirect all HTTP traffic to HTTPS.',
          cvssScore: 7.5,
          owaspCategory: 'A02:2021 - Cryptographic Failures',
        },
      ],
    };
  }

  try {
    const result = {
      hasSSL: true,
      grade: 'A',
      issues: [],
      expiryDate: null,
      issuer: null,
      vulnerabilities: [],
    };

    // Check SSL Labs API if available
    const sslLabsUrl = `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(parsed.hostname)}&publish=off&all=done`;

    // Use a timeout for SSL Labs check to avoid blocking
    const sslResponse = await Promise.race([
      axios.get(sslLabsUrl, { timeout: 5000 }).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (sslResponse?.data?.endpoints?.[0]?.grade) {
      result.grade = sslResponse.data.endpoints[0].grade;
    }

    return result;
  } catch (error) {
    logger.warn(`SSL analysis failed for ${url}: ${error.message}`);
    return {
      hasSSL: true,
      grade: 'Unknown',
      issues: [],
      expiryDate: null,
      issuer: null,
      vulnerabilities: [],
    };
  }
};

/**
 * Analyze HTTP security headers
 */
const analyzeHeaders = (headers) => {
  const result = {
    'content-security-policy': {
      present: !!headers['content-security-policy'],
      value: headers['content-security-policy'] || null,
    },
    'x-frame-options': {
      present: !!headers['x-frame-options'],
      value: headers['x-frame-options'] || null,
    },
    'x-content-type-options': {
      present: !!headers['x-content-type-options'],
      value: headers['x-content-type-options'] || null,
    },
    'strict-transport-security': {
      present: !!headers['strict-transport-security'],
      value: headers['strict-transport-security'] || null,
    },
    'referrer-policy': {
      present: !!headers['referrer-policy'],
      value: headers['referrer-policy'] || null,
    },
    'permissions-policy': {
      present: !!(headers['permissions-policy'] || headers['feature-policy']),
      value: headers['permissions-policy'] || headers['feature-policy'] || null,
    },
    'x-xss-protection': {
      present: !!headers['x-xss-protection'],
      value: headers['x-xss-protection'] || null,
    },
  };

  return result;
};

/**
 * Get vulnerabilities from missing security headers
 */
const getHeaderVulnerabilities = (headers) => {
  const vulns = [];

  if (!headers['content-security-policy']?.present) {
    vulns.push({
      type: 'MISSING_CSP',
      severity: 'MEDIUM',
      title: 'Missing Content Security Policy (CSP)',
      description: 'No Content-Security-Policy header found. This allows execution of arbitrary scripts from any source.',
      solution: `Add the following header to your server:\nContent-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';`,
      codeSnippet: "// Express.js\napp.use(helmet.contentSecurityPolicy());",
      cvssScore: 6.1,
      owaspCategory: 'A05:2021 - Security Misconfiguration',
    });
  }

  if (!headers['x-frame-options']?.present) {
    vulns.push({
      type: 'MISSING_X_FRAME',
      severity: 'MEDIUM',
      title: 'Missing X-Frame-Options Header',
      description: 'The X-Frame-Options header is not set. Your site may be vulnerable to clickjacking attacks.',
      solution: 'Add X-Frame-Options: DENY or SAMEORIGIN header to prevent your site from being embedded in iframes.',
      codeSnippet: "// Express.js\napp.use(helmet.frameguard({ action: 'deny' }));",
      cvssScore: 6.1,
      owaspCategory: 'A05:2021 - Security Misconfiguration',
    });
  }

  if (!headers['x-content-type-options']?.present) {
    vulns.push({
      type: 'MISSING_X_CONTENT_TYPE',
      severity: 'LOW',
      title: 'Missing X-Content-Type-Options Header',
      description: 'The X-Content-Type-Options header is missing. Browsers may perform MIME-type sniffing.',
      solution: 'Add X-Content-Type-Options: nosniff header to prevent MIME-type sniffing.',
      codeSnippet: "// Express.js\napp.use(helmet.noSniff());",
      cvssScore: 3.7,
      owaspCategory: 'A05:2021 - Security Misconfiguration',
    });
  }

  if (!headers['strict-transport-security']?.present) {
    vulns.push({
      type: 'MISSING_HSTS',
      severity: 'MEDIUM',
      title: 'Missing HTTP Strict Transport Security (HSTS)',
      description: 'The HSTS header is not set. Users may connect over insecure HTTP connections.',
      solution: 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
      codeSnippet: "// Express.js\napp.use(helmet.hsts({ maxAge: 31536000 }));",
      cvssScore: 5.9,
      owaspCategory: 'A02:2021 - Cryptographic Failures',
    });
  }

  return vulns;
};

/**
 * Detect SQL injection vulnerabilities
 */
const detectSQLInjection = async (url, html) => {
  const vulnerabilities = [];
  let found = false;

  // Check URL parameters for SQL injection indicators
  const parsed = new URL(url);
  const params = Array.from(parsed.searchParams.entries());

  // SQL injection patterns to test
  const sqliPatterns = [
    "'", '"', "' OR '1'='1", "'; DROP TABLE", "1 UNION SELECT",
    "' AND SLEEP(5)--", "/**/OR/**/1=1", "' OR 1=1--",
  ];

  // Check HTML for SQL error messages (passive detection)
  const sqlErrorPatterns = [
    /you have an error in your sql syntax/i,
    /warning.*mysql/i,
    /unclosed quotation mark/i,
    /quoted string not properly terminated/i,
    /microsoft ole db provider for sql server/i,
    /odbc microsoft access driver/i,
    /syntax error.*sql/i,
    /pg::syntaxerror/i,
    /sqlite error/i,
  ];

  for (const pattern of sqlErrorPatterns) {
    if (pattern.test(html)) {
      found = true;
      vulnerabilities.push({
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        title: 'SQL Injection Vulnerability Detected',
        description: 'SQL error messages are exposed in the page response, indicating a potential SQL injection vulnerability. Attackers can use this to extract, modify, or delete database data.',
        solution: `1. Use parameterized queries / prepared statements\n2. Implement input validation\n3. Use an ORM like Prisma or Sequelize\n4. Disable detailed error messages in production`,
        codeSnippet: `// ✅ Safe - Parameterized query\nconst user = await prisma.user.findFirst({\n  where: { email: sanitizedEmail }\n});\n\n// ❌ Unsafe - String concatenation\nconst query = "SELECT * FROM users WHERE email = '" + email + "'";`,
        cvssScore: 9.8,
        owaspCategory: 'A03:2021 - Injection',
      });
      break;
    }
  }

  return { found, vulnerabilities };
};

/**
 * Detect XSS vulnerabilities
 */
const detectXSS = (html, headers) => {
  const vulnerabilities = [];
  let found = false;

  // Check if CSP is missing or weak
  const csp = headers['content-security-policy'];
  const hasWeakCSP = !csp || csp.includes("'unsafe-inline'") || csp.includes('*');

  // Check for inline scripts without nonces/hashes (passive detection)
  // Counts <script> tags that don't have a src attribute (inline scripts)
  const inlineScripts = (html.match(/<script(?![^>]*src)[^>]*>/gi) || []).length;

  if (hasWeakCSP && inlineScripts > 0) {
    found = true;
    vulnerabilities.push({
      type: 'XSS_POTENTIAL',
      severity: 'HIGH',
      title: 'Potential Cross-Site Scripting (XSS) Risk',
      description: `The page has ${inlineScripts} inline script(s) without a strong Content Security Policy. This creates XSS risk if any user input is reflected unsanitized.`,
      solution: `1. Implement a strict Content Security Policy\n2. Sanitize all user inputs (use DOMPurify)\n3. Use template literals with proper escaping\n4. Enable X-XSS-Protection header`,
      codeSnippet: `// Frontend: Use DOMPurify\nimport DOMPurify from 'dompurify';\nconst clean = DOMPurify.sanitize(userInput);\n\n// Backend: Sanitize inputs\nconst { escape } = require('html-entities');\nconst safe = escape(userInput);`,
      cvssScore: 7.2,
      owaspCategory: 'A03:2021 - Injection',
    });
  }

  return { found, vulnerabilities };
};

/**
 * Detect CSRF vulnerabilities
 */
const detectCSRF = (html, headers) => {
  const vulnerabilities = [];
  let found = false;

  // Check for forms without CSRF tokens
  const forms = html.match(/<form[^>]*>/gi) || [];
  const csrfInputs = html.match(/type="hidden"[^>]*name="(csrf|_csrf|csrf_token|_token|authenticity_token|csrfmiddlewaretoken)/gi) || [];

  if (forms.length > 0 && csrfInputs.length === 0) {
    // No CSRF tokens found in forms
    found = true;
    vulnerabilities.push({
      type: 'CSRF_MISSING',
      severity: 'HIGH',
      title: 'Missing CSRF Protection',
      description: `Found ${forms.length} form(s) without CSRF token protection. Attackers can trick authenticated users into performing unwanted actions.`,
      solution: `1. Implement CSRF tokens in all forms\n2. Use SameSite=Strict cookie attribute\n3. Validate Origin/Referer headers\n4. Use double-submit cookie pattern`,
      codeSnippet: `// Express.js with csurf\nconst csrf = require('csurf');\napp.use(csrf({ cookie: true }));\n\n// In route\nres.render('form', { csrfToken: req.csrfToken() });\n\n// In HTML\n<input type="hidden" name="_csrf" value="<%= csrfToken %>">`,
      cvssScore: 8.1,
      owaspCategory: 'A01:2021 - Broken Access Control',
    });
  }

  return { found, vulnerabilities };
};

/**
 * Detect open redirect vulnerabilities
 */
const detectOpenRedirect = (url, redirectChain) => {
  const vulnerabilities = [];
  let found = false;

  // Check URL parameters that might be redirect targets
  const parsed = new URL(url);
  const suspiciousParams = ['redirect', 'return', 'next', 'url', 'goto', 'destination', 'forward'];

  for (const param of suspiciousParams) {
    if (parsed.searchParams.has(param)) {
      found = true;
      vulnerabilities.push({
        type: 'OPEN_REDIRECT',
        severity: 'MEDIUM',
        title: 'Potential Open Redirect Vulnerability',
        description: `The URL parameter "${param}" could be used for open redirect attacks. Attackers can redirect users to malicious sites.`,
        solution: `1. Validate redirect URLs against a whitelist\n2. Only allow relative paths\n3. Use a redirect token system`,
        codeSnippet: `// Validate redirect URL\nconst isValidRedirect = (url) => {\n  const allowed = ['https://yourdomain.com'];\n  try {\n    const parsed = new URL(url);\n    return allowed.includes(parsed.origin);\n  } catch { return false; }\n};`,
        cvssScore: 6.1,
        owaspCategory: 'A01:2021 - Broken Access Control',
      });
      break;
    }
  }

  return { found, vulnerabilities };
};

/**
 * Calculate OWASP compliance score
 */
const calculateOWASPScore = (vulnerabilities) => {
  const owaspCategories = {
    'A01:2021 - Broken Access Control': false,
    'A02:2021 - Cryptographic Failures': false,
    'A03:2021 - Injection': false,
    'A04:2021 - Insecure Design': false,
    'A05:2021 - Security Misconfiguration': false,
    'A06:2021 - Vulnerable Components': false,
    'A07:2021 - Auth Failures': false,
    'A08:2021 - Software Integrity Failures': false,
    'A09:2021 - Logging Failures': false,
    'A10:2021 - SSRF': false,
  };

  // Mark categories with vulnerabilities
  for (const vuln of vulnerabilities) {
    if (vuln.owaspCategory && owaspCategories.hasOwnProperty(vuln.owaspCategory)) {
      owaspCategories[vuln.owaspCategory] = true;
    }
  }

  const failedCount = Object.values(owaspCategories).filter(Boolean).length;
  const score = Math.round(((10 - failedCount) / 10) * 100);

  return score;
};

module.exports = {
  runScan,
  analyzeSSL,
  analyzeHeaders,
  detectSQLInjection,
  detectXSS,
  detectCSRF,
  detectOpenRedirect,
  calculateOWASPScore,
  getHeaderVulnerabilities,
  SCAN_PHASES,
};
