// pages/dashboard/Vulnerabilities.jsx - Vulnerability details page
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { scanAPI } from '../../services/api'

const SEVERITY_COLORS = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
}

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export default function Vulnerabilities() {
  const { scanId } = useParams()
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!scanId) {
      setLoading(false)
      return
    }
    loadScan()
  }, [scanId])

  const loadScan = async () => {
    try {
      const response = await scanAPI.getScan(scanId)
      setScan(response.data)
    } catch (err) {
      setError(err.error || 'Failed to load scan results.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Vulnerabilities">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!scanId) {
    return (
      <DashboardLayout title="Vulnerabilities">
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-white text-xl font-semibold mb-2">No Scan Selected</h2>
          <p className="text-gray-400 mb-6">Run a scan to see vulnerability results here.</p>
          <Link to="/dashboard/scanner" className="btn-primary">Start a Scan</Link>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Vulnerabilities">
        <div className="text-center py-20">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-400">{error}</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!scan) return null

  // Status handling - scan still in progress
  if (scan.status === 'IN_PROGRESS') {
    return (
      <DashboardLayout title="Scan In Progress">
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Scan in Progress</h2>
          <p className="text-gray-400">Please wait while we analyze {scan.url}</p>
        </div>
      </DashboardLayout>
    )
  }

  const vulns = scan.vulnerabilities || []
  const filtered = filter === 'ALL' ? vulns : vulns.filter((v) => v.severity === filter)
  const sorted = filtered.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const counts = {
    CRITICAL: vulns.filter((v) => v.severity === 'CRITICAL').length,
    HIGH: vulns.filter((v) => v.severity === 'HIGH').length,
    MEDIUM: vulns.filter((v) => v.severity === 'MEDIUM').length,
    LOW: vulns.filter((v) => v.severity === 'LOW').length,
  }

  const riskColor = scan.riskScore >= 80 ? 'text-red-400' : scan.riskScore >= 60 ? 'text-orange-400' : scan.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'
  const riskBg = scan.riskScore >= 80 ? 'bg-red-600' : scan.riskScore >= 60 ? 'bg-orange-500' : scan.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <DashboardLayout title="Scan Results">
      <div className="space-y-6">
        {/* Risk Score Header */}
        <div className="card bg-gradient-to-r from-gray-900 to-gray-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`w-20 h-20 ${riskBg} rounded-2xl flex items-center justify-center shrink-0`}>
              <span className="text-white text-2xl font-bold">{Math.round(scan.riskScore || 0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-sm mb-1">Security Scan Results</p>
              <h2 className="text-white font-bold text-lg truncate">{scan.url}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`font-bold ${riskColor}`}>{scan.riskLevel || 'Unknown'} Risk</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400 text-sm">{vulns.length} vulnerabilities found</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400 text-sm">OWASP Score: {scan.owaspScore || 0}%</span>
              </div>
            </div>
            <div className="flex gap-2">
              {scan.ssl?.hasSSL ? (
                <span className="bg-green-900/50 text-green-400 border border-green-800/50 px-3 py-1 rounded-full text-xs font-medium">✓ HTTPS</span>
              ) : (
                <span className="bg-red-900/50 text-red-400 border border-red-800/50 px-3 py-1 rounded-full text-xs font-medium">✗ No SSL</span>
              )}
            </div>
          </div>
        </div>

        {/* Severity Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(filter === sev ? 'ALL' : sev)}
              className={`card text-center cursor-pointer hover:border-gray-600 transition-colors ${filter === sev ? 'border-gray-500' : ''}`}
            >
              <div className="text-2xl font-bold text-white mb-1">{counts[sev]}</div>
              <span className={SEVERITY_COLORS[sev]}>{sev}</span>
            </button>
          ))}
        </div>

        {/* Vulnerabilities List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">
              {filter === 'ALL' ? 'All Vulnerabilities' : `${filter} Vulnerabilities`}
              <span className="text-gray-500 font-normal ml-2">({sorted.length})</span>
            </h3>
            {filter !== 'ALL' && (
              <button onClick={() => setFilter('ALL')} className="text-blue-400 text-sm hover:text-blue-300">
                Clear filter
              </button>
            )}
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-green-400 font-semibold">No {filter !== 'ALL' ? filter.toLowerCase() : ''} vulnerabilities found!</p>
              <p className="text-gray-500 text-sm mt-1">Your website is looking secure in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((vuln) => (
                <div key={vuln.id} className="border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === vuln.id ? null : vuln.id)}
                    className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <div className={`w-1 h-6 rounded-full shrink-0 mt-0.5 ${
                      vuln.severity === 'CRITICAL' ? 'bg-red-500' :
                      vuln.severity === 'HIGH' ? 'bg-orange-500' :
                      vuln.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-white font-medium">{vuln.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={SEVERITY_COLORS[vuln.severity]}>{vuln.severity}</span>
                            {vuln.cvssScore > 0 && (
                              <span className="text-gray-500 text-xs">CVSS: {vuln.cvssScore}</span>
                            )}
                            {vuln.owaspCategory && (
                              <span className="text-gray-600 text-xs truncate">{vuln.owaspCategory}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-gray-500 shrink-0">{expanded === vuln.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </button>

                  {expanded === vuln.id && (
                    <div className="px-4 pb-4 border-t border-gray-800 space-y-4">
                      <div className="pt-4">
                        <h5 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Description</h5>
                        <p className="text-gray-300 text-sm leading-relaxed">{vuln.description}</p>
                      </div>

                      <div>
                        <h5 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Solution</h5>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <p className="text-gray-300 text-sm whitespace-pre-line">{vuln.solution}</p>
                        </div>
                      </div>

                      {vuln.codeSnippet && (
                        <div>
                          <h5 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Code Example</h5>
                          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-green-400 overflow-x-auto font-mono">
                            {vuln.codeSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
