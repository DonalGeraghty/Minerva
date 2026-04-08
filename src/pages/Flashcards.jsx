import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './Flashcards.css'

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function Flashcards() {
  const { user } = useAuth()
  const email = user?.email || ''

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)
  const [savingCard, setSavingCard] = useState(false)
  const [savingManage, setSavingManage] = useState(false)
  const [studyCards, setStudyCards] = useState([])
  const [studyIndex, setStudyIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [editingCardId, setEditingCardId] = useState('')
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')

  const loadGroups = useCallback(async () => {
    if (!email) {
      setGroups([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await authFetch(API_ENDPOINTS.USER_FLASHCARDS, { method: 'GET' })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Could not load flashcards (${res.status})`)
      const nextGroups = Array.isArray(data.groups) ? data.groups : []
      setGroups(nextGroups)
      if (nextGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(nextGroups[0].id)
      }
    } catch (e) {
      setError(e.message || 'Failed to load flashcards')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [email, selectedGroupId])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, selectedGroupId])

  const addGroup = useCallback(async () => {
    const trimmed = groupName.trim()
    if (!trimmed || savingGroup) return

    setSavingGroup(true)
    setError('')
    try {
      const res = await authFetch(API_ENDPOINTS.USER_FLASHCARD_GROUPS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Could not add group (${res.status})`)
      const nextGroups = Array.isArray(data.groups) ? data.groups : []
      setGroups(nextGroups)
      if (nextGroups.length > 0) {
        setSelectedGroupId(nextGroups[nextGroups.length - 1].id)
      }
      setGroupName('')
    } catch (e) {
      setError(e.message || 'Failed to add group')
    } finally {
      setSavingGroup(false)
    }
  }, [groupName, savingGroup])

  const addCard = useCallback(async () => {
    const trimmedFront = front.trim()
    const trimmedBack = back.trim()
    if (!selectedGroupId || !trimmedFront || !trimmedBack || savingCard) return

    setSavingCard(true)
    setError('')
    try {
      const res = await authFetch(API_ENDPOINTS.USER_FLASHCARD_CARDS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          front: trimmedFront,
          back: trimmedBack,
        }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Could not add flashcard (${res.status})`)
      if (Array.isArray(data.groups)) setGroups(data.groups)
      setFront('')
      setBack('')
    } catch (e) {
      setError(e.message || 'Failed to add card')
    } finally {
      setSavingCard(false)
    }
  }, [selectedGroupId, front, back, savingCard])

  const saveGroups = useCallback(async (nextGroups) => {
    const res = await authFetch(API_ENDPOINTS.USER_FLASHCARDS, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups: nextGroups }),
    })
    const data = await parseJsonSafe(res)
    if (!res.ok) throw new Error(data.error || `Could not save flashcards (${res.status})`)
    return Array.isArray(data.groups) ? data.groups : []
  }, [])

  const beginEditCard = useCallback((card) => {
    setEditingCardId(card.id)
    setEditFront(card.front || '')
    setEditBack(card.back || '')
  }, [])

  const cancelEditCard = useCallback(() => {
    setEditingCardId('')
    setEditFront('')
    setEditBack('')
  }, [])

  const updateCard = useCallback(async () => {
    if (!selectedGroupId || !editingCardId || savingManage) return
    const trimmedFront = editFront.trim()
    const trimmedBack = editBack.trim()
    if (!trimmedFront || !trimmedBack) return

    setSavingManage(true)
    setError('')
    try {
      const nextGroups = groups.map((group) => {
        if (group.id !== selectedGroupId) return group
        return {
          ...group,
          cards: (group.cards || []).map((card) => (
            card.id === editingCardId ? { ...card, front: trimmedFront, back: trimmedBack } : card
          )),
        }
      })
      const persisted = await saveGroups(nextGroups)
      setGroups(persisted)
      cancelEditCard()
    } catch (e) {
      setError(e.message || 'Failed to update card')
    } finally {
      setSavingManage(false)
    }
  }, [selectedGroupId, editingCardId, savingManage, editFront, editBack, groups, saveGroups, cancelEditCard])

  const deleteCard = useCallback(async (cardId) => {
    if (!selectedGroupId || !cardId || savingManage) return

    setSavingManage(true)
    setError('')
    try {
      const nextGroups = groups.map((group) => {
        if (group.id !== selectedGroupId) return group
        return {
          ...group,
          cards: (group.cards || []).filter((card) => card.id !== cardId),
        }
      })
      const persisted = await saveGroups(nextGroups)
      setGroups(persisted)
      if (editingCardId === cardId) cancelEditCard()
    } catch (e) {
      setError(e.message || 'Failed to delete card')
    } finally {
      setSavingManage(false)
    }
  }, [selectedGroupId, savingManage, groups, saveGroups, editingCardId, cancelEditCard])

  const deleteGroup = useCallback(async () => {
    if (!selectedGroupId || savingManage) return
    const targetGroup = groups.find((g) => g.id === selectedGroupId)
    if (!targetGroup) return

    const confirmed = window.confirm(`Delete group "${targetGroup.name}" and all its cards?`)
    if (!confirmed) return

    setSavingManage(true)
    setError('')
    try {
      const nextGroups = groups.filter((group) => group.id !== selectedGroupId)
      const persisted = await saveGroups(nextGroups)
      setGroups(persisted)
      cancelEditCard()
      if (persisted.length > 0) {
        setSelectedGroupId(persisted[0].id)
      } else {
        setSelectedGroupId('')
      }
    } catch (e) {
      setError(e.message || 'Failed to delete group')
    } finally {
      setSavingManage(false)
    }
  }, [selectedGroupId, savingManage, groups, saveGroups, cancelEditCard])

  const loadStudyCards = useCallback(
    async (groupId = '') => {
      setError('')
      try {
        const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''
        const res = await authFetch(`${API_ENDPOINTS.USER_FLASHCARD_STUDY}${query}`, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load study cards (${res.status})`)
        const cards = Array.isArray(data.cards) ? data.cards : []
        setStudyCards(cards)
        setStudyIndex(0)
        setShowBack(false)
      } catch (e) {
        setError(e.message || 'Failed to load study cards')
        setStudyCards([])
      }
    },
    []
  )

  const currentCard = studyCards[studyIndex] || null
  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) || null, [groups, selectedGroupId])
  const groupCardCount = selectedGroup?.cards?.length || 0

  if (loading) {
    return (
      <main className="flashcards-page">
        <div className="flashcards-inner">
          <p className="flashcards-loading" role="status">
            Loading your flashcards…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flashcards-page">
      <div className="flashcards-inner">
        <header className="flashcards-header">
          <h1 className="flashcards-title">Flashcards</h1>
          <p className="flashcards-sub">Create groups, add cards, then study in randomized order.</p>
        </header>

        {error && (
          <div className="flashcards-error" role="alert">
            {error}
          </div>
        )}

        <section className="flashcards-card">
          <h2>Create group</h2>
          <form
            className="flashcards-form-row"
            onSubmit={(e) => {
              e.preventDefault()
              void addGroup()
            }}
          >
            <input
              type="text"
              className="flashcards-input"
              data-testid="flashcards-new-group-name"
              placeholder="e.g. Numbers, Greetings, Verbs"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={80}
            />
            <button type="submit" className="flashcards-btn" data-testid="flashcards-add-group" disabled={!groupName.trim() || savingGroup}>
              {savingGroup ? 'Adding…' : 'Add group'}
            </button>
          </form>
        </section>

        <section className="flashcards-card">
          <h2>Add flashcard</h2>
          <div className="flashcards-form-grid">
            <select
              className="flashcards-input"
              data-testid="flashcards-add-card-group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {groups.length === 0 ? (
                <option value="">No groups yet</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              )}
            </select>

            <input
              type="text"
              className="flashcards-input"
              data-testid="flashcards-card-front"
              placeholder="Front (e.g. Hello)"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              maxLength={240}
            />
            <input
              type="text"
              className="flashcards-input"
              data-testid="flashcards-card-back"
              placeholder="Back (e.g. नमस्ते)"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              maxLength={240}
            />
            <button
              type="button"
              className="flashcards-btn"
              data-testid="flashcards-add-card"
              onClick={() => void addCard()}
              disabled={!selectedGroupId || !front.trim() || !back.trim() || savingCard}
            >
              {savingCard ? 'Adding…' : 'Add card'}
            </button>
          </div>
          <p className="flashcards-meta">
            {selectedGroup ? `${selectedGroup.name}: ${groupCardCount} cards` : 'Select a group to start'}
          </p>
        </section>

        <section className="flashcards-card">
          <h2>Study mode (random)</h2>
          <div className="flashcards-study-selected-group">
            <span className="flashcards-study-selected-label">Selected group:</span>
            <strong className="flashcards-study-selected-name">
              {selectedGroup ? selectedGroup.name : 'All groups'}
            </strong>
          </div>
          <div className="flashcards-form-grid">
            <select
              className="flashcards-input"
              data-testid="flashcards-study-group"
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value)
                setShowBack(false)
              }}
            >
              {groups.length === 0 ? (
                <option value="">No groups yet</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flashcards-study-controls">
            <button type="button" className="flashcards-btn" data-testid="flashcards-shuffle-all" onClick={() => void loadStudyCards('')}>
              Shuffle all groups
            </button>
            <button
              type="button"
              className="flashcards-btn ghost"
              data-testid="flashcards-shuffle-selected"
              onClick={() => void loadStudyCards(selectedGroupId)}
              disabled={!selectedGroupId}
            >
              Shuffle selected group
            </button>
          </div>

          {currentCard ? (
            <div className="flashcards-study-card">
              <p className="flashcards-study-group">{currentCard.groupName}</p>
              <p className="flashcards-study-front">{currentCard.front}</p>
              {showBack ? <p className="flashcards-study-back">{currentCard.back}</p> : null}
              <div className="flashcards-study-actions">
                <button type="button" className="flashcards-btn ghost" data-testid="flashcards-toggle-answer" onClick={() => setShowBack((v) => !v)}>
                  {showBack ? 'Hide answer' : 'Show answer'}
                </button>
                <button
                  type="button"
                  className="flashcards-btn"
                  data-testid="flashcards-next-card"
                  onClick={() => {
                    setStudyIndex((i) => (i + 1 < studyCards.length ? i + 1 : 0))
                    setShowBack(false)
                  }}
                >
                  Next card
                </button>
              </div>
              <p className="flashcards-meta">
                Card {studyIndex + 1} of {studyCards.length}
              </p>
            </div>
          ) : (
            <p className="flashcards-meta">Click a shuffle button to begin.</p>
          )}
        </section>

        <section className="flashcards-card">
          <h2>Manage flashcards</h2>
          <div className="flashcards-form-grid">
            <select
              className="flashcards-input"
              data-testid="flashcards-manage-group"
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value)
                cancelEditCard()
              }}
            >
              {groups.length === 0 ? (
                <option value="">No groups yet</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="flashcards-btn danger"
              data-testid="flashcards-delete-group"
              onClick={() => void deleteGroup()}
              disabled={!selectedGroupId || savingManage}
            >
              {savingManage ? 'Working…' : 'Delete selected group'}
            </button>
          </div>

          {selectedGroup && Array.isArray(selectedGroup.cards) && selectedGroup.cards.length > 0 ? (
            <div className="flashcards-grid">
              {selectedGroup.cards.map((card) => (
                <article key={card.id} className="flashcards-grid-card">
                  {editingCardId === card.id ? (
                    <>
                      <label className="flashcards-edit-label">
                        Front
                        <input
                          type="text"
                          className="flashcards-input"
                          data-testid={`flashcards-edit-front-${card.id}`}
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          maxLength={240}
                        />
                      </label>
                      <label className="flashcards-edit-label">
                        Back
                        <input
                          type="text"
                          className="flashcards-input"
                          data-testid={`flashcards-edit-back-${card.id}`}
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          maxLength={240}
                        />
                      </label>
                      <div className="flashcards-grid-actions">
                        <button
                          type="button"
                          className="flashcards-btn"
                          data-testid={`flashcards-save-card-${card.id}`}
                          onClick={() => void updateCard()}
                          disabled={!editFront.trim() || !editBack.trim() || savingManage}
                        >
                          {savingManage ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" className="flashcards-btn ghost" data-testid={`flashcards-cancel-edit-${card.id}`} onClick={cancelEditCard} disabled={savingManage}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="flashcards-grid-side"><strong>Front:</strong> {card.front}</p>
                      <p className="flashcards-grid-side"><strong>Back:</strong> {card.back}</p>
                      <div className="flashcards-grid-actions">
                        <button type="button" className="flashcards-btn ghost" data-testid={`flashcards-edit-card-${card.id}`} onClick={() => beginEditCard(card)} disabled={savingManage}>
                          Edit
                        </button>
                        <button type="button" className="flashcards-btn danger" data-testid={`flashcards-delete-card-${card.id}`} onClick={() => void deleteCard(card.id)} disabled={savingManage}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="flashcards-meta">No cards in this group yet.</p>
          )}
        </section>

        <p className="flashcards-footnote">
          Signed in as <code>{email}</code>
        </p>
      </div>
    </main>
  )
}

export default Flashcards
