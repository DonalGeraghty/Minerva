import React, { useMemo, useState } from 'react'
import { useHabitData } from '../context/HabitDataContext'
import { habitCategoryLabel } from '../habits/habitConfig'
import './HabitManagerModal.css'

function HabitManagerModal({ onClose }) {
  const {
    habits,
    habitCategories,
    addHabit,
    editHabit,
    deleteHabit,
    addHabitCategory,
    updateHabitCategory,
    deleteHabitCategory,
  } = useHabitData()
  const [editingId, setEditingId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)

  const [formData, setFormData] = useState({
    id: '',
    label: '',
    category: '',
  })
  const [catFormData, setCatFormData] = useState({ label: '' })
  const [newCatLabel, setNewCatLabel] = useState('')
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null)
  const [reassignPick, setReassignPick] = useState('')

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isNew = editingId === 'NEW'

  const defaultCategoryId = useMemo(
    () => (habitCategories.length > 0 ? habitCategories[0].id : ''),
    [habitCategories],
  )

  const handleEdit = (habit) => {
    setFormData({
      id: habit.id,
      label: habit.label,
      category: habit.category || defaultCategoryId,
    })
    setEditingId(habit.id)
    setError('')
  }

  const handleNew = () => {
    setFormData({
      id: '',
      label: '',
      category: defaultCategoryId,
    })
    setEditingId('NEW')
    setError('')
  }

  const handleDelete = async (id) => {
    if (
      confirm(
        'Are you sure you want to delete this habit? All past data for this habit will no longer be visible (but it remains in the database).',
      )
    ) {
      await deleteHabit(id)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const { id, label, category } = formData
    if (!id || !label || !category) {
      setError('ID, display name, and category are required.')
      return
    }

    if (habitCategories.length === 0) {
      setError('Create at least one category before adding habits.')
      return
    }

    if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
      setError('ID must be alphanumeric, underscores, or dashes only (e.g., "morning_run").')
      return
    }

    if (isNew && habits.some((h) => h.id === id)) {
      setError('A habit with this ID already exists.')
      return
    }

    setIsSubmitting(true)
    let ok = false
    if (isNew) {
      ok = await addHabit({ id, label, category })
    } else {
      ok = await editHabit({ id, label, category })
    }
    setIsSubmitting(false)

    if (ok) {
      setEditingId(null)
    } else {
      setError('Failed to save habit to server.')
    }
  }

  const startEditCategory = (cat) => {
    setCatFormData({ label: cat.label })
    setEditingCategoryId(cat.id)
    setError('')
  }

  const submitCategory = async (e) => {
    e.preventDefault()
    setError('')
    const label = catFormData.label.trim()
    if (!label) {
      setError('Category name is required.')
      return
    }
    setIsSubmitting(true)
    const ok = await updateHabitCategory(editingCategoryId, label)
    setIsSubmitting(false)
    if (ok) {
      setEditingCategoryId(null)
      setCatFormData({ label: '' })
    } else {
      setError('Failed to save category.')
    }
  }

  const tryDeleteCategory = (cat) => {
    const inUse = habits.some((h) => h.category === cat.id)
    if (inUse) {
      const others = habitCategories.filter((c) => c.id !== cat.id)
      if (others.length === 0) {
        setError('Create another category first, then you can reassign habits and delete this one.')
        return
      }
      setReassignPick(others[0].id)
      setPendingDeleteCategory({ id: cat.id })
      setError('')
    } else {
      void (async () => {
        const ok = await deleteHabitCategory(cat.id)
        if (!ok) setError('Failed to delete category.')
      })()
    }
  }

  const confirmDeleteCategoryWithReassign = async () => {
    if (!pendingDeleteCategory || !reassignPick) return
    setIsSubmitting(true)
    const ok = await deleteHabitCategory(pendingDeleteCategory.id, reassignPick)
    setIsSubmitting(false)
    if (ok) {
      setPendingDeleteCategory(null)
      setError('')
    } else {
      setError('Failed to delete category (reassign and try again).')
    }
  }

  return (
    <div className="hm-modal-backdrop" onClick={onClose}>
      <div className="hm-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="hm-modal-header">
          <h2>Manage Habits</h2>
          <button type="button" className="hm-btn-close" data-testid="habit-manager-close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="hm-modal-body">
          {pendingDeleteCategory ? (
            <div className="hm-pending-delete">
              <h3 className="hm-section-title">Reassign habits</h3>
              <p className="hm-section-hint">Some habits use this category. Pick another category for them.</p>
              <label className="hm-label">
                <span>Move habits to</span>
                <select
                  className="hm-input"
                  data-testid="habit-manager-reassign-category"
                  value={reassignPick}
                  onChange={(e) => setReassignPick(e.target.value)}
                >
                  {habitCategories
                    .filter((c) => c.id !== pendingDeleteCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </select>
              </label>
              <div className="hm-form-actions">
                <button
                  type="button"
                  className="hm-btn hm-btn-secondary"
                  data-testid="habit-manager-reassign-cancel"
                  onClick={() => setPendingDeleteCategory(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="hm-btn hm-btn-danger"
                  data-testid="habit-manager-reassign-confirm"
                  onClick={() => void confirmDeleteCategoryWithReassign()}
                  disabled={isSubmitting}
                >
                  Delete category
                </button>
              </div>
            </div>
          ) : editingCategoryId ? (
            <form onSubmit={submitCategory} className="hm-form">
              <h3>Edit category</h3>
              {error && <div className="hm-error">{error}</div>}
              <label className="hm-label">
                <span>Name</span>
                <input
                  type="text"
                  className="hm-input"
                  data-testid="habit-manager-category-name"
                  value={catFormData.label}
                  onChange={(e) => setCatFormData({ label: e.target.value })}
                  placeholder="e.g. Health"
                  maxLength={80}
                />
              </label>
              <div className="hm-form-actions">
                <button
                  type="button"
                  className="hm-btn hm-btn-secondary"
                  data-testid="habit-manager-category-edit-cancel"
                  onClick={() => {
                    setEditingCategoryId(null)
                    setError('')
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="hm-btn hm-btn-primary" data-testid="habit-manager-category-save" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : editingId ? (
            <form onSubmit={handleSubmit} className="hm-form">
              <h3>{isNew ? 'Add New Habit' : 'Edit Habit'}</h3>

              {error && <div className="hm-error">{error}</div>}

              <label className="hm-label">
                <span>Unique ID (for tracking)</span>
                <input
                  type="text"
                  className="hm-input"
                  data-testid="habit-manager-habit-id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={!isNew}
                  placeholder="e.g. morning_run"
                />
              </label>

              <label className="hm-label">
                <span>Display Name</span>
                <input
                  type="text"
                  className="hm-input"
                  data-testid="habit-manager-habit-label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. Morning Run"
                />
              </label>

              <label className="hm-label">
                <span>Category</span>
                <select
                  className="hm-input"
                  data-testid="habit-manager-habit-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={habitCategories.length === 0}
                >
                  {habitCategories.length === 0 ? (
                    <option value="">No categories — add one below</option>
                  ) : (
                    habitCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="hm-form-actions">
                <button type="button" className="hm-btn hm-btn-secondary" data-testid="habit-manager-habit-cancel" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
                <button type="submit" className="hm-btn hm-btn-primary" data-testid="habit-manager-habit-save" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Habit'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <section className="hm-section" aria-label="Categories">
                <h3 className="hm-section-title">Categories</h3>
                <p className="hm-section-hint">
                  Habits must belong to a category. Add categories here first, then assign each habit to one.
                </p>
                <div className="hm-inline-add">
                  <input
                    type="text"
                    className="hm-input"
                    data-testid="habit-manager-new-category"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="New category name"
                    maxLength={80}
                    aria-label="New category name"
                  />
                  <button
                    type="button"
                    className="hm-btn hm-btn-primary hm-btn-sm"
                    data-testid="habit-manager-add-category"
                    onClick={async () => {
                      const label = newCatLabel.trim()
                      if (!label) return
                      setError('')
                      const ok = await addHabitCategory(label)
                      if (ok) setNewCatLabel('')
                      else setError('Could not add category.')
                    }}
                  >
                    Add
                  </button>
                </div>
                {habitCategories.length === 0 ? (
                  <p className="hm-section-empty">No categories yet. Add one above.</p>
                ) : (
                  <ul className="hm-cat-list">
                    {habitCategories.map((c) => (
                      <li key={c.id} className="hm-cat-row">
                        <span className="hm-cat-name">{c.label}</span>
                        <div className="hm-item-actions">
                          <button
                            type="button"
                            className="hm-btn hm-btn-secondary hm-btn-sm"
                            data-testid={`habit-manager-category-edit-${c.id}`}
                            onClick={() => startEditCategory(c)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="hm-btn hm-btn-danger hm-btn-sm"
                            data-testid={`habit-manager-category-delete-${c.id}`}
                            onClick={() => tryDeleteCategory(c)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="hm-section hm-section--habits" aria-label="Habits">
                <h3 className="hm-section-title">Habits</h3>
                {error && <div className="hm-error">{error}</div>}
                {!habits || habits.length === 0 ? (
                  <p className="hm-empty">You have no habits defined yet.</p>
                ) : (
                  <div className="hm-list">
                    {habits.map((h) => (
                      <div className="hm-list-item" key={h.id}>
                        <div className="hm-item-info">
                          <strong>{h.label}</strong>{' '}
                          <span className="habit-cat habit-cat--custom">
                            {habitCategoryLabel(habitCategories, h.category)}
                          </span>
                        </div>
                        <div className="hm-item-actions">
                          <button type="button" className="hm-btn hm-btn-secondary hm-btn-sm" data-testid={`habit-manager-habit-edit-${h.id}`} onClick={() => handleEdit(h)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="hm-btn hm-btn-danger hm-btn-sm"
                            data-testid={`habit-manager-habit-delete-${h.id}`}
                            onClick={() => handleDelete(h.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="hm-section-footer">
                  <button type="button" className="hm-btn hm-btn-primary" data-testid="habit-manager-add-habit" onClick={handleNew}>
                    + Add Habit
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HabitManagerModal
