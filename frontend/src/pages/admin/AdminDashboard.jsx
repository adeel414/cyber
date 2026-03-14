// pages/admin/AdminDashboard.jsx - Admin panel dashboard
import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { adminAPI } from '../../services/api'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getDashboard().then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout title="Admin Panel">
      <div className="space-y-6">
        <div className="bg-yellow-950/30 border border-yellow-800/30 rounded-xl px-4 py-3 text-yellow-400 text-sm">
          ⚠️ Admin Panel — All actions are logged in the audit trail.
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="text-3xl font-bold text-white mb-1">{data?.stats?.totalUsers ?? 0}</div>
                <div className="text-gray-400 text-sm">Total Users</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-blue-400 mb-1">{data?.stats?.totalScans ?? 0}</div>
                <div className="text-gray-400 text-sm">Total Scans</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-green-400 mb-1">{data?.stats?.completedScans ?? 0}</div>
                <div className="text-gray-400 text-sm">Completed Scans</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-red-400 mb-1">{data?.stats?.totalVulnerabilities ?? 0}</div>
                <div className="text-gray-400 text-sm">Vulnerabilities Found</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-white font-semibold mb-4">Recent Users</h3>
                <div className="space-y-2">
                  {(data?.recentUsers || []).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-gray-800 rounded-lg text-sm">
                      <div>
                        <p className="text-white">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                      <span className="text-blue-400 text-xs">{u.plan?.name || 'FREE'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-white font-semibold mb-4">Recent Scans</h3>
                <div className="space-y-2">
                  {(data?.recentScans || []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 bg-gray-800 rounded-lg text-sm">
                      <p className="text-gray-300 truncate max-w-[180px]">{s.url}</p>
                      <span className={s.riskScore >= 60 ? 'text-red-400' : 'text-green-400'}>
                        {Math.round(s.riskScore || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
