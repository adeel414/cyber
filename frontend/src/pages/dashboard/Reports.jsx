// pages/dashboard/Reports.jsx - Reports page
import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { reportAPI } from '../../services/api'
import { Link } from 'react-router-dom'

const RISK_COLOR = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' }

export default function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportAPI.getReports().then((r) => {
      setReports(r.data?.reports || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-white text-xl font-semibold mb-2">No Reports Yet</h3>
            <p className="text-gray-400 mb-6">Run a scan to generate your first security report.</p>
            <Link to="/dashboard/scanner" className="btn-primary">Start a Scan</Link>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{report.scan?.url}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={RISK_COLOR[report.scan?.riskLevel] || 'badge-low'}>
                      {report.scan?.riskLevel || 'LOW'}
                    </span>
                    <span className="text-gray-500 text-sm">Score: {Math.round(report.scan?.riskScore || 0)}</span>
                    <span className="text-gray-600 text-xs">{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  to={`/dashboard/vulnerabilities/${report.scanId}`}
                  className="btn-secondary text-sm py-1.5 px-3 shrink-0"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
