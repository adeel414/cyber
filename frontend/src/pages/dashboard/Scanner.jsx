// pages/dashboard/Scanner.jsx - URL Scanner page with real-time progress
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { scanAPI } from '../../services/api'
import { getSocket, joinScanRoom } from '../../services/socket'

const PHASES = [
  { key: 'connection', label: 'Connecting to target', icon: '🔌' },
  { key: 'ssl', label: 'Analyzing SSL certificate', icon: '🔒' },
  { key: 'headers', label: 'Checking security headers', icon: '📋' },
  { key: 'sqli', label: 'Testing for SQL injection', icon: '💉' },
  { key: 'xss', label: 'Testing for XSS', icon: '⚡' },
  { key: 'csrf', label: 'Checking CSRF protection', icon: '🛡️' },
  { key: 'redirect', label: 'Checking open redirects', icon: '↪️' },
  { key: 'complete', label: 'Generating report', icon: '📊' },
]

export default function Scanner() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [scanState, setScanState] = useState('idle') // idle | scanning | complete | error
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState(null)
  const [scanId, setScanId] = useState(null)
  const [error, setError] = useState('')
  const [completedPhases, setCompletedPhases] = useState([])

  useEffect(() => {
    if (!scanId) return

    const socket = getSocket()
    joinScanRoom(scanId)

    socket.on('scan-progress', (data) => {
      if (data.scanId === scanId) {
        setProgress(data.progress)
        setCurrentPhase(data.phase)
        if (data.progress < 100) {
          setCompletedPhases((prev) =>
            prev.includes(data.phase) ? prev : [...prev, data.phase]
          )
        }
      }
    })

    socket.on('scan-complete', (data) => {
      if (data.scanId === scanId) {
        setProgress(100)
        setScanState('complete')
        setTimeout(() => {
          navigate(`/dashboard/vulnerabilities/${scanId}`)
        }, 1500)
      }
    })

    socket.on('scan-error', (data) => {
      if (data.scanId === scanId) {
        setScanState('error')
        setError(data.error || 'Scan failed. Please try again.')
      }
    })

    return () => {
      socket.off('scan-progress')
      socket.off('scan-complete')
      socket.off('scan-error')
    }
  }, [scanId, navigate])

  const handleScan = async (e) => {
    e.preventDefault()
    if (!url.trim() || scanState === 'scanning') return

    setError('')
    setScanState('scanning')
    setProgress(0)
    setCompletedPhases([])
    setCurrentPhase(null)

    try {
      const response = await scanAPI.startScan(url.trim())
      const id = response.data.scanId
      setScanId(id)
    } catch (err) {
      setScanState('error')
      setError(err.error || 'Failed to start scan. Please check the URL and try again.')
    }
  }

  const handleReset = () => {
    setScanState('idle')
    setProgress(0)
    setCurrentPhase(null)
    setScanId(null)
    setError('')
    setCompletedPhases([])
    setUrl('')
  }

  return (
    <DashboardLayout title="Security Scanner">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* URL Input */}
        <div className="card">
          <h2 className="text-white font-semibold text-lg mb-2">Scan a Website</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter any public URL to start a comprehensive security analysis.
          </p>

          <form onSubmit={handleScan}>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="input-field flex-1"
                disabled={scanState === 'scanning'}
                required
              />
              <button
                type="submit"
                disabled={scanState === 'scanning' || !url.trim()}
                className="btn-primary whitespace-nowrap px-6"
              >
                {scanState === 'scanning' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Scanning...
                  </span>
                ) : (
                  '🔍 Start Scan'
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-950/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
              <button onClick={handleReset} className="ml-3 underline">Try Again</button>
            </div>
          )}
        </div>

        {/* Scan Progress */}
        {scanState !== 'idle' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {scanState === 'complete' ? '✅ Scan Complete!' : '🔍 Scanning...'}
              </h3>
              <span className="text-blue-400 font-bold">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  scanState === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Scan Phases */}
            <div className="space-y-2">
              {PHASES.map((phase) => {
                const isDone = completedPhases.includes(phase.key) || progress === 100
                const isCurrent = currentPhase === phase.key && progress < 100

                return (
                  <div
                    key={phase.key}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      isCurrent ? 'bg-blue-950/50 border border-blue-800/30' : ''
                    }`}
                  >
                    <span className="text-lg w-6 text-center">{phase.icon}</span>
                    <span className={`text-sm flex-1 ${isDone ? 'text-gray-400' : isCurrent ? 'text-blue-300' : 'text-gray-600'}`}>
                      {phase.label}
                    </span>
                    {isDone && <span className="text-green-500 text-sm">✓</span>}
                    {isCurrent && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )
              })}
            </div>

            {scanState === 'complete' && (
              <div className="mt-4 bg-green-950/30 border border-green-800/30 rounded-lg p-3 text-center text-green-400 text-sm">
                Redirecting to results...
              </div>
            )}
          </div>
        )}

        {/* Scan Checklist */}
        {scanState === 'idle' && (
          <div className="card">
            <h3 className="text-white font-semibold mb-4">What We Check</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                '🔒 SSL/TLS Certificate',
                '🔗 HTTP Security Headers',
                '💉 SQL Injection',
                '⚡ Cross-Site Scripting (XSS)',
                '🛡️ CSRF Protection',
                '↪️ Open Redirect',
                '📊 OWASP Top 10',
                '🤖 AI Risk Scoring',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-300 py-1.5">
                  <span className="text-green-500">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
