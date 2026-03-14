// utils/constants.js - Application constants for CyberLens AI

export const APP_NAME = 'CyberLens AI'
export const APP_TAGLINE = 'See Every Threat Before It Sees You'
export const APP_VERSION = '1.0.0'

export const RISK_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
}

export const SEVERITY_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
}

export const SCAN_STATUSES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
}

export const PLAN_NAMES = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
}

export const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    priceDisplay: 'Free',
    scanLimit: 5,
    teamLimit: 1,
    features: [
      '5 scans/month',
      'Basic PDF report',
      '1 user only',
      'Email alerts only',
    ],
    missing: ['API access', 'Monitoring', 'Dark web', 'Chatbot'],
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: 2999,
    priceDisplay: 'Rs. 2,999/mo',
    scanLimit: 50,
    teamLimit: 1,
    popular: false,
    features: [
      '50 scans/month',
      'Full PDF reports',
      '1 user',
      'Email + WhatsApp alerts',
      'Daily/weekly monitoring',
      'AI Chatbot access',
    ],
    missing: ['API access', 'Dark web monitoring'],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 7999,
    priceDisplay: 'Rs. 7,999/mo',
    scanLimit: -1,
    teamLimit: 5,
    popular: true,
    features: [
      'Unlimited scans',
      'Both PDF report types',
      '5 team members',
      'All alert channels',
      'All monitoring frequencies',
      'API access',
      'Dark web monitoring',
      'AI Chatbot + Script analyzer',
      'Security badge',
    ],
    missing: [],
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    price: null,
    priceDisplay: 'Custom',
    scanLimit: -1,
    teamLimit: -1,
    popular: false,
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'White-label option',
      'Custom integrations',
      'Dedicated support',
      'Compliance reports',
      'SLA guarantee',
    ],
    missing: [],
  },
]

export const OWASP_TOP_10 = [
  { id: 'A01', name: 'Broken Access Control', year: 2021 },
  { id: 'A02', name: 'Cryptographic Failures', year: 2021 },
  { id: 'A03', name: 'Injection', year: 2021 },
  { id: 'A04', name: 'Insecure Design', year: 2021 },
  { id: 'A05', name: 'Security Misconfiguration', year: 2021 },
  { id: 'A06', name: 'Vulnerable and Outdated Components', year: 2021 },
  { id: 'A07', name: 'Identification and Authentication Failures', year: 2021 },
  { id: 'A08', name: 'Software and Data Integrity Failures', year: 2021 },
  { id: 'A09', name: 'Security Logging and Monitoring Failures', year: 2021 },
  { id: 'A10', name: 'Server-Side Request Forgery', year: 2021 },
]

export const SECURITY_HEADERS = [
  { key: 'content-security-policy', label: 'Content-Security-Policy', impact: 'HIGH' },
  { key: 'strict-transport-security', label: 'Strict-Transport-Security', impact: 'HIGH' },
  { key: 'x-frame-options', label: 'X-Frame-Options', impact: 'MEDIUM' },
  { key: 'x-content-type-options', label: 'X-Content-Type-Options', impact: 'MEDIUM' },
  { key: 'referrer-policy', label: 'Referrer-Policy', impact: 'LOW' },
  { key: 'permissions-policy', label: 'Permissions-Policy', impact: 'LOW' },
]

export const MONITOR_FREQUENCIES = [
  { value: 'HOURLY', label: 'Every hour' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

export const TEAM_ROLES = [
  { value: 'ADMIN', label: 'Admin', description: 'Full access to all features' },
  { value: 'ANALYST', label: 'Analyst', description: 'Can view and run scans' },
  { value: 'DEVELOPER', label: 'Developer', description: 'Can view vulnerabilities and fixes' },
  { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
]

export const ALERT_TYPES = {
  VULNERABILITY: 'New Vulnerability Found',
  RISK_INCREASE: 'Risk Score Increased',
  SSL_EXPIRY: 'SSL Certificate Expiring',
  WEEKLY_DIGEST: 'Weekly Security Digest',
  ATTACK_DETECTED: 'Attack Detected',
  SCAN_COMPLETE: 'Scan Completed',
}

export const ROUTES = {
  HOME: '/',
  FEATURES: '/features',
  PRICING: '/pricing',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  SCANNER: '/dashboard/scanner',
  VULNERABILITIES: '/dashboard/vulnerabilities',
  REPORTS: '/dashboard/reports',
  HISTORY: '/dashboard/history',
  MONITOR: '/dashboard/monitor',
  BILLING: '/dashboard/billing',
  SETTINGS: '/dashboard/settings',
  ADMIN: '/admin',
}
