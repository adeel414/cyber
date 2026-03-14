// pages/auth/ForgotPassword.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.error || 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">CL</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6">Reset Password</h1>
        </div>
        <div className="card">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <p className="text-gray-300">Check your email for a password reset link.</p>
              <Link to="/login" className="btn-primary mt-4 inline-block">Back to Login</Link>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-950/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <Link to="/login" className="block text-center text-gray-400 text-sm mt-4 hover:text-white">← Back to Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
