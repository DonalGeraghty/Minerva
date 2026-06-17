import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './SleepTracker.css'

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function SleepTracker() {
  const { user } = useAuth()
  const email = user?.email || ''

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  // Form state for new entry
  const [date, setDate] = useState('')
  const [bedtime, setBedtime] = useState('')
  const [wakeup, setWakeup] = useState('')
  const [quality, setQuality] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [notes, setNotes] = useState('')

  // Form state for editing
  const [editEntryId, setEditEntryId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editBedtime, setEditBedtime] = useState('')
  const [editWakeup, setEditWakeup] = useState('')
  const [editQuality, setEditQuality] = useState('')
  const [editDurationMinutes, setEditDurationMinutes] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const load = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent)
      if (!email) {
        setEntries([])
        if (!silent) setLoading(false)
        if (!silent) setError('')
        return
      }

      if (!silent) {
        setLoading(true)
        setError('')
      }

      try {
        const res = await authFetch(API_ENDPOINTS.USER_SLEEP, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load sleep entries (${res.status})`)
        setEntries(Array.isArray(data.entries) ? data.entries : [])
      } catch (e) {
        if (!silent) {
          setError(e.message || 'Failed to load sleep entries')
          setEntries([])
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [email]
  )

  useEffect(() => {
    load()
  }, [load])

  const addEntry = useCallback(async () => {
    if (!date || adding) return

    setAdding(true)
    setError('')

    try {
      const body = {
        date,
        bedtime: bedtime || null,
        wakeup: wakeup || null,
        quality: quality ? parseInt(quality) : null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        notes,
      }
      
      const res = await authFetch(API_ENDPOINTS.USER_SLEEP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Add failed (${res.status})`)
      if (Array.isArray(data.entries)) setEntries(data.entries)
      
      // Reset form
      setDate('')
      setBedtime('')
      setWakeup('')
      setQuality('')
      setDurationMinutes('')
      setNotes('')
    } catch (e) {
      setError(e.message || 'Add failed')
    } finally {
      setAdding(false)
    }
  }, [adding, date, bedtime, wakeup, quality, durationMinutes, notes])

  const updateEntry = useCallback(async () => {
    if (!editEntryId || !editDate || updatingId) return

    setUpdatingId(editEntryId)
    setError('')

    try {
      const body = {
        date: editDate,
        bedtime: editBedtime || null,
        wakeup: editWakeup || null,
        quality: editQuality ? parseInt(editQuality) : null,
        durationMinutes: editDurationMinutes ? parseInt(editDurationMinutes) : null,
        notes: editNotes,
      }
      
      const res = await authFetch(`${API_ENDPOINTS.USER_SLEEP}/${editEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`)
      if (Array.isArray(data.entries)) setEntries(data.entries)
      
      // Reset edit form
      cancelEdit()
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }, [editEntryId, editDate, editBedtime, editWakeup, editQuality, editDurationMinutes, editNotes, updatingId])

  const deleteEntry = useCallback(
    async (entryId) => {
      if (!entryId || deletingId) return
      setError('')
      setDeletingId(entryId)

      try {
        const res = await authFetch(`${API_ENDPOINTS.USER_SLEEP}/${entryId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`)
        if (Array.isArray(data.entries)) setEntries(data.entries)
      } catch (e) {
        setError(e.message || 'Delete failed')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId]
  )

  const startEdit = useCallback((entry) => {
    setEditEntryId(entry.id)
    setEditDate(entry.date)
    setEditBedtime(entry.bedtime || '')
    setEditWakeup(entry.wakeup || '')
    setEditQuality(entry.quality ? String(entry.quality) : '')
    setEditDurationMinutes(entry.durationMinutes ? String(entry.durationMinutes) : '')
    setEditNotes(entry.notes || '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditEntryId(null)
    setEditDate('')
    setEditBedtime('')
    setEditWakeup('')
    setEditQuality('')
    setEditDurationMinutes('')
    setEditNotes('')
  }, [])

  const canAdd = useMemo(() => date && !adding, [date, adding])
  const canEdit = useMemo(() => editEntryId && editDate && !updatingId, [editEntryId, editDate, updatingId])

  // Calculate duration from bedtime and wakeup
  const calculateDuration = useCallback((bedtimeStr, wakeupStr) => {
    if (!bedtimeStr || !wakeupStr) return null
    
    try {
      const [bedHours, bedMinutes] = bedtimeStr.split(':').map(Number)
      const [wakeHours, wakeMinutes] = wakeupStr.split(':').map(Number)
      
      let totalMinutes = 0
      
      if (wakeHours >= bedHours) {
        totalMinutes = (wakeHours - bedHours) * 60 + (wakeMinutes - bedMinutes)
      } else {
        // Crosses midnight
        totalMinutes = ((24 - bedHours) + wakeHours) * 60 + (wakeMinutes - bedMinutes)
      }
      
      return totalMinutes > 0 ? totalMinutes : null
    } catch {
      return null
    }
  }, [])

  // Format duration for display
  const formatDuration = useCallback((minutes) => {
    if (minutes === null || minutes === undefined) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }, [])

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped = {}
    entries.forEach(entry => {
      const date = entry.date
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(entry)
    })
    return grouped
  }, [entries])

  // Calculate stats
  const stats = useMemo(() => {
    const total = entries.length
    const avgQuality = entries.length > 0 
      ? (entries.reduce((sum, e) => sum + (e.quality || 0), 0) / entries.length).toFixed(1)
      : 0
    const avgDuration = entries.length > 0
      ? (entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / entries.length).toFixed(0)
      : 0
    
    return { total, avgQuality, avgDuration }
  }, [entries])

  // Get quality emoji
  const getQualityEmoji = useCallback((quality) => {
    if (quality === null || quality === undefined) return '❓'
    const emojis = ['😴', '😐', '😌', '😊', '😃']
    return emojis[quality - 1] || '❓'
  }, [])

  if (loading) {
    return (
      <main className="sleep-page">
        <div className="sleep-inner">
          <p className="sleep-loading" role="status">
            Loading your sleep data…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="sleep-page">
      <div className="sleep-inner">
        <header className="sleep-header">
          <h1 className="sleep-title">Sleep Tracker</h1>
          <p className="sleep-sub">
            Track your sleep patterns to understand your rest and recovery.
          </p>
        </header>

        {error && (
          <div className="sleep-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Stats Summary */}
        <section className="sleep-stats" aria-label="Sleep statistics">
          <div className="sleep-stat-card">
            <span className="sleep-stat-value">{stats.total}</span>
            <span className="sleep-stat-label">Nights Tracked</span>
          </div>
          <div className="sleep-stat-card">
            <span className="sleep-stat-value">{stats.avgQuality}</span>
            <span className="sleep-stat-label">Avg Quality</span>
          </div>
          <div className="sleep-stat-card">
            <span className="sleep-stat-value">{formatDuration(parseInt(stats.avgDuration))}</span>
            <span className="sleep-stat-label">Avg Duration</span>
          </div>
        </section>

        {/* Add Entry Form */}
        <form
          className="sleep-add-form"
          onSubmit={(e) => {
            e.preventDefault()
            void addEntry()
          }}
          aria-label="Add new sleep entry"
        >
          <h2 className="sleep-add-title">Add Sleep Entry</h2>
          
          <div className="sleep-form-grid">
            <div className="sleep-form-group">
              <label className="sleep-form-label" htmlFor="sleep-date">
                Date *
              </label>
              <input
                id="sleep-date"
                className="sleep-form-input"
                type="date"
                data-testid="sleep-new-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Sleep date"
                disabled={adding}
                required
              />
            </div>

            <div className="sleep-form-group">
              <label className="sleep-form-label" htmlFor="sleep-bedtime">
                Bedtime
              </label>
              <input
                id="sleep-bedtime"
                className="sleep-form-input"
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                aria-label="Bedtime"
                disabled={adding}
              />
            </div>

            <div className="sleep-form-group">
              <label className="sleep-form-label" htmlFor="sleep-wakeup">
                Wakeup
              </label>
              <input
                id="sleep-wakeup"
                className="sleep-form-input"
                type="time"
                value={wakeup}
                onChange={(e) => setWakeup(e.target.value)}
                aria-label="Wakeup time"
                disabled={adding}
              />
            </div>

            <div className="sleep-form-group">
              <label className="sleep-form-label" htmlFor="sleep-quality">
                Quality (1-5)
              </label>
              <select
                id="sleep-quality"
                className="sleep-form-input sleep-form-input--select"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                aria-label="Sleep quality"
                disabled={adding}
              >
                <option value="">Select quality</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Fair</option>
                <option value="3">3 - Good</option>
                <option value="4">4 - Very Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <div className="sleep-form-group">
              <label className="sleep-form-label" htmlFor="sleep-duration">
                Duration (minutes)
              </label>
              <input
                id="sleep-duration"
                className="sleep-form-input"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="Auto-calculated"
                min="0"
                max="1440"
                aria-label="Sleep duration in minutes"
                disabled={adding}
              />
            </div>

            <div className="sleep-form-group sleep-form-group--full">
              <label className="sleep-form-label" htmlFor="sleep-notes">
                Notes
              </label>
              <textarea
                id="sleep-notes"
                className="sleep-form-input sleep-form-input--textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did you sleep? Any dreams? Energy level?"
                maxLength={500}
                aria-label="Sleep notes"
                disabled={adding}
                rows={2}
              />
            </div>
          </div>

          <button
            type="submit"
            className="sleep-add-btn"
            data-testid="sleep-add-submit"
            disabled={!canAdd}
          >
            {adding ? 'Adding…' : 'Add Sleep Entry'}
          </button>
        </form>

        {/* Entries List */}
        <section className="sleep-list-section" aria-label="Your sleep entries">
          <h2 className="sleep-list-title">Your Sleep History</h2>
          
          {entries.length === 0 ? (
            <div className="sleep-empty">
              <p>No sleep entries yet. Add one above to start tracking your rest.</p>
            </div>
          ) : (
            <div className="sleep-dates">
              {Object.entries(entriesByDate).map(([dateStr, dateEntries]) => (
                <div key={dateStr} className="sleep-date-group">
                  <h3 className="sleep-date-title">
                    {new Date(dateStr).toLocaleDateString('en-IE', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <div className="sleep-date-entries">
                    {dateEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="sleep-card"
                        data-testid={`sleep-${entry.id}`}
                      >
                        <div className="sleep-card-header">
                          <span className="sleep-card-quality">
                            {getQualityEmoji(entry.quality)} Quality: {entry.quality || 'N/A'}/5
                          </span>
                          {entry.durationMinutes && (
                            <span className="sleep-card-duration">
                              {formatDuration(entry.durationMinutes)}
                            </span>
                          )}
                        </div>

                        <div className="sleep-card-times">
                          {entry.bedtime && (
                            <span className="sleep-card-time">
                              🛏️ {entry.bedtime}
                            </span>
                          )}
                          {entry.wakeup && (
                            <span className="sleep-card-time">
                              🌅 {entry.wakeup}
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="sleep-card-notes">{entry.notes}</p>
                        )}

                        <div className="sleep-card-actions">
                          <button
                            type="button"
                            className="sleep-card-btn sleep-card-btn--edit"
                            onClick={() => startEdit(entry)}
                            disabled={updatingId === entry.id || deletingId === entry.id}
                            aria-label={`Edit ${dateStr} sleep entry`}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="sleep-card-btn sleep-card-btn--delete"
                            onClick={() => void deleteEntry(entry.id)}
                            disabled={deletingId === entry.id || updatingId === entry.id}
                            aria-label={`Delete ${dateStr} sleep entry`}
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Edit Form (inline) */}
                        {editEntryId === entry.id && (
                          <form
                            className="sleep-edit-form"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void updateEntry()
                            }}
                          >
                            <div className="sleep-edit-grid">
                              <input
                                className="sleep-edit-input"
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                placeholder="Date"
                                disabled={updatingId === entry.id}
                              />
                              <input
                                className="sleep-edit-input"
                                type="time"
                                value={editBedtime}
                                onChange={(e) => setEditBedtime(e.target.value)}
                                placeholder="Bedtime"
                                disabled={updatingId === entry.id}
                              />
                              <input
                                className="sleep-edit-input"
                                type="time"
                                value={editWakeup}
                                onChange={(e) => setEditWakeup(e.target.value)}
                                placeholder="Wakeup"
                                disabled={updatingId === entry.id}
                              />
                              <select
                                className="sleep-edit-input sleep-edit-input--select"
                                value={editQuality}
                                onChange={(e) => setEditQuality(e.target.value)}
                                disabled={updatingId === entry.id}
                              >
                                <option value="">Quality</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                              </select>
                              <input
                                className="sleep-edit-input"
                                type="number"
                                value={editDurationMinutes}
                                onChange={(e) => setEditDurationMinutes(e.target.value)}
                                placeholder="Duration (min)"
                                min="0"
                                max="1440"
                                disabled={updatingId === entry.id}
                              />
                              <textarea
                                className="sleep-edit-input sleep-edit-input--textarea"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Notes"
                                maxLength={500}
                                disabled={updatingId === entry.id}
                                rows={2}
                              />
                            </div>
                            <div className="sleep-edit-actions">
                              <button
                                type="submit"
                                className="sleep-edit-btn sleep-edit-btn--save"
                                disabled={!canEdit}
                              >
                                {updatingId === entry.id ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="sleep-edit-btn sleep-edit-btn--cancel"
                                onClick={cancelEdit}
                                disabled={updatingId === entry.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="sleep-footnote">
          Signed in as <code>{email}</code>
        </p>
      </div>
    </main>
  )
}

export default SleepTracker
