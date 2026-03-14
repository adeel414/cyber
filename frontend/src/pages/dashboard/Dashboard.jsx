// pages/dashboard/Dashboard.jsx - Main dashboard home
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardLayout from '../../components/DashboardLayout'
import { scanAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const getRiskColor = (level) => {
  const colors = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400' }
  return colors[level] || 'text-gray-400'
}

const getRiskBg = (score) => {
  if (score >= 80) return 'bg-red-600'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await scanAPI.getStats()
        setStats(response.data)
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const scanLimit = user?.plan?.scanLimit ?? 5
  const scansUsed = stats?.currentMonthScans ?? 0
  const usagePercent = scanLimit === -1 ? 0 : Math.round((scansUsed / scanLimit) * 100)

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-950/50 to-gray-900 border border-blue-800/30 rounded-xl p-6">
          <h2 className="text-white text-xl font-bold mb-1">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-400">Here&apos;s your security overview for this month.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-3xl font-bold text-white mb-1">{loading ? '—' : stats?.totalScans ?? 0}</div>
            <div className="text-gray-400 text-sm">Total Scans</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-red-400 mb-1">{loading ? '—' : stats?.criticalVulnerabilities ?? 0}</div>
            <div className="text-gray-400 text-sm">Critical Issues</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-orange-400 mb-1">{loading ? '—' : stats?.highVulnerabilities ?? 0}</div>
            <div className="text-gray-400 text-sm">High Issues</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-blue-400 mb-1">{loading ? '—' : stats?.avgRiskScore ?? 0}</div>
            <div className="text-gray-400 text-sm">Avg Risk Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scan Usage */}
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Monthly Scan Usage</h3>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">{scansUsed} scans used</span>
              <span className="text-gray-400">{scanLimit === -1 ? '∞' : scanLimit} limit</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <Link to="/dashboard/scanner" className="btn-primary w-full text-center block text-sm py-2">
              + Start New Scan
            </Link>
            {user?.plan?.name === 'FREE' && (
              <Link to="/dashboard/billing" className="block text-center text-blue-400 text-xs mt-2 hover:text-blue-300">
                Upgrade for more scans →
              </Link>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/dashboard/scanner" className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <span>🔍</span>
                <span className="text-gray-300 text-sm">New Security Scan</span>
              </Link>
              <Link to="/dashboard/reports" className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <span>📊</span>
                <span className="text-gray-300 text-sm">View Reports</span>
              </Link>
              <Link to="/dashboard/monitor" className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <span>🌐</span>
                <span className="text-gray-300 text-sm">Setup Monitoring</span>
              </Link>
              <Link to="/dashboard/billing" className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <span>⬆️</span>
                <span className="text-gray-300 text-sm">Upgrade Plan</span>
              </Link>
            </div>
          </div>

          {/* Security Tips */}
          <div className="card">
            <h3 className="text-white font-semibold mb-4">💡 Security Tips</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                Always use HTTPS with a valid SSL certificate
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                Add Content Security Policy (CSP) headers
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Enable HSTS to prevent downgrade attacks
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                Use parameterized queries to prevent SQL injection
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                Sanitize all user inputs to prevent XSS
              </div>
            </div>
          </div>
        </div>

        {/* Risk Score Trend */}
        {stats?.recentScans?.length > 0 && (
          <div className="card">
            <h3 className="text-white font-semibold mb-6">Risk Score Trend (Recent Scans)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.recentScans}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="url" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => v.replace('https://', '').slice(0, 15)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb' }}
                  labelFormatter={(v) => v}
                  formatter={(v) => [`${v}`, 'Risk Score']}
                />
                <Line type="monotone" dataKey="riskScore" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Scans */}
        {stats?.recentScans?.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Recent Scans</h3>
              <Link to="/dashboard/history" className="text-blue-400 text-sm hover:text-blue-300">View all →</Link>
            </div>
            <div className="space-y-2">
              {stats.recentScans.slice(-5).reverse().map((scan) => (
                <div key={scan.createdAt} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${getRiskBg(scan.riskScore)} shrink-0`} />
                    <span className="text-gray-300 text-sm truncate">{scan.url}</span>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ml-2 ${getRiskColor(scan.riskScore >= 80 ? 'CRITICAL' : scan.riskScore >= 60 ? 'HIGH' : scan.riskScore >= 40 ? 'MEDIUM' : 'LOW')}`}>
                    {Math.round(scan.riskScore)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
