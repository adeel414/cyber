// components/DashboardLayout.jsx - Shared dashboard layout
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard', exact: true },
  { path: '/dashboard/scanner', icon: '🔍', label: 'Scanner' },
  { path: '/dashboard/vulnerabilities', icon: '🛡️', label: 'Vulnerabilities' },
  { path: '/dashboard/reports', icon: '📋', label: 'Reports' },
  { path: '/dashboard/history', icon: '📅', label: 'History' },
  { path: '/dashboard/monitor', icon: '🌐', label: 'Monitor' },
  { path: '/dashboard/billing', icon: '💳', label: 'Billing' },
  { path: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
]

export default function DashboardLayout({ children, title }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CL</span>
          </div>
          <span className="text-white font-bold">CyberLens AI</span>
        </div>

        {/* Plan Badge */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs">
            <span className="text-gray-400">Plan: </span>
            <span className="text-blue-400 font-semibold">{user?.plan?.name || 'FREE'}</span>
            {user?.plan?.scanLimit !== -1 && (
              <span className="text-gray-500 ml-1">
                ({user?.currentMonthScans || 0}/{user?.plan?.scanLimit || 5} scans)
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path, item.exact)
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}

            {/* Admin link */}
            {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
              <li>
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-yellow-400 hover:bg-yellow-900/20 transition-colors mt-2"
                >
                  <span>🔧</span>
                  Admin Panel
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full btn-secondary text-sm py-1.5"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              ☰
            </button>
            <h1 className="text-white font-semibold text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/scanner"
              className="btn-primary text-sm py-1.5 px-3 hidden sm:block"
            >
              + New Scan
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
