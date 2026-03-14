// pages/public/Features.jsx - Features page
import React from 'react'
import { Link } from 'react-router-dom'

const MODULES = [
  { icon: '🔐', title: 'Authentication System', desc: 'JWT tokens, 2FA, Google OAuth, brute-force protection' },
  { icon: '🔍', title: 'URL Scanner', desc: 'SSL, headers, SQLi, XSS, CSRF, open redirect detection' },
  { icon: '🤖', title: 'AI Risk Scoring', desc: 'Random Forest ML model, 10-feature vector, 0-100 score' },
  { icon: '🛡️', title: 'OWASP Top 10', desc: 'Complete OWASP compliance check with grade system' },
  { icon: '📊', title: 'PDF Reports', desc: 'Executive and developer reports with shareable links' },
  { icon: '🔔', title: 'Multi-Channel Alerts', desc: 'Email, WhatsApp, SMS, and browser push notifications' },
  { icon: '🌐', title: 'Continuous Monitoring', desc: 'Hourly to monthly automated scans with thresholds' },
  { icon: '👥', title: 'Team Collaboration', desc: 'Roles, permissions, shared scans, task assignment' },
  { icon: '🕵️', title: 'Dark Web Monitor', desc: 'HaveIBeenPwned, VirusTotal, credential breach detection' },
  { icon: '🏠', title: 'Honeypot System', desc: 'Decoy server, attack classification, world map visualization' },
  { icon: '💬', title: 'AI Chatbot', desc: 'Claude-powered, Urdu/English bilingual security assistant' },
  { icon: '🔑', title: 'API Access', desc: 'REST API with key management, webhooks, CI/CD integration' },
  { icon: '💳', title: 'Pakistan Payments', desc: 'JazzCash, EasyPaisa, Stripe for global payments' },
  { icon: '📋', title: 'Compliance Reports', desc: 'GDPR, PCI-DSS, ISO 27001 basic compliance checklists' },
  { icon: '🏷️', title: 'Security Badge', desc: 'Embeddable grade badge for your website' },
  { icon: '🛒', title: 'Script Analyzer', desc: 'Third-party CDN scanning with Retire.js CVE detection' },
]

export default function Features() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CL</span>
            </div>
            <span className="text-white font-bold text-lg">CyberLens AI</span>
          </Link>
          <div className="flex gap-3">
            <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">Sign In</Link>
            <Link to="/signup" className="btn-primary text-sm py-1.5 px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-4">All Features</h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">
              24 modules, 100+ security checks — everything you need to secure your web presence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MODULES.map((m) => (
              <div key={m.title} className="card hover:border-blue-700/50 transition-colors">
                <div className="text-2xl mb-3">{m.icon}</div>
                <h3 className="text-white font-semibold mb-1">{m.title}</h3>
                <p className="text-gray-500 text-sm">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link to="/signup" className="btn-primary text-lg py-4 px-8">
              Get All Features Free →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
