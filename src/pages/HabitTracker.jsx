import React, { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHabitData } from '../context/HabitDataContext'
import { habitCategoryLabel } from '../habits/habitConfig'
import HabitContributionChart from '../components/HabitContributionChart'
import HabitManagerModal from '../components/HabitManagerModal'
import {
  isFutureYmd,
  isTodayYmd,
  startOfWeekMonday,
  weekYmdsFromMonday,
} from '../habits/habitStorage'
import {
  computeBestStreakDays,
  computeCurrentStreakDays,
  mostMissedHabitInWeek,
  weekScore,
} from '../habits/habitStats'
import './HabitTracker.css'
import './HabitMonthSummary.css'

function dayLabel(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-IE', { weekday: 'short' })
}

function shortDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
}

function HabitTracker() {
  const { user } = useAuth()
  const email = user?.email || ''
  const { cells, habits, habitCategories, loading, error, saving, reload, cycleCell, getCell } = useHabitData()
  const [weekOffset, setWeekOffset] = useState(0)
  const [showManager, setShowManager] = useState(false)
  const [activityNow] = useState(() => new Date())

  const now = new Date()
  const anchorDate = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const monday = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate])
  const weekYmds = useMemo(() => weekYmdsFromMonday(monday), [monday])

  const handleCell = useCallback(
    (dateStr, habitId) => {
      if (!email || loading || isFutureYmd(dateStr)) return
      void cycleCell(dateStr, habitId)
    },
    [email, loading, cycleCell]
  )

  const { eligible, done, pct } = useMemo(
    () => weekScore(cells, weekYmds, habits, now),
    [cells, weekYmds, habits, now]
  )
  const bestStreak = useMemo(() => computeBestStreakDays(cells, habits, now), [cells, habits, now])
  const currentStreak = useMemo(() => computeCurrentStreakDays(cells, habits, now), [cells, habits, now])
  const { habit: missedTop, score: missedScore } = useMemo(
    () => mostMissedHabitInWeek(cells, weekYmds, habits, now),
    [cells, weekYmds, habits, now]
  )

  const weekTitle = useMemo(() => {
    const start = weekYmds[0]
    const end = weekYmds[6]
    const [y1, m1, d1] = start.split('-').map(Number)
    const [y2, m2, d2] = end.split('-').map(Number)
    const a = new Date(y1, m1 - 1, d1).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
    })
    const b = new Date(y2, m2 - 1, d2).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${a} – ${b}`
  }, [weekYmds])

  if (loading) {
    return (
      <main className="habit-page">
        <p className="habit-loading" role="status">
          Loading habits…
        </p>
      </main>
    )
  }

  return (
    <main className="habit-page">
      <div className="habit-inner">
        <header className="habit-header">
          <h1 className="habit-title">Habits</h1>
          <p className="habit-sub">
            Week grid below, long-term activity graphs further down — synced via Janus (Firestore)
          </p>
        </header>

        {error && (
          <div className="habit-error" role="alert">
            <span>{error}</span>
            <button type="button" className="habit-error-retry" data-testid="habits-reload-error" onClick={() => reload()}>
              Retry
            </button>
          </div>
        )}

        {saving && <p className="habit-saving">Saving…</p>}

        <section className="habit-motivation" aria-label="Daily quote">
          <p className="habit-quote">
            <span className="habit-quote-mark">&ldquo;</span>
            We are what we repeatedly do. Excellence, then, is not an act, but a habit.
            <span className="habit-quote-mark">&rdquo;</span>
          </p>
          <p className="habit-quote-author">— Aristotle</p>
          {habits.length === 0 && (
            <p className="habit-quote-cta">
              Get started by clicking <strong>⚙️ Manage Habits</strong> below to add your first habit.
            </p>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            type="button"
            className="habit-nav-btn"
            style={{ fontWeight: 'bold' }}
            data-testid="habits-open-manager"
            onClick={() => setShowManager(true)}
          >
            ⚙️ Manage Habits
          </button>
        </div>

        <div className="habit-week-nav">
          <button
            type="button"
            className="habit-nav-btn"
            data-testid="habits-week-prev"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
          >
            ← Prev
          </button>
          <span className="habit-week-label">{weekTitle}</span>
          <button
            type="button"
            className="habit-nav-btn"
            data-testid="habits-week-next"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Next week"
          >
            Next →
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              className="habit-nav-btn habit-nav-today"
              data-testid="habits-week-today"
              onClick={() => setWeekOffset(0)}
            >
              This week
            </button>
          )}
        </div>

        <div className="habit-table-wrap">
          <table className="habit-grid" role="grid" aria-label="Weekly habits">
            <thead>
              <tr>
                <th scope="col" className="habit-col-habit">
                  Habit
                </th>
                {weekYmds.map((ymd) => {
                  const future = isFutureYmd(ymd)
                  const today = isTodayYmd(ymd, now)
                  return (
                    <th
                      key={ymd}
                      scope="col"
                      className={`habit-col-day ${future ? 'is-future' : ''} ${today ? 'is-today' : ''}`}
                    >
                      <span className="habit-day-name">{dayLabel(ymd)}</span>
                      <span className="habit-day-date">{shortDate(ymd)}</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {!habits || habits.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                    No habits defined yet. Click <strong>Manage Habits</strong> to add some!
                  </td>
                </tr>
              ) : habits.map((h) => (
                <tr key={h.id}>
                  <th scope="row" className="habit-row-label">
                    <span className="habit-name">{h.label}</span>
                    <span className="habit-cat habit-cat--custom">
                      {habitCategoryLabel(habitCategories, h.category)}
                    </span>
                  </th>
                  {weekYmds.map((ymd) => {
                    const future = isFutureYmd(ymd)
                    const state = getCell(ymd, h.id)
                    return (
                      <td key={ymd} className={future ? 'is-future' : ''}>
                        <button
                          type="button"
                          className={`habit-cell habit-cell--${state} ${isTodayYmd(ymd, now) ? 'is-today-cell' : ''}`}
                          data-testid={`habit-cell-${ymd}-${h.id}`}
                          disabled={future || !email}
                          onClick={() => handleCell(ymd, h.id)}
                          aria-label={`${h.label} on ${ymd}: ${state}`}
                          title={future ? 'Future day' : 'Tap: empty ↔ done'}
                        >
                          <span className="habit-cell-inner" aria-hidden />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="habit-summary" aria-label="Week summary">
          <div className="habit-summary-grid">
            <div className="habit-stat">
              <span className="habit-stat-label">Week score</span>
              <strong className="habit-stat-value">{pct}%</strong>
            </div>
            <div className="habit-stat">
              <span className="habit-stat-label">Habits done</span>
              <strong className="habit-stat-value">
                {done}/{eligible}
              </strong>
            </div>
            <div className="habit-stat">
              <span className="habit-stat-label">Current streak</span>
              <strong className="habit-stat-value">{currentStreak}d</strong>
            </div>
            <div className="habit-stat">
              <span className="habit-stat-label">Best streak</span>
              <strong className="habit-stat-value">{bestStreak}d</strong>
            </div>
          </div>
          {missedTop && eligible > 0 && missedScore > 0 && (
            <p className="habit-missed-hint">
              Most to watch this week: <strong>{missedTop.label}</strong>
            </p>
          )}
        </section>

        <section className="habit-activity-section" id="activity" aria-label="Activity over time">
          <header className="habit-month-header habit-activity-section-header">
            <h2 className="habit-month-title">Activity</h2>
          </header>

          <p className="habit-month-lead">
            Last <strong>365 days</strong> per habit — same layout as a contribution graph (darker squares are fewer
            completions; greens scale with streak length). Orange is a logged miss.
          </p>

          {habits.length === 0 && (
            <p className="habit-month-empty">
              No habits yet. Add some with <strong>Manage Habits</strong> above, then your graphs will show up here.
            </p>
          )}

          {habits.map((h) => (
            <HabitContributionChart key={h.id} habit={h} cells={cells} now={activityNow} />
          ))}

          <p className="habit-month-note">
            Synced to your account via the Janus API. Past days with no cell are shown as empty (not the same as a miss).
          </p>
        </section>

        <p className="habit-footnote">
          Stored under your user record in Firestore (field <code>habits_v1</code>). Signed in as {email}.
        </p>
      </div>

      {showManager && (
        <HabitManagerModal onClose={() => setShowManager(false)} />
      )}
    </main>
  )
}

export default HabitTracker
