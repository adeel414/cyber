// pages/dashboard/Billing.jsx - Billing and subscription
import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { billingAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function Billing() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingAPI.getPlans(), billingAPI.getHistory()])
      .then(([plansRes, historyRes]) => {
        setPlans(plansRes.data || [])
        setHistory(historyRes.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (planId, planName) => {
    if (!confirm(`Upgrade to ${planName} plan?`)) return
    try {
      await billingAPI.upgrade({ planId, method: 'JAZZCASH' })
      alert('Payment initiated. Please complete payment to activate.')
    } catch (err) {
      alert(err.error || 'Upgrade failed.')
    }
  }

  return (
    <DashboardLayout title="Billing & Plans">
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="card border-blue-800/30 bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Plan</p>
              <h2 className="text-white font-bold text-2xl">{user?.plan?.name || 'FREE'}</h2>
              <p className="text-gray-400 text-sm mt-1">
                {user?.plan?.scanLimit === -1 ? 'Unlimited' : user?.plan?.scanLimit || 5} scans/month
              </p>
            </div>
            <div className="text-4xl">💎</div>
          </div>
        </div>

        {/* Plans */}
        {!loading && (
          <div>
            <h3 className="text-white font-semibold mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`card ${plan.name === user?.plan?.name ? 'border-blue-500' : ''}`}>
                  <h4 className="text-white font-bold mb-1">{plan.name}</h4>
                  <p className="text-2xl font-bold text-white mb-4">
                    {plan.price === 0 ? 'Free' : `Rs. ${plan.price.toLocaleString()}`}
                    {plan.price > 0 && <span className="text-gray-500 text-sm font-normal">/mo</span>}
                  </p>
                  {plan.name === user?.plan?.name ? (
                    <div className="btn-secondary text-sm py-2 text-center opacity-50 cursor-not-allowed">Current Plan</div>
                  ) : (
                    <button onClick={() => handleUpgrade(plan.id, plan.name)} className="btn-primary w-full text-sm py-2">
                      Upgrade
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div>
          <h3 className="text-white font-semibold mb-4">Payment History</h3>
          {history.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400">No payment history yet.</p>
            </div>
          ) : (
            <div className="card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="pb-2 text-gray-400 font-medium">Plan</th>
                    <th className="pb-2 text-gray-400 font-medium">Amount</th>
                    <th className="pb-2 text-gray-400 font-medium">Method</th>
                    <th className="pb-2 text-gray-400 font-medium">Status</th>
                    <th className="pb-2 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {history.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-white">{p.plan?.name}</td>
                      <td className="py-2 text-gray-300">Rs. {p.amount.toLocaleString()}</td>
                      <td className="py-2 text-gray-400">{p.method}</td>
                      <td className="py-2">
                        <span className={p.status === 'PAID' ? 'text-green-400' : p.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
