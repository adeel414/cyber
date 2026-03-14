// pages/public/Pricing.jsx - Pricing page
import React from 'react'
import { Link } from 'react-router-dom'

const PLANS = [
  {
    name: 'Free',
    price: 'Rs. 0',
    period: '/month',
    highlight: false,
    features: [
      '5 scans/month',
      'Basic PDF report',
      '1 user only',
      'Email alerts only',
      'SSL & header checks',
      'Basic vulnerability scan',
    ],
    cta: 'Get Started Free',
    ctaLink: '/signup',
  },
  {
    name: 'Starter',
    price: 'Rs. 2,999',
    period: '/month',
    highlight: false,
    features: [
      '50 scans/month',
      'Full PDF reports (both types)',
      '1 user',
      'Email + WhatsApp alerts',
      'Daily/weekly monitoring',
      'AI chatbot access',
    ],
    cta: 'Start Starter',
    ctaLink: '/signup',
  },
  {
    name: 'Pro',
    price: 'Rs. 7,999',
    period: '/month',
    highlight: true,
    features: [
      'Unlimited scans',
      'Both PDF report types',
      '5 team members',
      'All alert channels',
      'All monitoring frequencies',
      'API access',
      'Dark web monitoring',
      'Security badge',
    ],
    cta: 'Get Pro',
    ctaLink: '/signup',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    highlight: false,
    features: [
      'Everything unlimited',
      'White-label option',
      'Custom integrations',
      'Dedicated support',
      'Compliance reports',
      'Unlimited team members',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
  },
]

export default function Pricing() {
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
            <h1 className="text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
            <p className="text-gray-400 text-xl">
              Start free. Scale as you grow. Pakistan market pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card relative ${
                  plan.highlight
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>

                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.ctaLink}
                  className={`block text-center py-2.5 px-4 rounded-lg font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-8 text-sm">
            All plans include SSL, XSS, SQLi, CSRF scanning • JazzCash & EasyPaisa accepted
          </p>
        </div>
      </div>
    </div>
  )
}
