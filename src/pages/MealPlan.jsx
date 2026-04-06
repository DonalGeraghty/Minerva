import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import mealPlanNutrition from '../data/mealPlanNutrition.json'
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

const SECTION_NUTRITION_ESTIMATES = mealPlanNutrition?.sections || {}
const PROVIDED_TOTALS = mealPlanNutrition?.totals || null

function calcNutritionTotals(sections) {
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  const perSection = []
  for (const section of sections) {
    const n = SECTION_NUTRITION_ESTIMATES[section.id] || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    calories += n.calories
    protein += n.protein
    carbs += n.carbs
    fat += n.fat
    perSection.push({
      id: section.id,
      label: section.label,
      calories: n.calories,
    })
  }
  const fallbackTotals = {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  }
  const totalsFromJson =
    PROVIDED_TOTALS &&
    typeof PROVIDED_TOTALS.calories === 'number' &&
    typeof PROVIDED_TOTALS.protein === 'number' &&
    typeof PROVIDED_TOTALS.carbs === 'number' &&
    typeof PROVIDED_TOTALS.fat === 'number'
      ? {
          calories: Math.round(PROVIDED_TOTALS.calories),
          protein: Math.round(PROVIDED_TOTALS.protein * 10) / 10,
          carbs: Math.round(PROVIDED_TOTALS.carbs * 10) / 10,
          fat: Math.round(PROVIDED_TOTALS.fat * 10) / 10,
        }
      : fallbackTotals
  return { ...totalsFromJson, perSection }
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
    const onlyOptionId = Array.isArray(section.options) && section.options.length === 1 ? section.options[0].id : ''
    const optionId = incomingSelections[sectionId]
    if (typeof optionId === 'string' && validBySection.get(sectionId)?.has(optionId)) {
      baseSelections[sectionId] = optionId
    } else if (typeof optionId === 'string' && optionId === '' && !onlyOptionId) {
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

  const nutrition = useMemo(() => calcNutritionTotals(sections), [sections])
  const maxSectionCalories = useMemo(
    () => Math.max(1, ...nutrition.perSection.map((s) => s.calories)),
    [nutrition],
  )
  const macroMax = useMemo(() => Math.max(1, nutrition.protein, nutrition.carbs, nutrition.fat), [nutrition])

  const onToggleDone = (sectionId) => {
    setCompleted((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  return (
    <main className="hub-page">
      <div className="hub-inner meal-plan">
        <header className="hub-header">
          <h1 className="hub-title">Trainer recipes</h1>
          <p className="hub-sub">Single-path plan: follow each section and tick it when completed.</p>
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
          const sectionSelection =
            selections[section.id] || (Array.isArray(section.options) && section.options.length === 1 ? section.options[0].id : '')
          return (
            <section key={section.id} className="hub-card meal-plan-card" aria-label={section.label}>
              <div className="meal-plan-card-head">
                <h2>{section.label}</h2>
                <label className="meal-plan-done">
                  <input
                    type="checkbox"
                    checked={Boolean(completed[section.id])}
                    onChange={() => onToggleDone(section.id)}
                  />
                  <span>Done today</span>
                </label>
              </div>

              <div className="meal-plan-options">
                {section.options
                  .filter((option) => option.id === sectionSelection)
                  .map((option) => (
                    <p key={option.id} className="meal-plan-fixed-option">
                      {option.label}
                    </p>
                  ))}
              </div>
            </section>
          )
        })}

        <section className="hub-card meal-plan-chart-card" aria-label="Estimated daily calories">
          <h2>Estimated daily calories</h2>
          <p className="hub-body">
            Expected total if the full plan is followed: <strong>{nutrition.calories} kcal</strong>.
          </p>
          <div className="meal-plan-bars">
            {nutrition.perSection.map((row) => (
              <div key={row.id} className="meal-plan-bar-row">
                <span className="meal-plan-bar-label">{row.label}</span>
                <div className="meal-plan-bar-track" role="presentation">
                  <div
                    className="meal-plan-bar-fill"
                    style={{ width: `${(row.calories / maxSectionCalories) * 100}%` }}
                  />
                </div>
                <span className="meal-plan-bar-value">{row.calories} kcal</span>
              </div>
            ))}
          </div>
        </section>

        <section className="hub-card meal-plan-chart-card" aria-label="Estimated daily macros">
          <h2>Estimated daily macros</h2>
          <p className="hub-body">
            Protein <strong>{nutrition.protein}g</strong>, carbs <strong>{nutrition.carbs}g</strong>, fat <strong>{nutrition.fat}g</strong>.
          </p>
          <div className="meal-plan-bars">
            {[
              { id: 'protein', label: 'Protein', value: nutrition.protein },
              { id: 'carbs', label: 'Carbs', value: nutrition.carbs },
              { id: 'fat', label: 'Fat', value: nutrition.fat },
            ].map((row) => (
              <div key={row.id} className="meal-plan-bar-row">
                <span className="meal-plan-bar-label">{row.label}</span>
                <div className="meal-plan-bar-track" role="presentation">
                  <div
                    className={`meal-plan-bar-fill meal-plan-bar-fill--${row.id}`}
                    style={{ width: `${(row.value / macroMax) * 100}%` }}
                  />
                </div>
                <span className="meal-plan-bar-value">{row.value} g</span>
              </div>
            ))}
          </div>
        </section>

        <p className="hub-body meal-plan-note">
          Macro/calorie values are estimates based on typical nutrition data for the listed serving sizes.
        </p>
      </div>
    </main>
  )
}

export default MealPlan
