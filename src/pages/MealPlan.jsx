import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './HubPage.css'
import './MealPlan.css'

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

function defaultSelections(sections) {
  const out = {}
  for (const section of sections) {
    const hasSingleOption = Array.isArray(section?.options) && section.options.length === 1
    out[section.id] = hasSingleOption ? section.options[0].id : ''
  }
  return out
}

function defaultCompleted(sections) {
  const out = {}
  for (const section of sections) out[section.id] = false
  return out
}

function normalizeEntry(entry, sections, dateKey) {
  const validBySection = new Map(
    sections.map((section) => [section.id, new Set((section.options || []).map((opt) => opt.id))]),
  )
  const baseSelections = defaultSelections(sections)
  const baseCompleted = defaultCompleted(sections)

  if (!entry || entry.date !== dateKey) {
    return { selections: baseSelections, completed: baseCompleted }
  }

  const incomingSelections = entry.selections && typeof entry.selections === 'object' ? entry.selections : {}
  const incomingCompleted = entry.completed && typeof entry.completed === 'object' ? entry.completed : {}

  for (const section of sections) {
    const sectionId = section.id
    const optionId = incomingSelections[sectionId]
    if (typeof optionId === 'string' && (validBySection.get(sectionId)?.has(optionId) || optionId === '')) {
      baseSelections[sectionId] = optionId
    }
    const done = incomingCompleted[sectionId]
    if (typeof done === 'boolean') baseCompleted[sectionId] = done
  }

  return { selections: baseSelections, completed: baseCompleted }
}

function MealPlan() {
  const { user } = useAuth()
  const email = user?.email || ''
  const [dateKey, setDateKey] = useState(() => ymd())
  const [sections, setSections] = useState([])
  const [selections, setSelections] = useState({})
  const [completed, setCompleted] = useState({})
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const skipNextSave = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = ymd()
      setDateKey((prev) => (prev === now ? prev : now))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!email) {
      setSections([])
      setSelections({})
      setCompleted({})
      setError('')
      setReady(false)
      return
    }

    setReady(false)
    const load = async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.USER_MEAL_PLAN, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load recipes (${res.status})`)

        const list = Array.isArray(data.sections)
          ? data.sections
              .filter((section) => section && typeof section.id === 'string' && Array.isArray(section.options))
              .map((section) => ({
                id: section.id,
                label: typeof section.label === 'string' ? section.label : section.id,
                options: section.options
                  .filter((opt) => opt && typeof opt.id === 'string' && typeof opt.label === 'string')
                  .map((opt) => ({ id: opt.id, label: opt.label })),
              }))
          : []

        const normalized = normalizeEntry(data.entry, list, dateKey)
        setSections(list)
        skipNextSave.current = true
        setSelections(normalized.selections)
        setCompleted(normalized.completed)
        setError('')
      } catch (e) {
        setSections([])
        setSelections({})
        setCompleted({})
        setError(e.message || 'Failed to load recipes')
      } finally {
        setReady(true)
      }
    }

    void load()
  }, [email, dateKey])

  useEffect(() => {
    if (!email || !ready || sections.length === 0) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    void (async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.USER_MEAL_PLAN, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateKey, selections, completed }),
        })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not save recipes (${res.status})`)
        setError('')
      } catch (e) {
        setError(e.message || 'Failed to save recipes')
      }
    })()
  }, [email, ready, sections, selections, completed, dateKey])

  const prettyDate = useMemo(() => {
    const [y, m, d] = dateKey.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [dateKey])

  const totals = useMemo(() => {
    const total = sections.length
    let done = 0
    for (const section of sections) {
      if (completed[section.id]) done += 1
    }
    return { done, total }
  }, [sections, completed])

  const onSelectOption = (sectionId, optionId) => {
    setSelections((prev) => ({ ...prev, [sectionId]: optionId }))
  }

  const onToggleDone = (sectionId) => {
    setCompleted((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  return (
    <main className="hub-page">
      <div className="hub-inner meal-plan">
        <header className="hub-header">
          <h1 className="hub-title">Trainer recipes</h1>
          <p className="hub-sub">Choose one option from each section and tick it when completed.</p>
        </header>

        <p className="hub-body">
          Tracking for <strong>today</strong> ({prettyDate}). Your selections and completion status are saved to your Janus account.
        </p>
        <p className="hub-body meal-plan-progress">
          Completed: <strong>{totals.done}</strong> / {totals.total} sections
        </p>
        {error ? <p className="hub-body">{error}</p> : null}
        {!ready ? <p className="hub-body">Loading recipes...</p> : null}

        {sections.map((section) => {
          const sectionSelection = selections[section.id] || ''
          const canMarkDone = Boolean(sectionSelection)
          return (
            <section key={section.id} className="hub-card meal-plan-card" aria-label={section.label}>
              <div className="meal-plan-card-head">
                <h2>{section.label}</h2>
                <label className="meal-plan-done">
                  <input
                    type="checkbox"
                    checked={Boolean(completed[section.id])}
                    onChange={() => onToggleDone(section.id)}
                    disabled={!canMarkDone}
                  />
                  <span>Done today</span>
                </label>
              </div>

              <div className="meal-plan-options">
                {section.options.map((option) => (
                  <label key={option.id} className="meal-plan-option">
                    <input
                      type="radio"
                      name={`meal-plan-${section.id}`}
                      value={option.id}
                      checked={sectionSelection === option.id}
                      onChange={() => onSelectOption(section.id, option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

export default MealPlan
