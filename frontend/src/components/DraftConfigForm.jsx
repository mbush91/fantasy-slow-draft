import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

export default function DraftConfigForm({ onSaved, positionLimits, draftOrder, currentPickIndex }) {
  const defaultLimits = '{"QB":1,"RB":2,"WR":2,"TE":1,"FLEX":1}'
  const [limits, setLimits] = useState(() => (positionLimits ? JSON.stringify(positionLimits) : defaultLimits))
  const [order, setOrder] = useState(() => (draftOrder && draftOrder.length ? draftOrder.join(',') : ''))
  const [dirtyLimits, setDirtyLimits] = useState(false)
  const [dirtyOrder, setDirtyOrder] = useState(false)

  // Keep form in sync with server state unless user has started editing
  useEffect(() => {
    if (!dirtyLimits) setLimits(positionLimits ? JSON.stringify(positionLimits) : defaultLimits)
  }, [positionLimits, dirtyLimits])
  useEffect(() => {
    if (!dirtyOrder) setOrder(draftOrder && draftOrder.length ? draftOrder.join(',') : '')
  }, [draftOrder, dirtyOrder])

  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      const position_limits = JSON.parse(limits)
      const draft_order = order.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/draft/config', { position_limits, draft_order })
      onSaved?.()
      setDirtyLimits(false)
      setDirtyOrder(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save config (ensure JSON is valid)')
    } finally {
      setLoading(false)
    }
  }

  const activeOrderPreview = useMemo(() => {
    const base = draftOrder || []
    const n = base.length
    if (!n) return '—'
    const idx = currentPickIndex ?? 0
    const round = Math.floor(idx / n)
    const active = round % 2 === 0 ? base : [...base].reverse()
    return `Round ${round + 1}: ${active.join(' → ')}`
  }, [draftOrder, currentPickIndex])

  const editedOrderPreview = useMemo(() => {
    if (!dirtyOrder) return null
    const base = order.split(',').map(s => s.trim()).filter(Boolean)
    const n = base.length
    if (!n) return '—'
    const idx = currentPickIndex ?? 0
    const round = Math.floor(idx / n)
    const active = round % 2 === 0 ? base : [...base].reverse()
    return `Edited • Round ${round + 1}: ${active.join(' → ')}`
  }, [order, dirtyOrder, currentPickIndex])

  const computeUpcoming = (baseOrder, startIdx, count = 10) => {
    const n = baseOrder.length
    if (!n) return []
    const out = []
    for (let k = 0; k < count; k++) {
      const i = startIdx + k
      const round = Math.floor(i / n)
      const pickInRound = i % n
      const sel = round % 2 === 0 ? pickInRound : n - 1 - pickInRound
      out.push({ pickNumber: i + 1, team: baseOrder[sel] })
    }
    return out
  }

  return (
    <div className="card">
      <h4>Draft Configuration</h4>
      <p className="muted">Active order (saved): {activeOrderPreview}</p>
      {editedOrderPreview && (
        <p className="muted">{editedOrderPreview}</p>
      )}
      <label>Position Limits (JSON)</label>
      <textarea rows={4} value={limits} onChange={e => { setLimits(e.target.value); setDirtyLimits(true) }} />
      <label>Draft Order (comma separated team names)</label>
      <input value={order} onChange={e => { setOrder(e.target.value); setDirtyOrder(true) }} />
      <button onClick={save} disabled={loading}>Save</button>
      <div style={{ marginTop: 12 }}>
        <strong>Upcoming (saved):</strong>
        <ol>
          {computeUpcoming(draftOrder || [], currentPickIndex ?? 0, 10).map(p => (
            <li key={`s-${p.pickNumber}`}>#{p.pickNumber}: {p.team}</li>
          ))}
        </ol>
        {dirtyOrder && (
          <>
            <strong>Upcoming (edited):</strong>
            <ol>
              {computeUpcoming(order.split(',').map(s => s.trim()).filter(Boolean), currentPickIndex ?? 0, 10).map(p => (
                <li key={`e-${p.pickNumber}`}>#{p.pickNumber}: {p.team}</li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
