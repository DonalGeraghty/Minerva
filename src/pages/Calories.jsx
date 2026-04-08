import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './HubPage.css'

const DAY_MS = 86400000
const GLASS_ML = 250
const PINT_ML = 568

function formatYmd(date) {
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

function trailingDays(count, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const out = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setTime(end.getTime() - i * DAY_MS)
    out.push(formatYmd(d))
  }
  return out
}

function MetricChart({ title, values, unit }) {
  const width = 560
  const height = 180
  const pad = 20

  const points = useMemo(() => {
    const withValue = values
      .map((v, i) => ({ value: v, idx: i }))
      .filter((x) => typeof x.value === 'number' && Number.isFinite(x.value))
    if (withValue.length === 0) return { pts: [], min: 0, max: 1 }

    const nums = withValue.map((x) => x.value)
    let min = Math.min(...nums)
    let max = Math.max(...nums)
    if (min === max) {
      min = min - 1
      max = max + 1
    }

    const xStep = (width - pad * 2) / Math.max(1, values.length - 1)
    const yScale = (height - pad * 2) / (max - min)

    const pts = withValue.map((x) => {
      const px = pad + x.idx * xStep
      const py = height - pad - (x.value - min) * yScale
      return { x: px, y: py, value: x.value }
    })
    return { pts, min, max }
  }, [values])

  const polyline = points.pts.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <section className="hub-card" aria-label={title}>
      <h2>{title}</h2>
      {points.pts.length === 0 ? (
        <p>No data yet. Start by logging today's value above.</p>
      ) : (
        <div className="hub-chart-wrap">
          <svg
            className="hub-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title} trend`}
          >
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} className="hub-chart-axis" />
            <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="hub-chart-axis" />
            <polyline points={polyline} fill="none" className="hub-chart-line" />
            {points.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.2" className="hub-chart-dot">
                <title>{`${p.value}${unit}`}</title>
              </circle>
            ))}
          </svg>
          <div className="hub-chart-meta">
            <span>{`${Math.round(points.min * 10) / 10}${unit}`}</span>
            <span>{`${Math.round(points.max * 10) / 10}${unit}`}</span>
          </div>
        </div>
      )}
    </section>
  )
}

