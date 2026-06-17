import React, { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './ExportPage.css'

function ExportPage() {
  const { user } = useAuth()
  const email = user?.email || ''

  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleExport = useCallback(async () => {
    if (!email) {
      setError('Please sign in to export your data')
      return
    }

    setDownloading(true)
    setError('')
    setSuccess('')

    try {
      const res = await authFetch(API_ENDPOINTS.USER_EXPORT, {
        method: 'GET',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Export failed (${res.status})`)
      }

      // Handle file download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1] || 'minerva_export.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess('Your data has been downloaded successfully!')
    } catch (e) {
      setError(e.message || 'Failed to export data')
    } finally {
      setDownloading(false)
    }
  }, [email])

  return (
    <main className="export-page">
      <div className="export-inner">
        <header className="export-header">
          <h1 className="export-title">Data Export</h1>
          <p className="export-sub">
            Download all your Minerva data as a ZIP file containing JSON and CSV files.
          </p>
        </header>

        {error && (
          <div className="export-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="export-success" role="status">
            <span>{success}</span>
          </div>
        )}

        <section className="export-section">
          <h2 className="export-section-title">What's Included</h2>
          <ul className="export-list">
            <li className="export-list-item">
              <strong>Habits</strong> - Your habit tracker cells, custom habits, and categories
            </li>
            <li className="export-list-item">
              <strong>Todos</strong> - Your todo list items
            </li>
            <li className="export-list-item">
              <strong>Flashcards</strong> - All your flashcard groups and cards
            </li>
            <li className="export-list-item">
              <strong>Nutrition</strong> - Your nutrition history
            </li>
            <li className="export-list-item">
              <strong>Stoic Journal</strong> - Your journal entries
            </li>
            <li className="export-list-item">
              <strong>Day Planner</strong> - Your day planner options and daily slots
            </li>
            <li className="export-list-item">
              <strong>Meal Plan</strong> - Your meal plan selections
            </li>
            <li className="export-list-item">
              <strong>Goals</strong> - Your goal progress tracker data
            </li>
            <li className="export-list-item">
              <strong>Sleep</strong> - Your sleep tracking data
            </li>
            <li className="export-list-item">
              <strong>Achievements</strong> - Your unlocked achievements
            </li>
          </ul>
        </section>

        <section className="export-section">
          <h2 className="export-section-title">File Formats</h2>
          <p className="export-text">
            Each data type is exported in both <strong>JSON</strong> (for programmatic access) 
            and <strong>CSV</strong> (for spreadsheet applications) formats where applicable.
          </p>
          <p className="export-text">
            A <strong>README.md</strong> file is included with usage instructions.
          </p>
        </section>

        <section className="export-section">
          <h2 className="export-section-title">Export Your Data</h2>
          <p className="export-text">
            Click the button below to download a ZIP file containing all your data.
          </p>
          <button
            type="button"
            className="export-btn"
            onClick={handleExport}
            disabled={downloading}
            data-testid="export-download-btn"
          >
            {downloading ? 'Preparing Export…' : 'Download Export'}
          </button>
        </section>

        <p className="export-footnote">
          Signed in as <code>{email}</code>
        </p>
      </div>
    </main>
  )
}

export default ExportPage
