// App.jsx - Main application with routing for CyberLens AI
import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/public/Home'))
const Features = lazy(() => import('./pages/public/Features'))
const Pricing = lazy(() => import('./pages/public/Pricing'))

const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Scanner = lazy(() => import('./pages/dashboard/Scanner'))
const Vulnerabilities = lazy(() => import('./pages/dashboard/Vulnerabilities'))
const Reports = lazy(() => import('./pages/dashboard/Reports'))
const History = lazy(() => import('./pages/dashboard/History'))
const Monitor = lazy(() => import('./pages/dashboard/Monitor'))
const Billing = lazy(() => import('./pages/dashboard/Billing'))
const Settings = lazy(() => import('./pages/dashboard/Settings'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

// Loading spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Loading CyberLens AI...</p>
    </div>
  </div>
)

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// Admin route wrapper
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

// Public route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Auth pages */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

        {/* Dashboard pages */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
        <Route path="/dashboard/vulnerabilities/:scanId?" element={<ProtectedRoute><Vulnerabilities /></ProtectedRoute>} />
        <Route path="/dashboard/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/dashboard/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/dashboard/monitor" element={<ProtectedRoute><Monitor /></ProtectedRoute>} />
        <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Admin panel */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