function Calories() {
  const { user } = useAuth()
  const email = user?.email || ''
  const today = useMemo(() => formatYmd(new Date()), [])
  const [history, setHistory] = useState({})
  const [caloriesInput, setCaloriesInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [waterCustomInput, setWaterCustomInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!email) {
      setHistory({})
      setCaloriesInput('')
      setWeightInput('')
      setWaterCustomInput('')
      return
    }
    const load = async () => {
      try {
        const res = await authFetch(API_ENDPOINTS.USER_NUTRITION, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load nutrition (${res.status})`)
        const next = data.history && typeof data.history === 'object' ? data.history : {}
        setError('')
        setHistory(next)
        const todayRow = next[today] || {}
        setCaloriesInput(
          typeof todayRow.calories === 'number' && Number.isFinite(todayRow.calories)
            ? String(Math.round(todayRow.calories))
            : ''
        )
        setWeightInput(
          typeof todayRow.weight === 'number' && Number.isFinite(todayRow.weight)
            ? String(todayRow.weight)
            : ''
        )
        setWaterCustomInput('')
      } catch (e) {
        setError(e.message || 'Failed to load nutrition data')
        setHistory({})
        setCaloriesInput('')
        setWeightInput('')
        setWaterCustomInput('')
      }
    }
    void load()
  }, [email, today])

  const persistHistory = async (next) => {
    setHistory(next)
    if (!email) return
    const res = await authFetch(API_ENDPOINTS.USER_NUTRITION, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: next }),
    })
    const data = await parseJsonSafe(res)
    if (!res.ok) throw new Error(data.error || `Could not save nutrition (${res.status})`)
    return data.history && typeof data.history === 'object' ? data.history : next
  }

  const updateToday = (patch) => {
    const current = history[today] && typeof history[today] === 'object' ? history[today] : {}
    const row = { ...current, ...patch }
    if (row.calories == null) delete row.calories
    if (row.weight == null) delete row.weight
    if (row.waterMl == null) delete row.waterMl
    const next = { ...history }
    if (Object.keys(row).length === 0) delete next[today]
    else next[today] = row
    void (async () => {
      try {
        setError('')
        const persisted = await persistHistory(next)
        setHistory(persisted)
      } catch (e) {
        setError(e.message || 'Failed to save nutrition data')
      }
    })()
  }

  const dayKeys = useMemo(() => trailingDays(30), [])
  const calorieSeries = useMemo(
    () => dayKeys.map((k) => (typeof history[k]?.calories === 'number' ? history[k].calories : null)),
    [dayKeys, history]
  )
  const weightSeries = useMemo(
    () => dayKeys.map((k) => (typeof history[k]?.weight === 'number' ? history[k].weight : null)),
    [dayKeys, history]
  )
  const waterSeries = useMemo(
    () => dayKeys.map((k) => (typeof history[k]?.waterMl === 'number' ? history[k].waterMl : null)),
    [dayKeys, history]
  )
  const todayWaterMl = typeof history[today]?.waterMl === 'number' ? history[today].waterMl : 0

  const addWater = (mlToAdd) => {
    if (!Number.isFinite(mlToAdd) || mlToAdd <= 0) return
    updateToday({ waterMl: todayWaterMl + Math.round(mlToAdd) })
  }

  return (
    <main className="hub-page">
      <div className="hub-inner">
        <header className="hub-header">
          <h1 className="hub-title">Calorie tracking</h1>
          <p className="hub-sub">
            Track intake, set targets, and keep nutrition progress visible in one place.
          </p>
        </header>

        <p className="hub-body">
          Enter today's totals only for now: calories eaten and body weight. Meal and nutrient breakdown can be added
          later. You can also track water intake in ml.
        </p>
        {error ? <p className="hub-body">{error}</p> : null}

        <section className="hub-card" aria-label="Today inputs">
          <h2>Today ({today})</h2>
          <div className="hub-form-grid">
            <label className="hub-field">
              <span>Calories eaten (total)</span>
              <input
                className="hub-input"
                type="number"
                data-testid="calories-input"
                min="0"
                step="1"
                placeholder="e.g. 2250"
                value={caloriesInput}
                onChange={(e) => {
                  const v = e.target.value
                  setCaloriesInput(v)
                  if (v === '') updateToday({ calories: null })
                  else {
                    const n = Number.parseInt(v, 10)
                    if (Number.isFinite(n) && n >= 0) updateToday({ calories: n })
                  }
                }}
              />
            </label>
            <label className="hub-field">
              <span>Weight</span>
              <input
                className="hub-input"
                type="number"
                data-testid="weight-input"
                min="0"
                step="0.1"
                placeholder="e.g. 78.4"
                value={weightInput}
                onChange={(e) => {
                  const v = e.target.value
                  setWeightInput(v)
                  if (v === '') updateToday({ weight: null })
                  else {
                    const n = Number.parseFloat(v)
                    if (Number.isFinite(n) && n > 0) updateToday({ weight: Math.round(n * 10) / 10 })
                  }
                }}
              />
            </label>
          </div>
        </section>

        <section className="hub-card" aria-label="Water tracking">
          <h2>Water ({today})</h2>
          <div className="hub-form-grid">
            <p className="hub-water-total">
              Today: <strong>{todayWaterMl} ml</strong>
            </p>
            <div className="hub-water-actions">
              <button type="button" className="hub-btn" data-testid="water-add-glass" onClick={() => addWater(GLASS_ML)}>
                +1 glass ({GLASS_ML} ml)
              </button>
              <button type="button" className="hub-btn" data-testid="water-add-pint" onClick={() => addWater(PINT_ML)}>
                +1 pint ({PINT_ML} ml)
              </button>
            </div>
            <div className="hub-water-custom">
              <input
                className="hub-input"
                type="number"
                data-testid="water-custom-ml"
                min="1"
                step="1"
                placeholder="Custom ml amount"
                value={waterCustomInput}
                onChange={(e) => setWaterCustomInput(e.target.value)}
              />
              <button
                type="button"
                className="hub-btn"
                data-testid="water-add-custom"
                onClick={() => {
                  const n = Number.parseInt(waterCustomInput, 10)
                  if (Number.isFinite(n) && n > 0) {
                    addWater(n)
                    setWaterCustomInput('')
                  }
                }}
              >
                Add custom ml
              </button>
            </div>
          </div>
        </section>

        <MetricChart title="Calories trend (last 30 days)" values={calorieSeries} unit=" kcal" />
        <MetricChart title="Weight trend (last 30 days)" values={weightSeries} unit=" kg" />
        <MetricChart title="Water trend (last 30 days)" values={waterSeries} unit=" ml" />
      </div>
    </main>
  )
}

export default Calories
