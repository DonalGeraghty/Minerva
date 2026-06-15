import React, { useEffect, useMemo, useRef, useState } from 'react'
import './HubPage.css'
import './Pomodoro.css'

const STORAGE_KEY = 'minerva_pomodoro_settings_v1'

const MODES = {
  focus: { label: 'Focus', next: 'shortBreak' },
  shortBreak: { label: 'Short break', next: 'focus' },
  longBreak: { label: 'Long break', next: 'focus' },
}

const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakEvery: 4,
  autoStartNext: false,
}

function clampMinutes(value, fallback) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(180, Math.max(1, n))
}

function clampLongBreakEvery(value, fallback) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(12, Math.max(2, n))
}

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      focus: clampMinutes(raw.focus, DEFAULT_SETTINGS.focus),
      shortBreak: clampMinutes(raw.shortBreak, DEFAULT_SETTINGS.shortBreak),
      longBreak: clampMinutes(raw.longBreak, DEFAULT_SETTINGS.longBreak),
      longBreakEvery: clampLongBreakEvery(raw.longBreakEvery, DEFAULT_SETTINGS.longBreakEvery),
      autoStartNext: Boolean(raw.autoStartNext),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function modeDurationSeconds(settings, mode) {
  return settings[mode] * 60
}

function getNextMode(mode, completedFocuses, settings) {
  if (mode !== 'focus') return 'focus'
  const nextFocusCount = completedFocuses + 1
  return nextFocusCount % settings.longBreakEvery === 0 ? 'longBreak' : 'shortBreak'
}

function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.5)
  } catch {
    /* ignore */
  }
}

