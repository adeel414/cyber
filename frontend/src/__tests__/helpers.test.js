// src/__tests__/helpers.test.js - Unit tests for frontend utility helpers
import { describe, it, expect } from 'vitest'
import {
  getRiskLevel,
  getRiskColor,
  getSeverityBadgeClass,
  formatRelativeTime,
  formatDate,
  truncateUrl,
  isValidUrl,
  formatBytes,
  capitalize,
  getComplianceGrade,
} from '../utils/helpers'

describe('getRiskLevel', () => {
  it('returns CRITICAL for score >= 80', () => {
    expect(getRiskLevel(80)).toBe('CRITICAL')
    expect(getRiskLevel(100)).toBe('CRITICAL')
    expect(getRiskLevel(95)).toBe('CRITICAL')
  })

  it('returns HIGH for score 60-79', () => {
    expect(getRiskLevel(60)).toBe('HIGH')
    expect(getRiskLevel(79)).toBe('HIGH')
  })

  it('returns MEDIUM for score 40-59', () => {
    expect(getRiskLevel(40)).toBe('MEDIUM')
    expect(getRiskLevel(59)).toBe('MEDIUM')
  })

  it('returns LOW for score < 40', () => {
    expect(getRiskLevel(0)).toBe('LOW')
    expect(getRiskLevel(39)).toBe('LOW')
  })
})

describe('getRiskColor', () => {
  it('returns red for CRITICAL', () => {
    expect(getRiskColor('CRITICAL')).toContain('red')
  })

  it('returns orange for HIGH', () => {
    expect(getRiskColor('HIGH')).toContain('orange')
  })

  it('returns yellow for MEDIUM', () => {
    expect(getRiskColor('MEDIUM')).toContain('yellow')
  })

  it('returns blue for LOW', () => {
    expect(getRiskColor('LOW')).toContain('blue')
  })

  it('handles lowercase input', () => {
    expect(getRiskColor('critical')).toContain('red')
  })

  it('returns gray for unknown', () => {
    expect(getRiskColor(undefined)).toContain('gray')
    expect(getRiskColor(null)).toContain('gray')
  })
})

describe('getSeverityBadgeClass', () => {
  it('returns critical badge class', () => {
    expect(getSeverityBadgeClass('CRITICAL')).toBe('badge-critical')
  })

  it('returns high badge class', () => {
    expect(getSeverityBadgeClass('HIGH')).toBe('badge-high')
  })

  it('returns medium badge class', () => {
    expect(getSeverityBadgeClass('MEDIUM')).toBe('badge-medium')
  })

  it('returns low badge class by default', () => {
    expect(getSeverityBadgeClass('LOW')).toBe('badge-low')
    expect(getSeverityBadgeClass(undefined)).toBe('badge-low')
  })
})

describe('truncateUrl', () => {
  it('returns empty string for falsy input', () => {
    expect(truncateUrl('')).toBe('')
    expect(truncateUrl(null)).toBe('')
  })

  it('extracts hostname and path from URL', () => {
    const result = truncateUrl('https://example.com/path/to/page')
    expect(result).toBe('example.com/path/to/page')
  })

  it('truncates long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(100)
    const result = truncateUrl(longUrl, 50)
    expect(result.length).toBeLessThanOrEqual(53) // 50 + '...'
    expect(result).toContain('...')
  })

  it('does not truncate short URLs', () => {
    const result = truncateUrl('https://example.com', 50)
    expect(result).not.toContain('...')
  })
})

describe('isValidUrl', () => {
  it('accepts valid HTTPS URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts valid HTTP URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('accepts URLs without protocol', () => {
    expect(isValidUrl('example.com')).toBe(true)
  })

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })
})

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('formats GB', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
  })
})

describe('capitalize', () => {
  it('capitalizes the first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('WORLD')).toBe('World')
  })

  it('returns empty string for falsy input', () => {
    expect(capitalize('')).toBe('')
    expect(capitalize(null)).toBe('')
  })
})

describe('getComplianceGrade', () => {
  it('returns A for score >= 90', () => {
    expect(getComplianceGrade(90)).toBe('A')
    expect(getComplianceGrade(100)).toBe('A')
  })

  it('returns B for score 75-89', () => {
    expect(getComplianceGrade(75)).toBe('B')
    expect(getComplianceGrade(89)).toBe('B')
  })

  it('returns C for score 60-74', () => {
    expect(getComplianceGrade(60)).toBe('C')
    expect(getComplianceGrade(74)).toBe('C')
  })

  it('returns F for score < 60', () => {
    expect(getComplianceGrade(0)).toBe('F')
    expect(getComplianceGrade(59)).toBe('F')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })
})
