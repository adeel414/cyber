// __tests__/helpers.test.js - Unit tests for backend utility helpers

const {
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
} = require('../utils/helpers');

describe('generateToken', () => {
  it('returns a hex string of the correct length', () => {
    const token = generateToken(16);
    expect(typeof token).toBe('string');
    // 16 bytes -> 32 hex characters
    expect(token.length).toBe(32);
  });

  it('generates a token with default length 32', () => {
    const token = generateToken();
    expect(token.length).toBe(64); // 32 bytes -> 64 hex chars
  });

  it('generates unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });
});

describe('generateId', () => {
  it('returns a valid UUID v4', () => {
    const id = generateId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });

  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe('isPrivateIP', () => {
  it('detects localhost', () => {
    expect(isPrivateIP('localhost')).toBe(true);
  });

  it('detects 127.0.0.1', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true);
  });

  it('detects 10.x.x.x range', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('10.255.255.255')).toBe(true);
  });

  it('detects 192.168.x.x range', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('192.168.0.0')).toBe(true);
  });

  it('detects 172.16-31.x.x range', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
  });

  it('detects link-local 169.254.x.x', () => {
    expect(isPrivateIP('169.254.1.1')).toBe(true);
  });

  it('allows public IP addresses', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('1.1.1.1')).toBe(false);
    expect(isPrivateIP('google.com')).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('accepts a valid HTTPS URL', () => {
    const result = normalizeUrl('https://example.com');
    expect(result).toBe('https://example.com/');
  });

  it('adds https:// when no protocol is specified', () => {
    const result = normalizeUrl('example.com');
    expect(result).toContain('https://example.com');
  });

  it('accepts a valid HTTP URL', () => {
    const result = normalizeUrl('http://example.com');
    expect(result).toBe('http://example.com/');
  });

  it('throws on private IP', () => {
    expect(() => normalizeUrl('http://192.168.1.1')).toThrow('Private IP');
  });

  it('throws on localhost', () => {
    expect(() => normalizeUrl('http://localhost:3001')).toThrow('Private IP');
  });

  it('throws on 127.0.0.1', () => {
    expect(() => normalizeUrl('http://127.0.0.1')).toThrow('Private IP');
  });
});

describe('getRiskLevel', () => {
  it('returns CRITICAL for score >= 80', () => {
    expect(getRiskLevel(80)).toBe('CRITICAL');
    expect(getRiskLevel(100)).toBe('CRITICAL');
    expect(getRiskLevel(90)).toBe('CRITICAL');
  });

  it('returns HIGH for score 60-79', () => {
    expect(getRiskLevel(60)).toBe('HIGH');
    expect(getRiskLevel(79)).toBe('HIGH');
  });

  it('returns MEDIUM for score 40-59', () => {
    expect(getRiskLevel(40)).toBe('MEDIUM');
    expect(getRiskLevel(59)).toBe('MEDIUM');
  });

  it('returns LOW for score < 40', () => {
    expect(getRiskLevel(0)).toBe('LOW');
    expect(getRiskLevel(39)).toBe('LOW');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats GB', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('paginate', () => {
  it('returns correct skip and take for page 1', () => {
    const result = paginate(1, 10);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(10);
    expect(result.page).toBe(1);
  });

  it('returns correct skip for page 2', () => {
    const result = paginate(2, 10);
    expect(result.skip).toBe(10);
  });

  it('clamps limit to max 100', () => {
    const result = paginate(1, 500);
    expect(result.take).toBe(100);
  });

  it('clamps page to min 1', () => {
    const result = paginate(0, 10);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });
});

describe('maskEmail', () => {
  it('masks email local part', () => {
    const masked = maskEmail('john@example.com');
    expect(masked).toMatch(/^j\*+n@example\.com$/);
  });

  it('keeps domain intact', () => {
    const masked = maskEmail('alice@gmail.com');
    expect(masked).toContain('@gmail.com');
  });
});

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
