// utils/helpers.js - Frontend utility helper functions for CyberLens AI

/**
 * Format a risk score into human-readable risk level
 */
export const getRiskLevel = (score) => {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

/**
 * Get Tailwind color classes for a risk level
 */
export const getRiskColor = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return 'text-red-400'
    case 'HIGH':     return 'text-orange-400'
    case 'MEDIUM':   return 'text-yellow-400'
    case 'LOW':      return 'text-blue-400'
    default:         return 'text-gray-400'
  }
}

/**
 * Get badge class for a severity level
 */
export const getSeverityBadgeClass = (severity) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'badge-critical'
    case 'HIGH':     return 'badge-high'
    case 'MEDIUM':   return 'badge-medium'
    case 'LOW':
    default:         return 'badge-low'
  }
}

/**
 * Format a date string to a human-readable relative time
 */
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Format a date to a short readable format
 */
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Truncate a URL to a max length for display
 */
export const truncateUrl = (url, maxLength = 50) => {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    const display = parsed.hostname + parsed.pathname
    if (display.length <= maxLength) return display
    return display.substring(0, maxLength) + '...'
  } catch {
    return url.length <= maxLength ? url : url.substring(0, maxLength) + '...'
  }
}

/**
 * Validate a URL string
 */
export const isValidUrl = (url) => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : 'https://' + url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Format bytes to human-readable file size
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Capitalize the first letter of a string
 */
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Debounce a function call
 */
export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}

/**
 * Calculate OWASP compliance grade from score
 */
export const getComplianceGrade = (score) => {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  return 'F'
}
