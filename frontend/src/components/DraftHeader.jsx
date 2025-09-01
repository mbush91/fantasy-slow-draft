import React from 'react'

export default function DraftHeader({ draftState, onRefresh }) {
  const current = draftState?.current_team || '—'
  const renderOrder = () => {
    const order = draftState?.draft_order || []
    const idx = draftState?.current_pick_index ?? 0
    const n = order.length
    if (!n) return '—'
    const round = Math.floor(idx / n)
    const activeOrder = round % 2 === 0 ? order : [...order].reverse()
    return `Round ${round + 1}: ${activeOrder.join(' → ')}`
  }
  return (
    <div className="card">
      <div className="row">
        <h3>On the clock: {current}</h3>
        <button onClick={onRefresh}>Refresh</button>
      </div>
      {draftState && (
        <p className="muted">Pick #{(draftState.current_pick_index ?? 0) + 1} • {renderOrder()}</p>
      )}
    </div>
  )
}
