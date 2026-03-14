// pages/public/Home.jsx - Landing page for CyberLens AI
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { scanAPI } from '../../services/api'

const FEATURES = [
  { icon: '🔍', title: 'AI-Powered Scanning', desc: 'Machine learning risk scoring with 95%+ accuracy' },
  { icon: '🛡️', title: 'OWASP Top 10', desc: 'Complete coverage of all OWASP vulnerability categories' },
  { icon: '⚡', title: 'Real-Time Alerts', desc: 'Instant notifications via Email, WhatsApp, and SMS' },
  { icon: '📊', title: 'Professional Reports', desc: 'Executive and developer PDF reports with remediation guides' },
  { icon: '🕵️', title: 'Dark Web Monitor', desc: 'Check if your credentials are exposed on dark web' },
  { icon: '🌐', title: 'Continuous Monitoring', desc: 'Hourly, daily, or weekly automated scans' },
]

const STATS = [
  { value: '10,000+', label: 'Websites Scanned' },
  { value: '50,000+', label: 'Vulnerabilities Found' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '24/7', label: 'Monitoring' },
]

export default function Home() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const handleQuickScan = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setError('')
    setScanning(true)
    try {
      const response = await scanAPI.startScan(url)
      const { scanId } = response.data
      navigate(`/dashboard/vulnerabilities/${scanId}`)
    } catch (err) {
      setError(err.error || 'Scan failed. Please try a valid URL.')
      setScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CL</span>
              </div>
              <span className="text-white font-bold text-lg">CyberLens AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/features" className="text-gray-400 hover:text-white transition-colors">Features</Link>
              <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">Sign In</Link>
              <Link to="/signup" className="btn-primary text-sm py-1.5 px-4">Get Started Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-blue-300 text-sm font-medium">AI-Powered Web Security Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              See Every Threat
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                {' '}Before It Sees You
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              CyberLens AI scans your website for vulnerabilities, SSL issues, OWASP Top 10,
              and more. Get professional security reports in minutes.
            </p>

            {/* Quick Scan Form */}
            <form onSubmit={handleQuickScan} className="max-w-2xl mx-auto mb-8">
              <div className="flex gap-3 p-2 bg-gray-900 border border-gray-700 rounded-xl focus-within:border-blue-500 transition-colors">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., https://example.com)"
                  className="flex-1 bg-transparent text-white placeholder-gray-500 px-3 py-2 focus:outline-none"
                  disabled={scanning}
                />
                <button
                  type="submit"
                  disabled={scanning || !url.trim()}
                  className="btn-primary whitespace-nowrap flex items-center gap-2"
                >
                  {scanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>🔍 Scan Now — Free</>
                  )}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
              <p className="text-gray-500 text-sm mt-3">
                No account required for 1 free scan • Instant results
              </p>
            </form>

            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="btn-primary text-base py-3 px-6">
                Start Free Trial →
              </Link>
              <Link to="/features" className="btn-secondary text-base py-3 px-6">
                Explore Features
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Stay Secure</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Professional-grade security tools designed for SMBs, freelancers, and developers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card hover:border-blue-700/50 transition-colors"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-950/50 to-cyan-950/50 border-t border-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Start Securing Your Website Today
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join thousands of businesses protecting their websites with CyberLens AI.
            Start with 5 free scans — no credit card required.
          </p>
          <Link to="/signup" className="btn-primary text-lg py-4 px-8 inline-block">
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CL</span>
            </div>
            <span className="text-gray-400 font-semibold">CyberLens AI</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 CyberLens AI. Professional Web Security Intelligence Platform.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link to="/features" className="hover:text-gray-300">Features</Link>
            <Link to="/pricing" className="hover:text-gray-300">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