function Pomodoro() {
  const [settings, setSettings] = useState(loadSettings)
  const [mode, setMode] = useState('focus')
  const [remaining, setRemaining] = useState(() => modeDurationSeconds(loadSettings(), 'focus'))
  const [isRunning, setIsRunning] = useState(false)
  const [completedFocuses, setCompletedFocuses] = useState(0)
  const deadlineRef = useRef(null)

  const totalSeconds = modeDurationSeconds(settings, mode)
  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0
  const progressDegrees = Math.max(0, Math.min(360, progress * 360))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  useEffect(() => {
    if (!isRunning) {
      document.title = 'Minerva'
      return
    }
    document.title = `${formatTime(remaining)} - ${MODES[mode].label}`
    return () => {
      document.title = 'Minerva'
    }
  }, [isRunning, mode, remaining])

  const moveToMode = (nextMode, shouldRun = false) => {
    setMode(nextMode)
    setRemaining(modeDurationSeconds(settings, nextMode))
    setIsRunning(shouldRun)
    deadlineRef.current = shouldRun ? Date.now() + modeDurationSeconds(settings, nextMode) * 1000 : null
  }

  const finishCurrentMode = () => {
    playChime()
    setCompletedFocuses((count) => {
      const nextCount = mode === 'focus' ? count + 1 : count
      const nextMode = getNextMode(mode, count, settings)
      moveToMode(nextMode, settings.autoStartNext)
      return nextCount
    })
  }

  useEffect(() => {
    if (!isRunning) return undefined
    if (!deadlineRef.current) {
      deadlineRef.current = Date.now() + remaining * 1000
    }

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setRemaining(nextRemaining)
      if (nextRemaining <= 0) {
        finishCurrentMode()
      }
    }

    const id = window.setInterval(tick, 250)
    tick()
    return () => window.clearInterval(id)
  }, [isRunning, remaining, mode, settings])

  const start = () => {
    deadlineRef.current = Date.now() + remaining * 1000
    setIsRunning(true)
  }

  const pause = () => {
    deadlineRef.current = null
    setIsRunning(false)
  }

  const reset = () => {
    deadlineRef.current = null
    setIsRunning(false)
    setRemaining(modeDurationSeconds(settings, mode))
  }

  const skip = () => {
    deadlineRef.current = null
    finishCurrentMode()
  }

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [key]: key === 'longBreakEvery'
          ? clampLongBreakEvery(value, prev[key])
          : clampMinutes(value, prev[key]),
      }
      if (!isRunning && key === mode) {
        setRemaining(modeDurationSeconds(next, mode))
      }
      return next
    })
  }

  const modeButtons = useMemo(() => Object.keys(MODES), [])

  return (
    <main className="hub-page pomodoro-page">
      <div className="hub-inner">
        <header className="hub-header">
          <h1 className="hub-title">Pomodoro timer</h1>
          <p className="hub-sub">Time-box focus, take deliberate breaks, and keep the next session visible.</p>
        </header>

        <section className="pomodoro-shell" aria-label="Pomodoro timer">
          <div className="pomodoro-mode-tabs" role="tablist" aria-label="Timer mode">
            {modeButtons.map((key) => (
              <button
                key={key}
                type="button"
                className={`pomodoro-mode-btn ${mode === key ? 'is-active' : ''}`}
                onClick={() => {
                  deadlineRef.current = null
                  setIsRunning(false)
                  moveToMode(key, false)
                }}
                aria-selected={mode === key}
              >
                {MODES[key].label}
              </button>
            ))}
          </div>

          <div
            className="pomodoro-ring"
            style={{ '--pomodoro-progress': `${progressDegrees}deg` }}
            aria-label={`${MODES[mode].label} timer ${formatTime(remaining)} remaining`}
          >
            <div className="pomodoro-ring-inner">
              <span className="pomodoro-mode-label">{MODES[mode].label}</span>
              <span className="pomodoro-time">{formatTime(remaining)}</span>
              <span className="pomodoro-status">{isRunning ? 'Running' : 'Ready'}</span>
            </div>
          </div>

          <div className="pomodoro-actions">
            {isRunning ? (
              <button type="button" className="pomodoro-primary-btn" onClick={pause}>
                Pause
              </button>
            ) : (
              <button type="button" className="pomodoro-primary-btn" onClick={start}>
                Start
              </button>
            )}
            <button type="button" className="hub-btn" onClick={reset}>
              Reset
            </button>
            <button type="button" className="hub-btn" onClick={skip}>
              Skip
            </button>
          </div>

          <div className="pomodoro-stats" aria-label="Session summary">
            <div>
              <span className="pomodoro-stat-value">{completedFocuses}</span>
              <span className="pomodoro-stat-label">focus sessions</span>
            </div>
            <div>
              <span className="pomodoro-stat-value">{settings.longBreakEvery}</span>
              <span className="pomodoro-stat-label">until long break</span>
            </div>
          </div>
        </section>

        <section className="hub-card" aria-label="Timer settings">
          <h2>Settings</h2>
          <div className="pomodoro-settings-grid">
            <label className="hub-field">
              <span>Focus minutes</span>
              <input
                className="hub-input"
                type="number"
                min="1"
                max="180"
                value={settings.focus}
                onChange={(e) => updateSetting('focus', e.target.value)}
              />
            </label>
            <label className="hub-field">
              <span>Short break minutes</span>
              <input
                className="hub-input"
                type="number"
                min="1"
                max="180"
                value={settings.shortBreak}
                onChange={(e) => updateSetting('shortBreak', e.target.value)}
              />
            </label>
            <label className="hub-field">
              <span>Long break minutes</span>
              <input
                className="hub-input"
                type="number"
                min="1"
                max="180"
                value={settings.longBreak}
                onChange={(e) => updateSetting('longBreak', e.target.value)}
              />
            </label>
            <label className="hub-field">
              <span>Long break every</span>
              <input
                className="hub-input"
                type="number"
                min="2"
                max="12"
                value={settings.longBreakEvery}
                onChange={(e) => updateSetting('longBreakEvery', e.target.value)}
              />
            </label>
          </div>
          <label className="pomodoro-toggle">
            <input
              type="checkbox"
              checked={settings.autoStartNext}
              onChange={(e) => setSettings((prev) => ({ ...prev, autoStartNext: e.target.checked }))}
            />
            <span>Auto-start the next timer</span>
          </label>
        </section>
      </div>
    </main>
  )
}

export default Pomodoro
