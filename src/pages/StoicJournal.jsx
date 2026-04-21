import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './HubPage.css'

const STOIC_FIELDS = {
  morningFocus: '',
  likelyChallenge: '',
  virtueToPractice: '',
  eveningWin: '',
  eveningImprove: '',
  nextAction: '',
}

function emptyDayPlannerSlots() {
  const o = {}
  for (let h = 0; h < 24; h += 1) o[String(h)] = ''
  return o
}

function hourRangeLabel(h) {
  const a = String(h).padStart(2, '0')
  const next = h === 23 ? 0 : h + 1
  const b = String(next).padStart(2, '0')
  return `${a}:00–${b}:00`
}

function ymd(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function StoicJournal() {
  const { user } = useAuth()
  const email = user?.email || ''
  const [dateKey, setDateKey] = useState(() => ymd())
  const [form, setForm] = useState(STOIC_FIELDS)
  const [error, setError] = useState('')
  const [plannerOptions, setPlannerOptions] = useState([])
  const [plannerSlots, setPlannerSlots] = useState(emptyDayPlannerSlots)
  const [plannerError, setPlannerError] = useState('')
  const [dailyPlannerReady, setDailyPlannerReady] = useState(false)
  const [newPlannerLabel, setNewPlannerLabel] = useState('')
  const [editingPlannerId, setEditingPlannerId] = useState(null)
  const [editingPlannerLabel, setEditingPlannerLabel] = useState('')
  const skipNextPlannerSave = useRef(false)

  useEffect(() => {
    if (!email) {
      setForm(STOIC_FIELDS)
      setError('')
      return
    }
    const load = async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.USER_STOIC, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load stoic journal (${res.status})`)
        const entry = data.entry && typeof data.entry === 'object' ? data.entry : {}
        if (entry.date === dateKey && entry.form && typeof entry.form === 'object') {
          setForm({
            morningFocus: typeof entry.form.morningFocus === 'string' ? entry.form.morningFocus : '',
            likelyChallenge: typeof entry.form.likelyChallenge === 'string' ? entry.form.likelyChallenge : '',
            virtueToPractice: typeof entry.form.virtueToPractice === 'string' ? entry.form.virtueToPractice : '',
            eveningWin: typeof entry.form.eveningWin === 'string' ? entry.form.eveningWin : '',
            eveningImprove: typeof entry.form.eveningImprove === 'string' ? entry.form.eveningImprove : '',
            nextAction: typeof entry.form.nextAction === 'string' ? entry.form.nextAction : '',
          })
        } else {
          setForm(STOIC_FIELDS)
        }
        setError('')
      } catch (e) {
        setError(e.message || 'Failed to load stoic journal')
        setForm(STOIC_FIELDS)
      }
    }
    void load()
  }, [email, dateKey])

  useEffect(() => {
    if (!email) return
    void (async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.USER_STOIC, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateKey, form }),
        })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not save stoic journal (${res.status})`)
        setError('')
      } catch (e) {
        setError(e.message || 'Failed to save stoic journal')
      }
    })()
  }, [email, form, dateKey])

  useEffect(() => {
    const timer = setInterval(() => {
      const nowKey = ymd()
      setDateKey((prev) => (prev === nowKey ? prev : nowKey))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!email) {
      setPlannerOptions([])
      setPlannerError('')
      return
    }
    const load = async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.DAY_PLANNER_OPTIONS, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load planner options (${res.status})`)
        const raw = data.options
        const list = Array.isArray(raw)
          ? raw
              .filter((o) => o && typeof o.id === 'string' && typeof o.label === 'string')
              .map((o) => ({ id: o.id, label: o.label }))
          : []
        setPlannerOptions(list)
        setPlannerError('')
      } catch (e) {
        setPlannerError(e.message || 'Failed to load planner options')
        setPlannerOptions([])
      }
    }
    void load()
  }, [email])

  useEffect(() => {
    if (!email) {
      setPlannerSlots(emptyDayPlannerSlots())
      setDailyPlannerReady(false)
      return
    }
    setDailyPlannerReady(false)
    const load = async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.DAY_PLANNER_DAILY, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load day planner (${res.status})`)
        const entry = data.entry && typeof data.entry === 'object' ? data.entry : {}
        const next = emptyDayPlannerSlots()
        if (entry.date === dateKey && entry.slots && typeof entry.slots === 'object') {
          for (let h = 0; h < 24; h += 1) {
            const k = String(h)
            const v = entry.slots[k]
            next[k] = typeof v === 'string' ? v : ''
          }
        }
        skipNextPlannerSave.current = true
        setPlannerSlots(next)
        setPlannerError('')
      } catch (e) {
        setPlannerError(e.message || 'Failed to load day planner')
        skipNextPlannerSave.current = true
        setPlannerSlots(emptyDayPlannerSlots())
      } finally {
        setDailyPlannerReady(true)
      }
    }
    void load()
  }, [email, dateKey])

  useEffect(() => {
    if (!email || !dailyPlannerReady) return
    if (skipNextPlannerSave.current) {
      skipNextPlannerSave.current = false
      return
    }
    void (async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.DAY_PLANNER_DAILY, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateKey, slots: plannerSlots }),
        })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not save day planner (${res.status})`)
        setPlannerError('')
      } catch (e) {
        setPlannerError(e.message || 'Failed to save day planner')
      }
    })()
  }, [email, dateKey, plannerSlots, dailyPlannerReady])

  const prettyDate = useMemo(() => {
    const [y, m, d] = dateKey.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [dateKey])

  const plannerHoursByActivity = useMemo(() => {
    const knownIds = new Set(plannerOptions.map((o) => o.id))
    const counts = new Map()
    let unassigned = 0
    let other = 0
    for (let h = 0; h < 24; h += 1) {
      const id = plannerSlots[String(h)] || ''
      if (!id) {
        unassigned += 1
        continue
      }
      if (!knownIds.has(id)) {
        other += 1
        continue
      }
      counts.set(id, (counts.get(id) || 0) + 1)
    }
    const rows = plannerOptions
      .map((o) => ({ id: o.id, label: o.label, hours: counts.get(o.id) || 0, variant: 'activity' }))
      .filter((r) => r.hours > 0)
      .sort((a, b) => b.hours - a.hours)
    if (other > 0) {
      rows.push({ id: '__other', label: 'Other', hours: other, variant: 'muted' })
    }
    if (unassigned > 0) {
      rows.push({ id: '__unassigned', label: 'Unassigned', hours: unassigned, variant: 'muted' })
    }
    return rows
  }, [plannerSlots, plannerOptions])

  const onChange = (field) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [field]: value }))
  }

  const onPlannerSlotChange = (hourKey) => (e) => {
    const value = e.target.value
    setPlannerSlots((s) => ({ ...s, [hourKey]: value }))
  }

  const addPlannerOption = async () => {
    const label = newPlannerLabel.trim()
    if (!email || !label) return
    try {
      const res = await authFetch(API_ENDPOINTS.DAY_PLANNER_OPTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Could not add option (${res.status})`)
      const raw = data.options
      if (Array.isArray(raw)) {
        setPlannerOptions(
          raw
            .filter((o) => o && typeof o.id === 'string' && typeof o.label === 'string')
            .map((o) => ({ id: o.id, label: o.label })),
        )
      }
      setNewPlannerLabel('')
      setPlannerError('')
    } catch (e) {
      setPlannerError(e.message || 'Failed to add planner option')
    }
  }

  const savePlannerOptionEdit = async (id) => {
    const label = editingPlannerLabel.trim()
    if (!email || !id || !label) return
    try {
      const res = await authFetch(API_ENDPOINTS.DAY_PLANNER_OPTIONS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Could not update option (${res.status})`)
      const raw = data.options
      if (Array.isArray(raw)) {
        setPlannerOptions(
          raw
            .filter((o) => o && typeof o.id === 'string' && typeof o.label === 'string')
            .map((o) => ({ id: o.id, label: o.label })),
        )
      }
      setEditingPlannerId(null)
      setEditingPlannerLabel('')
      setPlannerError('')
    } catch (e) {
      setPlannerError(e.message || 'Failed to update planner option')
    }
  }

  const deletePlannerOption = async (id) => {
    if (!email || !id) return
    try {
      const res = await authFetch(API_ENDPOINTS.DAY_PLANNER_OPTIONS, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Could not delete option (${res.status})`)
      const raw = data.options
      if (Array.isArray(raw)) {
        setPlannerOptions(
          raw
            .filter((o) => o && typeof o.id === 'string' && typeof o.label === 'string')
            .map((o) => ({ id: o.id, label: o.label })),
        )
      }
      setPlannerSlots((s) => {
        const next = { ...s }
        for (let h = 0; h < 24; h += 1) {
          const k = String(h)
          if (next[k] === id) next[k] = ''
        }
        return next
      })
      if (editingPlannerId === id) {
        setEditingPlannerId(null)
        setEditingPlannerLabel('')
      }
      setPlannerError('')
    } catch (e) {
      setPlannerError(e.message || 'Failed to delete planner option')
    }
  }

  return (
    <main className="hub-page">
      <div className="hub-inner">
        <header className="hub-header">
          <h1 className="hub-title">Stoic day plan & review</h1>
          <p className="hub-sub">
            Morning intention setting and evening reflection inspired by Stoic practice.
          </p>
        </header>

        <p className="hub-body">
          This journal is scoped to <strong>today only</strong> ({prettyDate}). At midnight it resets for the next day
          and the previous day entry is deleted. You can pair this with your{' '}
          <Link to="/habits#activity">habits / activity</Link> page to spot consistency trends.
        </p>
        {error ? <p className="hub-body">{error}</p> : null}
        {plannerError ? <p className="hub-body">{plannerError}</p> : null}

        <section className="hub-card" aria-label="Day planner">
          <h2>Day planner</h2>
          <p className="hub-body hub-day-planner-intro">
            Assign an activity to each hour of the day. Like the journal above, choices are kept for{' '}
            <strong>today only</strong> and reset when the date changes. The list of activities is saved for your
            account.
          </p>
          <div className="hub-day-planner-options" aria-label="Activity types">
            <div className="hub-field hub-day-planner-options-heading">
              <span>Activity types</span>
            </div>
            <div className="hub-day-planner-add">
              <input
                className="hub-input"
                type="text"
                data-testid="stoic-planner-new-activity"
                value={newPlannerLabel}
                onChange={(e) => setNewPlannerLabel(e.target.value)}
                placeholder="New activity name"
                maxLength={120}
                aria-label="New activity name"
              />
              <button type="button" className="hub-btn" data-testid="stoic-planner-add-activity" onClick={() => void addPlannerOption()} disabled={!email}>
                Add
              </button>
            </div>
            <ul className="hub-day-planner-option-list">
              {plannerOptions.map((o) => (
                <li key={o.id} className="hub-day-planner-option-row">
                  {editingPlannerId === o.id ? (
                    <>
                      <input
                        className="hub-input"
                        type="text"
                        data-testid={`stoic-planner-option-name-${o.id}`}
                        value={editingPlannerLabel}
                        onChange={(e) => setEditingPlannerLabel(e.target.value)}
                        maxLength={120}
                        aria-label={`Edit ${o.label}`}
                      />
                      <button
                        type="button"
                        className="hub-btn"
                        data-testid={`stoic-planner-option-save-${o.id}`}
                        onClick={() => void savePlannerOptionEdit(o.id)}
                        disabled={!email}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="hub-btn"
                        data-testid={`stoic-planner-option-cancel-${o.id}`}
                        onClick={() => {
                          setEditingPlannerId(null)
                          setEditingPlannerLabel('')
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="hub-day-planner-option-label">{o.label}</span>
                      <button
                        type="button"
                        className="hub-btn"
                        data-testid={`stoic-planner-option-edit-${o.id}`}
                        onClick={() => {
                          setEditingPlannerId(o.id)
                          setEditingPlannerLabel(o.label)
                        }}
                        disabled={!email}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="hub-btn"
                        data-testid={`stoic-planner-option-delete-${o.id}`}
                        onClick={() => void deletePlannerOption(o.id)}
                        disabled={!email}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="hub-day-planner-hours" aria-label="Hourly plan">
            {Array.from({ length: 24 }, (_, h) => {
              const key = String(h)
              return (
                <label key={key} className="hub-day-planner-hour-row">
                  <span className="hub-day-planner-hour-label">{hourRangeLabel(h)}</span>
                  <select
                    className="hub-input hub-day-planner-select"
                    data-testid={`stoic-planner-hour-${h}-select`}
                    value={plannerSlots[key] || ''}
                    onChange={onPlannerSlotChange(key)}
                    disabled={!email || !dailyPlannerReady}
                    aria-label={`Activity for ${hourRangeLabel(h)}`}
                  >
                    <option value="">—</option>
                    {plannerOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )
            })}
          </div>
          {email ? (
            <div className="hub-day-planner-chart" aria-label="Hours by activity">
              <h3 className="hub-day-planner-chart-title">Hours by activity</h3>
              <p className="hub-body hub-day-planner-chart-caption">
                Each assigned hour slot counts as one hour for that activity (24 hours total).
              </p>
              {!dailyPlannerReady ? (
                <p className="hub-body">Loading planner…</p>
              ) : plannerHoursByActivity.length === 0 ? (
                <p className="hub-body">Assign activities in the grid above to see a breakdown.</p>
              ) : (
                <ul className="hub-day-planner-bar-list">
                  {plannerHoursByActivity.map((row) => (
                    <li key={row.id} className="hub-day-planner-bar-row">
                      <span className="hub-day-planner-bar-label" title={row.label}>
                        {row.label}
                      </span>
                      <div className="hub-day-planner-bar-track" role="presentation">
                        <div
                          className={
                            row.variant === 'muted'
                              ? 'hub-day-planner-bar-fill hub-day-planner-bar-fill--muted'
                              : 'hub-day-planner-bar-fill'
                          }
                          style={{ width: `${(row.hours / 24) * 100}%` }}
                        />
                      </div>
                      <span className="hub-day-planner-bar-value" aria-label={`${row.hours} hours`}>
                        {row.hours}h
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>

        <section className="hub-card" aria-label="Morning plan">
          <h2>Morning plan</h2>
          <div className="hub-form-grid">
            <label className="hub-field">
              <span>Top priority for today</span>
              <textarea
                className="hub-input"
                data-testid="stoic-journal-morning-focus"
                value={form.morningFocus}
                onChange={onChange('morningFocus')}
                rows={2}
                placeholder="What must get done today?"
              />
            </label>
            <label className="hub-field">
              <span>Likely challenge</span>
              <textarea
                className="hub-input"
                data-testid="stoic-journal-likely-challenge"
                value={form.likelyChallenge}
                onChange={onChange('likelyChallenge')}
                rows={2}
                placeholder="What might test your discipline?"
              />
            </label>
            <label className="hub-field">
              <span>Virtue to practice</span>
              <input
                className="hub-input"
                data-testid="stoic-journal-virtue"
                value={form.virtueToPractice}
                onChange={onChange('virtueToPractice')}
                placeholder="Wisdom, courage, justice, temperance..."
              />
            </label>
          </div>
        </section>

        <section className="hub-card" aria-label="Evening review">
          <h2>Evening review</h2>
          <div className="hub-form-grid">
            <label className="hub-field">
              <span>What went well?</span>
              <textarea
                className="hub-input"
                data-testid="stoic-journal-evening-win"
                value={form.eveningWin}
                onChange={onChange('eveningWin')}
                rows={2}
                placeholder="What actions aligned with your values?"
              />
            </label>
            <label className="hub-field">
              <span>What to improve?</span>
              <textarea
                className="hub-input"
                data-testid="stoic-journal-evening-improve"
                value={form.eveningImprove}
                onChange={onChange('eveningImprove')}
                rows={2}
                placeholder="Where did you drift?"
              />
            </label>
            <label className="hub-field">
              <span>One action for tomorrow</span>
              <input
                className="hub-input"
                data-testid="stoic-journal-next-action"
                value={form.nextAction}
                onChange={onChange('nextAction')}
                placeholder="Small next step..."
              />
            </label>
          </div>
        </section>
      </div>
    </main>
  )
}

export default StoicJournal
