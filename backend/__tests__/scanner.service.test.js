// __tests__/scanner.service.test.js - Unit tests for the security scanner service

const {
  analyzeHeaders,
  detectXSS,
  detectCSRF,
  detectOpenRedirect,
  calculateOWASPScore,
  getHeaderVulnerabilities,
} = require('../services/scanner.service');

describe('analyzeHeaders', () => {
  it('detects presence of all security headers', () => {
    const headers = {
      'content-security-policy': "default-src 'self'",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=31536000',
      'referrer-policy': 'strict-origin',
      'permissions-policy': 'geolocation=()',
      'x-xss-protection': '1; mode=block',
    };

    const result = analyzeHeaders(headers);

    expect(result['content-security-policy'].present).toBe(true);
    expect(result['x-frame-options'].present).toBe(true);
    expect(result['x-content-type-options'].present).toBe(true);
    expect(result['strict-transport-security'].present).toBe(true);
    expect(result['referrer-policy'].present).toBe(true);
    expect(result['permissions-policy'].present).toBe(true);
    expect(result['x-xss-protection'].present).toBe(true);
  });

  it('marks headers as absent when missing', () => {
    const result = analyzeHeaders({});

    expect(result['content-security-policy'].present).toBe(false);
    expect(result['x-frame-options'].present).toBe(false);
    expect(result['x-content-type-options'].present).toBe(false);
    expect(result['strict-transport-security'].present).toBe(false);
  });

  it('stores header values correctly', () => {
    const headers = { 'x-frame-options': 'SAMEORIGIN' };
    const result = analyzeHeaders(headers);
    expect(result['x-frame-options'].value).toBe('SAMEORIGIN');
  });

  it('returns null value for missing headers', () => {
    const result = analyzeHeaders({});
    expect(result['x-frame-options'].value).toBeNull();
  });
});

describe('getHeaderVulnerabilities', () => {
  it('reports vulnerability for missing CSP', () => {
    const headers = analyzeHeaders({});
    const vulns = getHeaderVulnerabilities(headers);
    const cspVuln = vulns.find((v) => v.type === 'MISSING_CSP');
    expect(cspVuln).toBeDefined();
    expect(cspVuln.severity).toBe('MEDIUM');
  });

  it('reports vulnerability for missing X-Frame-Options', () => {
    const headers = analyzeHeaders({});
    const vulns = getHeaderVulnerabilities(headers);
    const xframeVuln = vulns.find((v) => v.type === 'MISSING_X_FRAME');
    expect(xframeVuln).toBeDefined();
  });

  it('does not report vulnerability when headers are present', () => {
    const headers = analyzeHeaders({
      'content-security-policy': "default-src 'self'",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=31536000',
    });
    const vulns = getHeaderVulnerabilities(headers);
    const types = vulns.map((v) => v.type);
    expect(types).not.toContain('MISSING_CSP');
    expect(types).not.toContain('MISSING_X_FRAME');
    expect(types).not.toContain('MISSING_HSTS');
  });
});

describe('detectXSS', () => {
  it('detects potential XSS when CSP is missing and inline scripts present', () => {
    const html = '<html><body><script>alert(1)</script></body></html>';
    const headers = {};
    const result = detectXSS(html, headers);
    expect(result.found).toBe(true);
    expect(result.vulnerabilities.length).toBeGreaterThan(0);
    expect(result.vulnerabilities[0].type).toBe('XSS_POTENTIAL');
  });

  it('does not flag XSS when strong CSP is present', () => {
    const html = '<html><body><script>console.log(1)</script></body></html>';
    const headers = { 'content-security-policy': "default-src 'self'" };
    const result = detectXSS(html, headers);
    expect(result.found).toBe(false);
  });

  it('does not flag XSS when no inline scripts exist', () => {
    const html = '<html><body><p>Hello world</p></body></html>';
    const headers = {};
    const result = detectXSS(html, headers);
    expect(result.found).toBe(false);
  });
});

describe('detectCSRF', () => {
  it('detects CSRF when forms have no tokens', () => {
    const html = '<form method="POST"><input type="text" name="email"></form>';
    const headers = {};
    const result = detectCSRF(html, headers);
    expect(result.found).toBe(true);
    expect(result.vulnerabilities[0].type).toBe('CSRF_MISSING');
  });

  it('does not flag CSRF when CSRF token input is present', () => {
    const html = `<form method="POST">
      <input type="hidden" name="_csrf" value="abc123">
      <input type="text" name="email">
    </form>`;
    const headers = {};
    const result = detectCSRF(html, headers);
    expect(result.found).toBe(false);
  });

  it('does not flag CSRF when no forms exist', () => {
    const html = '<html><body><p>No forms here</p></body></html>';
    const headers = {};
    const result = detectCSRF(html, headers);
    expect(result.found).toBe(false);
  });
});

describe('detectOpenRedirect', () => {
  it('detects open redirect via "redirect" parameter', () => {
    const result = detectOpenRedirect('https://example.com/?redirect=https://evil.com', []);
    expect(result.found).toBe(true);
    expect(result.vulnerabilities[0].type).toBe('OPEN_REDIRECT');
  });

  it('detects open redirect via "url" parameter', () => {
    const result = detectOpenRedirect('https://example.com/?url=https://evil.com', []);
    expect(result.found).toBe(true);
  });

  it('detects open redirect via "next" parameter', () => {
    const result = detectOpenRedirect('https://example.com/login?next=/dashboard', []);
    expect(result.found).toBe(true);
  });

  it('does not flag URLs without suspicious parameters', () => {
    const result = detectOpenRedirect('https://example.com/search?q=hello', []);
    expect(result.found).toBe(false);
  });

  it('returns MEDIUM severity for open redirect', () => {
    const result = detectOpenRedirect('https://example.com/?return=https://evil.com', []);
    expect(result.vulnerabilities[0].severity).toBe('MEDIUM');
  });
});

describe('calculateOWASPScore', () => {
  it('returns 100 when no vulnerabilities exist', () => {
    const score = calculateOWASPScore([]);
    expect(score).toBe(100);
  });

  it('reduces score for each OWASP category violated', () => {
    const vulns = [
      { owaspCategory: 'A03:2021 - Injection' },
      { owaspCategory: 'A02:2021 - Cryptographic Failures' },
    ];
    const score = calculateOWASPScore(vulns);
    expect(score).toBe(80); // 2 categories violated = 80%
  });

  it('deduplicates same OWASP category', () => {
    const vulns = [
      { owaspCategory: 'A03:2021 - Injection' },
      { owaspCategory: 'A03:2021 - Injection' },
    ];
    const score = calculateOWASPScore(vulns);
    expect(score).toBe(90); // Only 1 unique category violated = 90%
  });

  it('handles vulns without OWASP category gracefully', () => {
    const vulns = [{ type: 'UNKNOWN', severity: 'LOW' }];
    const score = calculateOWASPScore(vulns);
    expect(score).toBe(100);
  });
});
