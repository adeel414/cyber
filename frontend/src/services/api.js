// services/api.js - Axios API client for CyberLens AI
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          const { accessToken, refreshToken: newRefreshToken } = response.data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)
          original.headers.Authorization = `Bearer ${accessToken}`
          return api(original)
        }
      } catch {
        // Refresh failed - clear auth
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error.response?.data || error)
  }
)

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
}

// Scan API
export const scanAPI = {
  startScan: (url) => api.post('/scans', { url }),
  getScans: (params) => api.get('/scans', { params }),
  getScan: (id) => api.get(`/scans/${id}`),
  deleteScan: (id) => api.delete(`/scans/${id}`),
  getStats: () => api.get('/scans/stats/overview'),
}

// Report API
export const reportAPI = {
  getReports: (params) => api.get('/reports', { params }),
  getReport: (id) => api.get(`/reports/${id}`),
  getSharedReport: (token) => api.get(`/reports/share/${token}`),
}

// Monitor API
export const monitorAPI = {
  getMonitors: () => api.get('/monitor'),
  addMonitor: (data) => api.post('/monitor', data),
  updateMonitor: (id, data) => api.patch(`/monitor/${id}`, data),
  deleteMonitor: (id) => api.delete(`/monitor/${id}`),
}

// Alert API
export const alertAPI = {
  getAlerts: (params) => api.get('/alerts', { params }),
  markRead: (id) => api.patch(`/alerts/${id}/read`),
  markAllRead: () => api.patch('/alerts/read-all'),
  getPreferences: () => api.get('/alerts/preferences'),
  updatePreferences: (data) => api.put('/alerts/preferences', data),
}

// Team API
export const teamAPI = {
  getTeams: () => api.get('/team'),
  createTeam: (data) => api.post('/team', data),
  inviteMember: (teamId, data) => api.post(`/team/${teamId}/invite`, data),
  removeMember: (teamId, userId) => api.delete(`/team/${teamId}/members/${userId}`),
}

// Billing API
export const billingAPI = {
  getPlans: () => api.get('/billing/plans'),
  getHistory: () => api.get('/billing/history'),
  upgrade: (data) => api.post('/billing/upgrade', data),
}

// API Keys
export const apikeyAPI = {
  getKeys: () => api.get('/apikeys'),
  createKey: (data) => api.post('/apikeys', data),
  revokeKey: (id) => api.delete(`/apikeys/${id}`),
}

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getScans: (params) => api.get('/admin/scans', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
}

export default api
