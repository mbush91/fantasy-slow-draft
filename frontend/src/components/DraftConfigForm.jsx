import React, { useState } from 'react'
import api from '../api'

export default function DraftConfigForm({ onSaved }) {
  const [limits, setLimits] = useState('{"QB":1,"RB":2,"WR":2,"TE":1,"FLEX":1}')
  const [order, setOrder] = useState('Team A,Team B,Team C')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      const position_limits = JSON.parse(limits)
      const draft_order = order.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/draft/config', { position_limits, draft_order })
      onSaved?.()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save config (ensure JSON is valid)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h4>Draft Configuration</h4>
      <label>Position Limits (JSON)</label>
      <textarea rows={4} value={limits} onChange={e => setLimits(e.target.value)} />
      <label>Draft Order (comma separated team names)</label>
      <input value={order} onChange={e => setOrder(e.target.value)} />
      <button onClick={save} disabled={loading}>Save</button>
    </div>
  )
}
