// pages/auth/VerifyEmail.jsx
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authAPI } from '../../services/api'

export default function VerifyEmail() {
  const { token } = useParams()
  const [status, setStatus] = useState('verifying')
  const [error, setError] = useState('')

  useEffect(() => {
    const verify = async () => {
      try {
        await authAPI.verifyEmail(token)
        setStatus('success')
      } catch (err) {
        setError(err.error || 'Verification failed.')
        setStatus('error')
      }
    }
    if (token) verify()
  }, [token])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-gray-400 mb-6">Your account is now active. You can sign in.</p>
            <Link to="/login" className="btn-primary">Sign In Now</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <Link to="/login" className="btn-secondary">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  )
}
