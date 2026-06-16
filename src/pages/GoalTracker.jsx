import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './GoalTracker.css'

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function GoalTracker() {
  const { user } = useAuth()
  const email = user?.email || ''

  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [incrementingId, setIncrementingId] = useState(null)

  // Form state for new goal
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('')

  // Form state for editing
  const [editGoalId, setEditGoalId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const load = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent)
      if (!email) {
        setGoals([])
        if (!silent) setLoading(false)
        if (!silent) setError('')
        return
      }

      if (!silent) {
        setLoading(true)
        setError('')
      }

      try {
        const res = await authFetch(API_ENDPOINTS.USER_GOALS, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load goals (${res.status})`)
        setGoals(Array.isArray(data.goals) ? data.goals : [])
      } catch (e) {
        if (!silent) {
          setError(e.message || 'Failed to load goals')
          setGoals([])
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

  const addGoal = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || adding) return

    setAdding(true)
    setError('')

    try {
      const body = {
        title: trimmedTitle,
        description: description.trim(),
        target: target ? parseFloat(target) : null,
        unit: unit.trim(),
        deadline: deadline.trim(),
        category: category.trim(),
      }
      
      const res = await authFetch(API_ENDPOINTS.USER_GOALS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Add failed (${res.status})`)
      if (Array.isArray(data.goals)) setGoals(data.goals)
      
      // Reset form
      setTitle('')
      setDescription('')
      setTarget('')
      setUnit('')
      setDeadline('')
      setCategory('')
    } catch (e) {
      setError(e.message || 'Add failed')
    } finally {
      setAdding(false)
    }
  }, [adding, title, description, target, unit, deadline, category])

  const updateGoal = useCallback(async () => {
    if (!editGoalId || !editTitle.trim() || updatingId) return

    setUpdatingId(editGoalId)
    setError('')

    try {
      const body = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        target: editTarget ? parseFloat(editTarget) : null,
        unit: editUnit.trim(),
        deadline: editDeadline.trim(),
        category: editCategory.trim(),
      }
      
      const res = await authFetch(`${API_ENDPOINTS.USER_GOALS}/${editGoalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`)
      if (Array.isArray(data.goals)) setGoals(data.goals)
      
      // Reset edit form
      cancelEdit()
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }, [editGoalId, editTitle, editDescription, editTarget, editUnit, editDeadline, editCategory, updatingId])

  const incrementGoal = useCallback(async (goalId, amount = 1) => {
    if (!goalId || incrementingId) return
    
    setIncrementingId(goalId)
    setError('')

    try {
      const res = await authFetch(`${API_ENDPOINTS.USER_GOALS}/${goalId}/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Increment failed (${res.status})`)
      if (Array.isArray(data.goals)) setGoals(data.goals)
    } catch (e) {
      setError(e.message || 'Increment failed')
    } finally {
      setIncrementingId(null)
    }
  }, [incrementingId])

  const deleteGoal = useCallback(
    async (goalId) => {
      if (!goalId || deletingId) return
      setError('')
      setDeletingId(goalId)

      try {
        const res = await authFetch(`${API_ENDPOINTS.USER_GOALS}/${goalId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`)
        if (Array.isArray(data.goals)) setGoals(data.goals)
      } catch (e) {
        setError(e.message || 'Delete failed')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId]
  )

  const startEdit = useCallback((goal) => {
    setEditGoalId(goal.id)
    setEditTitle(goal.title)
    setEditDescription(goal.description || '')
    setEditTarget(goal.target ? String(goal.target) : '')
    setEditUnit(goal.unit || '')
    setEditDeadline(goal.deadline || '')
    setEditCategory(goal.category || '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditGoalId(null)
    setEditTitle('')
    setEditDescription('')
    setEditTarget('')
    setEditUnit('')
    setEditDeadline('')
    setEditCategory('')
  }, [])

  const toggleComplete = useCallback(async (goal) => {
    if (!goal || updatingId) return
    
    setUpdatingId(goal.id)
    setError('')

    try {
      const res = await authFetch(`${API_ENDPOINTS.USER_GOALS}/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !goal.completed }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Toggle failed (${res.status})`)
      if (Array.isArray(data.goals)) setGoals(data.goals)
    } catch (e) {
      setError(e.message || 'Toggle failed')
    } finally {
      setUpdatingId(null)
    }
  }, [updatingId])

  const canAdd = useMemo(() => title.trim().length > 0 && !adding, [title, adding])
  const canEdit = useMemo(() => editGoalId && editTitle.trim().length > 0 && !updatingId, [editGoalId, editTitle, updatingId])

  // Calculate progress percentage for display
  const getProgressPercentage = useCallback((goal) => {
    if (goal.target && goal.target > 0) {
      const current = goal.current || 0
      return Math.min((current / goal.target) * 100, 100)
    }
    return 0
  }, [])

  // Format deadline for display
  const formatDeadline = useCallback((deadlineStr) => {
    if (!deadlineStr) return ''
    try {
      const date = new Date(deadlineStr)
      return date.toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return deadlineStr
    }
  }, [])

  // Group goals by category
  const goalsByCategory = useMemo(() => {
    const grouped = {}
    goals.forEach(goal => {
      const cat = goal.category || 'Uncategorized'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(goal)
    })
    return grouped
  }, [goals])

  // Calculate overall stats
  const stats = useMemo(() => {
    const total = goals.length
    const completed = goals.filter(g => g.completed).length
    const inProgress = goals.filter(g => !g.completed && (g.current || 0) > 0).length
    const notStarted = goals.filter(g => !g.completed && (g.current || 0) === 0).length
    return { total, completed, inProgress, notStarted }
  }, [goals])

  if (loading) {
    return (
      <main className="goal-page">
        <div className="goal-inner">
          <p className="goal-loading" role="status">
            Loading your goals…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="goal-page">
      <div className="goal-inner">
        <header className="goal-header">
          <h1 className="goal-title">Goal Tracker</h1>
          <p className="goal-sub">
            Track your progress toward long-term objectives. Goals with targets show progress bars.
          </p>
        </header>

        {error && (
          <div className="goal-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Stats Summary */}
        <section className="goal-stats" aria-label="Goal statistics">
          <div className="goal-stat-card">
            <span className="goal-stat-value">{stats.total}</span>
            <span className="goal-stat-label">Total Goals</span>
          </div>
          <div className="goal-stat-card">
            <span className="goal-stat-value goal-stat-value--completed">{stats.completed}</span>
            <span className="goal-stat-label">Completed</span>
          </div>
          <div className="goal-stat-card">
            <span className="goal-stat-value goal-stat-value--in-progress">{stats.inProgress}</span>
            <span className="goal-stat-label">In Progress</span>
          </div>
          <div className="goal-stat-card">
            <span className="goal-stat-value goal-stat-value--not-started">{stats.notStarted}</span>
            <span className="goal-stat-label">Not Started</span>
          </div>
        </section>

        {/* Add Goal Form */}
        <form
          className="goal-add-form"
          onSubmit={(e) => {
            e.preventDefault()
            void addGoal()
          }}
          aria-label="Add new goal"
        >
          <h2 className="goal-add-title">Add New Goal</h2>
          
          <div className="goal-form-grid">
            <div className="goal-form-group">
              <label className="goal-form-label" htmlFor="goal-title">
                Title *
              </label>
              <input
                id="goal-title"
                className="goal-form-input"
                type="text"
                data-testid="goals-new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Read 12 books"
                maxLength={120}
                aria-label="Goal title"
                disabled={adding}
                required
              />
            </div>

            <div className="goal-form-group">
              <label className="goal-form-label" htmlFor="goal-description">
                Description
              </label>
              <textarea
                id="goal-description"
                className="goal-form-input goal-form-input--textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about this goal"
                maxLength={500}
                aria-label="Goal description"
                disabled={adding}
                rows={2}
              />
            </div>

            <div className="goal-form-group">
              <label className="goal-form-label" htmlFor="goal-target">
                Target
              </label>
              <input
                id="goal-target"
                className="goal-form-input"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g., 12"
                min="0"
                step="any"
                aria-label="Goal target"
                disabled={adding}
              />
            </div>

            <div className="goal-form-group">
              <label className="goal-form-label" htmlFor="goal-unit">
                Unit
              </label>
              <input
                id="goal-unit"
                className="goal-form-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., books, hours, kg"
                maxLength={20}
                aria-label="Goal unit"
                disabled={adding}
              />
            </div>

            <div className="goal-form-group">
              <label className="goal-form-label" htmlFor="goal-deadline">
                Deadline
              </label>
              <input
                id="goal-deadline"
                className="goal-form-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                aria-label="Goal deadline"
                disabled={adding}
              />
            </div>

            <div className="goal-form-group">
              <label className="goal-form-label" htmlFor="goal-category">
                Category
              </label>
              <input
                id="goal-category"
                className="goal-form-input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Personal, Work, Health"
                maxLength={40}
                aria-label="Goal category"
                disabled={adding}
              />
            </div>
          </div>

          <button
            type="submit"
            className="goal-add-btn"
            data-testid="goals-add-submit"
            disabled={!canAdd}
          >
            {adding ? 'Adding…' : 'Add Goal'}
          </button>
        </form>

        {/* Goals List */}
        <section className="goal-list-section" aria-label="Your goals">
          <h2 className="goal-list-title">Your Goals</h2>
          
          {goals.length === 0 ? (
            <div className="goal-empty">
              <p>No goals yet. Add one above to start tracking your progress.</p>
            </div>
          ) : (
            <div className="goal-categories">
              {Object.entries(goalsByCategory).map(([categoryName, categoryGoals]) => (
                <div key={categoryName} className="goal-category-group">
                  <h3 className="goal-category-title">{categoryName}</h3>
                  <div className="goal-category-goals">
                    {categoryGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className={`goal-card ${goal.completed ? 'goal-card--completed' : ''}`}
                        data-testid={`goal-${goal.id}`}
                      >
                        <div className="goal-card-header">
                          <h4 className="goal-card-title">{goal.title}</h4>
                          {goal.deadline && (
                            <span className="goal-card-deadline">
                              Due: {formatDeadline(goal.deadline)}
                            </span>
                          )}
                        </div>

                        {goal.description && (
                          <p className="goal-card-description">{goal.description}</p>
                        )}

                        {/* Progress Bar */}
                        {goal.target && goal.target > 0 && (
                          <div className="goal-card-progress">
                            <div
                              className="goal-card-progress-bar"
                              style={{ width: `${getProgressPercentage(goal)}%` }}
                              aria-label={`Progress: ${Math.round(getProgressPercentage(goal))}%`}
                            />
                            <span className="goal-card-progress-text">
                              {goal.current || 0} / {goal.target} {goal.unit && goal.unit}
                            </span>
                          </div>
                        )}

                        {/* Current value (for non-target goals) */}
                        {!goal.target && goal.current && goal.current > 0 && (
                          <p className="goal-card-current">
                            Progress: {goal.current} {goal.unit && goal.unit}
                          </p>
                        )}

                        <div className="goal-card-actions">
                          {!goal.completed && (
                            <>
                              <button
                                type="button"
                                className="goal-card-btn goal-card-btn--increment"
                                onClick={() => void incrementGoal(goal.id, 1)}
                                disabled={incrementingId === goal.id}
                                aria-label={`Increment ${goal.title} progress`}
                                title="Increment progress"
                              >
                                +1
                              </button>
                              {goal.target && goal.target > 0 && (
                                <button
                                  type="button"
                                  className="goal-card-btn goal-card-btn--increment"
                                  onClick={() => void incrementGoal(goal.id, 0.5)}
                                  disabled={incrementingId === goal.id}
                                  aria-label={`Increment ${goal.title} by 0.5`}
                                  title="Increment by 0.5"
                                >
                                  +0.5
                                </button>
                              )}
                            </>
                          )}
                          
                          <button
                            type="button"
                            className={`goal-card-btn ${goal.completed ? 'goal-card-btn--completed' : 'goal-card-btn--complete'}`}
                            onClick={() => void toggleComplete(goal)}
                            disabled={updatingId === goal.id}
                            aria-label={goal.completed ? `Mark ${goal.title} as incomplete` : `Mark ${goal.title} as completed`}
                            title={goal.completed ? 'Mark as incomplete' : 'Mark as completed'}
                          >
                            {goal.completed ? '✓' : ''}
                          </button>
                          
                          <button
                            type="button"
                            className="goal-card-btn goal-card-btn--edit"
                            onClick={() => startEdit(goal)}
                            disabled={updatingId === goal.id || deletingId === goal.id}
                            aria-label={`Edit ${goal.title}`}
                            title="Edit goal"
                          >
                            Edit
                          </button>
                          
                          <button
                            type="button"
                            className="goal-card-btn goal-card-btn--delete"
                            onClick={() => void deleteGoal(goal.id)}
                            disabled={deletingId === goal.id || updatingId === goal.id}
                            aria-label={`Delete ${goal.title}`}
                            title="Delete goal"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Edit Form (inline) */}
                        {editGoalId === goal.id && (
                          <form
                            className="goal-edit-form"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void updateGoal()
                            }}
                          >
                            <div className="goal-edit-grid">
                              <input
                                className="goal-edit-input"
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Title"
                                maxLength={120}
                                disabled={updatingId === goal.id}
                              />
                              <input
                                className="goal-edit-input"
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description"
                                maxLength={500}
                                disabled={updatingId === goal.id}
                              />
                              <input
                                className="goal-edit-input"
                                type="number"
                                value={editTarget}
                                onChange={(e) => setEditTarget(e.target.value)}
                                placeholder="Target"
                                min="0"
                                step="any"
                                disabled={updatingId === goal.id}
                              />
                              <input
                                className="goal-edit-input"
                                type="text"
                                value={editUnit}
                                onChange={(e) => setEditUnit(e.target.value)}
                                placeholder="Unit"
                                maxLength={20}
                                disabled={updatingId === goal.id}
                              />
                              <input
                                className="goal-edit-input"
                                type="date"
                                value={editDeadline}
                                onChange={(e) => setEditDeadline(e.target.value)}
                                placeholder="Deadline"
                                disabled={updatingId === goal.id}
                              />
                              <input
                                className="goal-edit-input"
                                type="text"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                placeholder="Category"
                                maxLength={40}
                                disabled={updatingId === goal.id}
                              />
                            </div>
                            <div className="goal-edit-actions">
                              <button
                                type="submit"
                                className="goal-edit-btn goal-edit-btn--save"
                                disabled={!canEdit}
                              >
                                {updatingId === goal.id ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="goal-edit-btn goal-edit-btn--cancel"
                                onClick={cancelEdit}
                                disabled={updatingId === goal.id}
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

        <p className="goal-footnote">
          Signed in as <code>{email}</code>
        </p>
      </div>
    </main>
  )
}

export default GoalTracker
