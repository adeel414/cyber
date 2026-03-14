// pages/dashboard/Monitor.jsx - Continuous monitoring
import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { monitorAPI } from '../../services/api'

export default function Monitor() {
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ url: '', frequency: 'DAILY', alertThreshold: 70 })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    monitorAPI.getMonitors().then((r) => setMonitors(r.data || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      const r = await monitorAPI.addMonitor(form)
      setMonitors([...monitors, r.data])
      setForm({ url: '', frequency: 'DAILY', alertThreshold: 70 })
      setShowForm(false)
    } catch (err) {
      setError(err.error || 'Failed to add monitor.')
    } finally {
      setAdding(false)
    }
  }

  const toggleActive = async (id, active) => {
    try {
      const r = await monitorAPI.updateMonitor(id, { active: !active })
      setMonitors(monitors.map((m) => m.id === id ? r.data : m))
    } catch (err) {
      alert('Failed to update monitor.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this monitor?')) return
    try {
      await monitorAPI.deleteMonitor(id)
      setMonitors(monitors.filter((m) => m.id !== id))
    } catch {
      alert('Failed to delete.')
    }
  }

  return (
    <DashboardLayout title="Continuous Monitoring">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-400">Automatically scan URLs on a schedule and get alerted on new vulnerabilities.</p>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Monitor</button>
        </div>

        {showForm && (
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Add URL to Monitor</h3>
            {error && <div className="bg-red-950/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com" className="input-field" required />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="input-field">
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Alert Threshold</label>
                  <input type="number" min="0" max="100" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: parseInt(e.target.value) })} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={adding} className="btn-primary">
                  {adding ? 'Adding...' : 'Add Monitor'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : monitors.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">🌐</div>
              <p className="text-white font-semibold mb-1">No monitors yet</p>
              <p className="text-gray-400 text-sm">Add a URL to start continuous monitoring.</p>
            </div>
          ) : (
            monitors.map((m) => (
              <div key={m.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{m.url}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-400">
                      <span>🔄 {m.frequency}</span>
                      <span>⚠️ Alert at {m.alertThreshold}+</span>
                      {m.nextScan && <span>⏰ Next: {new Date(m.nextScan).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(m.id, m.active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        m.active ? 'bg-green-900/50 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {m.active ? '● Active' : '○ Paused'}
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-400 text-sm">×</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
