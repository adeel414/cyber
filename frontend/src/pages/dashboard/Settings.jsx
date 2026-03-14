// pages/dashboard/Settings.jsx - User settings page
import React, { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', password: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Update name via API
      updateUser({ name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Profile</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Email Address</label>
              <input type="email" value={user?.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Account Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Account ID</dt>
              <dd className="text-gray-300 font-mono text-xs">{user?.id?.slice(0, 8)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Plan</dt>
              <dd className="text-blue-400">{user?.plan?.name || 'FREE'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Email Verified</dt>
              <dd className={user?.emailVerified ? 'text-green-400' : 'text-yellow-400'}>
                {user?.emailVerified ? '✓ Verified' : '⚠ Unverified'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Member Since</dt>
              <dd className="text-gray-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Danger Zone */}
        <div className="card border-red-900/50">
          <h3 className="text-red-400 font-semibold mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <button className="btn-danger text-sm py-2 w-full" onClick={() => alert('Please contact support to delete your account.')}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
