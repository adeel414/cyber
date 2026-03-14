// pages/dashboard/History.jsx - Scan history with comparison
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { scanAPI } from '../../services/api'

const STATUS_COLORS = { COMPLETED: 'text-green-400', IN_PROGRESS: 'text-blue-400', FAILED: 'text-red-400' }
const RISK_COLORS = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400' }

export default function History() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    loadScans()
  }, [page])

  const loadScans = async () => {
    setLoading(true)
    try {
      const response = await scanAPI.getScans({ page, limit: 15 })
      setScans(response.data.scans)
      setPagination(response.data.pagination)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this scan?')) return
    try {
      await scanAPI.deleteScan(id)
      setScans(scans.filter((s) => s.id !== id))
    } catch (err) {
      alert('Failed to delete scan.')
    }
  }

  return (
    <DashboardLayout title="Scan History">
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-white text-xl font-semibold mb-2">No Scan History</h3>
            <p className="text-gray-400 mb-6">Your completed scans will appear here.</p>
            <Link to="/dashboard/scanner" className="btn-primary">Run First Scan</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="pb-3 text-gray-400 font-medium">URL</th>
                    <th className="pb-3 text-gray-400 font-medium">Risk</th>
                    <th className="pb-3 text-gray-400 font-medium">Score</th>
                    <th className="pb-3 text-gray-400 font-medium">Issues</th>
                    <th className="pb-3 text-gray-400 font-medium">Status</th>
                    <th className="pb-3 text-gray-400 font-medium">Date</th>
                    <th className="pb-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {scans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-gray-800/30">
                      <td className="py-3 pr-4">
                        <span className="text-gray-300 truncate block max-w-[200px]">{scan.url}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={RISK_COLORS[scan.riskLevel] || 'text-gray-400'}>
                          {scan.riskLevel || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white font-bold">
                        {scan.riskScore !== null ? Math.round(scan.riskScore) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        {scan._count?.vulnerabilities ?? 0}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={STATUS_COLORS[scan.status] || 'text-gray-400'}>
                          {scan.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {scan.status === 'COMPLETED' && (
                            <Link
                              to={`/dashboard/vulnerabilities/${scan.id}`}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              View
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(scan.id)}
                            className="text-red-500 hover:text-red-400 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <span className="text-gray-400 text-sm">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(page + 1)}
                    className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
