import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './Achievements.css'

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function Achievements() {
  const { user } = useAuth()
  const email = user?.email || ''

  const [achievements, setAchievements] = useState([])
  const [definitions, setDefinitions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const load = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent)
      if (!email) {
        setAchievements([])
        setDefinitions([])
        setStats({})
        if (!silent) setLoading(false)
        if (!silent) setError('')
        return
      }

      if (!silent) {
        setLoading(true)
        setError('')
      }

      try {
        // Load achievements, definitions, and stats in parallel
        const [achRes, defRes, statsRes] = await Promise.all([
          authFetch(API_ENDPOINTS.USER_ACHIEVEMENTS, { method: 'GET' }),
          authFetch(API_ENDPOINTS.USER_ACHIEVEMENTS_DEFINITIONS, { method: 'GET' }),
          authFetch(API_ENDPOINTS.USER_STATS, { method: 'GET' }),
        ])

        const achData = await parseJsonSafe(achRes)
        const defData = await parseJsonSafe(defRes)
        const statsData = await parseJsonSafe(statsRes)

        if (!achRes.ok) throw new Error(achData.error || `Could not load achievements (${achRes.status})`)
        if (!defRes.ok) throw new Error(defData.error || `Could not load definitions (${defRes.status})`)
        if (!statsRes.ok) throw new Error(statsData.error || `Could not load stats (${statsRes.status})`)

        setAchievements(Array.isArray(achData.achievements) ? achData.achievements : [])
        setDefinitions(Array.isArray(defData.definitions) ? defData.definitions : [])
        setStats(statsData.stats || {})
      } catch (e) {
        if (!silent) {
          setError(e.message || 'Failed to load achievements')
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

  const unlockNew = useCallback(async () => {
    if (!email || unlocking) return

    setUnlocking(true)
    setError('')

    try {
      const res = await authFetch(API_ENDPOINTS.USER_ACHIEVEMENTS_UNLOCK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Unlock failed (${res.status})`)
      
      // Reload to get updated achievements
      await load({ silent: true })
    } catch (e) {
      setError(e.message || 'Failed to unlock achievements')
    } finally {
      setUnlocking(false)
    }
  }, [email, unlocking, load])

  // Group achievements by category
  const achievementsByCategory = useMemo(() => {
    const grouped = {}
    achievements.forEach(ach => {
      const cat = ach.category || 'Other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(ach)
    })
    return grouped
  }, [achievements])

  // Get unlocked achievement IDs for quick lookup
  const unlockedIds = useMemo(() => {
    return new Set(achievements.map(a => a.achievementId))
  }, [achievements])

  // Get progress for each definition
  const getProgress = useCallback((definition) => {
    const achType = definition.type
    const target = definition.target
    
    switch (achType) {
      case 'habit_streak':
        return Math.min((stats.currentStreak || 0) / target, 1)
      case 'total_completions':
        return Math.min((stats.totalCompletions || 0) / target, 1)
      case 'todos_completed':
        // Use total completions as proxy
        return Math.min((stats.totalCompletions || 0) / target, 1)
      case 'goals_completed':
        return Math.min((stats.goalsCompleted || 0) / target, 1)
      case 'perfect_streak':
        return Math.min((stats.currentStreak || 0) / target, 1)
      default:
        return 0
    }
  }, [stats])

  // Sort definitions by category and target
  const sortedDefinitions = useMemo(() => {
    return [...definitions].sort((a, b) => {
      // Sort by category first
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      // Then by target
      return (a.target || 0) - (b.target || 0)
    })
  }, [definitions])

  if (loading) {
    return (
      <main className="achievements-page">
        <div className="achievements-inner">
          <p className="achievements-loading" role="status">
            Loading your achievements…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="achievements-page">
      <div className="achievements-inner">
        <header className="achievements-header">
          <h1 className="achievements-title">Achievements</h1>
          <p className="achievements-sub">
            Earn badges by completing habits, goals, and other milestones.
          </p>
        </header>

        {error && (
          <div className="achievements-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Stats Summary */}
        <section className="achievements-stats" aria-label="Your statistics">
          <div className="achievements-stat-card">
            <span className="achievements-stat-value">{stats.totalHabits || 0}</span>
            <span className="achievements-stat-label">Total Habits</span>
          </div>
          <div className="achievements-stat-card">
            <span className="achievements-stat-value">{stats.totalCompletions || 0}</span>
            <span className="achievements-stat-label">Completions</span>
          </div>
          <div className="achievements-stat-card">
            <span className="achievements-stat-value">{stats.currentStreak || 0}</span>
            <span className="achievements-stat-label">Current Streak</span>
          </div>
          <div className="achievements-stat-card">
            <span className="achievements-stat-value">{stats.longestStreak || 0}</span>
            <span className="achievements-stat-label">Longest Streak</span>
          </div>
          <div className="achievements-stat-card">
            <span className="achievements-stat-value">{achievements.length}</span>
            <span className="achievements-stat-label">Achievements Unlocked</span>
          </div>
        </section>

        {/* Check for New Achievements */}
        <section className="achievements-check-section">
          <button
            type="button"
            className="achievements-check-btn"
            onClick={void unlockNew}
            disabled={unlocking}
            data-testid="achievements-check-btn"
          >
            {unlocking ? 'Checking…' : 'Check for New Achievements'}
          </button>
          <p className="achievements-check-hint">
            Click to see if you've earned any new badges based on your recent activity.
          </p>
        </section>

        {/* Unlocked Achievements */}
        {achievements.length > 0 && (
          <section className="achievements-section" aria-label="Unlocked achievements">
            <h2 className="achievements-section-title">Your Achievements</h2>
            
            <div className="achievements-categories">
              {Object.entries(achievementsByCategory).map(([categoryName, categoryAchs]) => (
                <div key={categoryName} className="achievements-category-group">
                  <h3 className="achievements-category-title">{categoryName}</h3>
                  <div className="achievements-category-grid">
                    {categoryAchs.map((ach) => (
                      <div
                        key={ach.achievementId}
                        className="achievements-badge achievements-badge--unlocked"
                        title={`${ach.title}: ${ach.description}`}
                      >
                        <span className="achievements-badge-icon">{ach.icon || '🏅'}</span>
                        <span className="achievements-badge-title">{ach.title}</span>
                        <span className="achievements-badge-description">{ach.description}</span>
                        <span className="achievements-badge-date">
                          Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Achievements (Locked) */}
        <section className="achievements-section" aria-label="Available achievements">
          <h2 className="achievements-section-title">Available Achievements</h2>
          <p className="achievements-section-sub">
            Keep using Minerva to unlock these badges!
          </p>
          
          <div className="achievements-definitions-grid">
            {sortedDefinitions.map((def) => {
              const isUnlocked = unlockedIds.has(def.id)
              const progress = getProgress(def)
              
              return (
                <div
                  key={def.id}
                  className={`achievements-definition-card ${isUnlocked ? 'achievements-definition-card--unlocked' : ''}`}
                >
                  <div className="achievements-definition-header">
                    <span className="achievements-definition-icon">{def.icon || '🏅'}</span>
                    <span className="achievements-definition-title">{def.title}</span>
                  </div>
                  <p className="achievements-definition-description">{def.description}</p>
                  <p className="achievements-definition-type">
                    {def.category} • Target: {def.target}
                  </p>
                  
                  {!isUnlocked && (
                    <div className="achievements-definition-progress">
                      <div
                        className="achievements-definition-progress-bar"
                        style={{ width: `${progress * 100}%` }}
                      />
                      <span className="achievements-definition-progress-text">
                        {Math.round(progress * 100)}% to unlock
                      </span>
                    </div>
                  )}
                  
                  {isUnlocked && (
                    <span className="achievements-definition-status">✓ Unlocked</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <p className="achievements-footnote">
          Signed in as <code>{email}</code>
        </p>
      </div>
    </main>
  )
}

export default Achievements
