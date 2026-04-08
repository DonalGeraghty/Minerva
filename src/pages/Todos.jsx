import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './Todos.css'

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function Todos() {
  const { user } = useAuth()
  const email = user?.email || ''

  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [text, setText] = useState('')

  const load = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent)
      if (!email) {
        setTodos([])
        if (!silent) setLoading(false)
        if (!silent) setError('')
        return
      }

      if (!silent) {
        setLoading(true)
        setError('')
      }

      try {
        const res = await authFetch(API_ENDPOINTS.USER_TODOS, { method: 'GET' })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Could not load todos (${res.status})`)
        setTodos(Array.isArray(data.todos) ? data.todos : [])
      } catch (e) {
        if (!silent) {
          setError(e.message || 'Failed to load todos')
          setTodos([])
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

  const addTodo = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || adding) return

    setAdding(true)
    setError('')

    try {
      const res = await authFetch(API_ENDPOINTS.USER_TODOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) throw new Error(data.error || `Add failed (${res.status})`)
      if (Array.isArray(data.todos)) setTodos(data.todos)
      setText('')
    } catch (e) {
      setError(e.message || 'Add failed')
    } finally {
      setAdding(false)
    }
  }, [adding, text])

  const completeTodo = useCallback(
    async (todoId) => {
      if (!todoId || deletingId) return
      setError('')
      setDeletingId(todoId)

      try {
        const res = await authFetch(API_ENDPOINTS.USER_TODOS, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todoId }),
        })
        const data = await parseJsonSafe(res)
        if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`)
        if (Array.isArray(data.todos)) setTodos(data.todos)
      } catch (e) {
        setError(e.message || 'Delete failed')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId]
  )

  const canAdd = useMemo(() => text.trim().length > 0 && !adding, [text, adding])

  if (loading) {
    return (
      <main className="todo-page">
        <div className="todo-inner">
          <p className="todo-loading" role="status">
            Loading your todos…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="todo-page">
      <div className="todo-inner">
        <header className="todo-header">
          <h1 className="todo-title">Todo list</h1>
          <p className="todo-sub">Each item is stored on your account. Checking completes and permanently deletes it.</p>
        </header>

        {error && (
          <div className="todo-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form
          className="todo-add"
          onSubmit={(e) => {
            e.preventDefault()
            void addTodo()
          }}
        >
          <input
            className="todo-input"
            type="text"
            data-testid="todos-new-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a new todo…"
            maxLength={240}
            aria-label="Todo text"
            disabled={adding}
          />
          <button type="submit" className="todo-add-btn" data-testid="todos-add-submit" disabled={!canAdd}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>

        <section className="todo-list" aria-label="Todo items">
          {todos.length === 0 ? (
            <div className="todo-empty">
              <p>
                No todos yet. Add one above, then check it to complete (delete).
              </p>
            </div>
          ) : (
            todos.map((t) => (
              <div className="todo-row" key={t.id}>
                <label className="todo-check" title="Complete and delete">
                  <input
                    type="checkbox"
                    data-testid={`todos-complete-${t.id}`}
                    onChange={(e) => {
                      if (e.target.checked) void completeTodo(t.id)
                    }}
                    disabled={Boolean(deletingId)}
                    aria-label={`Complete todo: ${t.text}`}
                  />
                  <span className="todo-check-ui" aria-hidden />
                </label>
                <span className="todo-text">{t.text}</span>
              </div>
            ))
          )}
        </section>

        <p className="todo-footnote">
          Signed in as <code>{email}</code>
        </p>
      </div>
    </main>
  )
}

export default Todos

