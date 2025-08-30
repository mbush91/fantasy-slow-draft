import React, { useState } from 'react'
import api from '../api'

export default function CSVUpload({ onUploaded }) {
  const [file, setFile] = useState(null)
  const [overwrite, setOverwrite] = useState(true)
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/players/upload?overwrite=${overwrite}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      onUploaded?.()
      setFile(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h4>Upload Players CSV</h4>
      <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} />
      <label style={{ marginTop: 8 }}>
        <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} /> Overwrite existing
      </label>
      <button disabled={!file || loading} onClick={upload}>Upload</button>
    </div>
  )
}
