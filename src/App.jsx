import React, { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Outlet,
} from 'react-router-dom'
import './App.css'
import './components/Navbar.css'
import HabitTracker from './pages/HabitTracker'
import HabitMonthSummary from './pages/HabitMonthSummary'
import Todos from './pages/Todos'
import Flashcards from './pages/Flashcards'
import Calories from './pages/Calories'
import StoicJournal from './pages/StoicJournal'
import MealPlan from './pages/MealPlan'
import AccountPage from './pages/AccountPage'
import LoginSplash from './pages/LoginSplash'
import ThemeToggle from './components/ThemeToggle'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HabitDataProvider } from './context/HabitDataContext'

function Navbar() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMenuOpen(false)
  }

  const handleLogout = () => {
    setMenuOpen(false)
    setMoreOpen(false)
    setProfileOpen(false)
    logout()
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <h2>Habits</h2>
        </div>

        {/* Desktop nav links */}
        <div className="nav-links nav-links--desktop">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' || location.pathname === '/month' ? 'active' : ''}`}
            onClick={scrollToTop}
          >
            Habits
          </Link>
          <Link to="/todos" className={`nav-link ${location.pathname === '/todos' ? 'active' : ''}`} onClick={scrollToTop}>
            Todos
          </Link>
          <Link to="/flashcards" className={`nav-link ${location.pathname === '/flashcards' ? 'active' : ''}`} onClick={scrollToTop}>
            Flashcards
          </Link>
          <Link to="/calories" className={`nav-link ${location.pathname === '/calories' ? 'active' : ''}`} onClick={scrollToTop}>
            Calories
          </Link>
          <Link to="/stoic" className={`nav-link ${location.pathname === '/stoic' ? 'active' : ''}`} onClick={scrollToTop}>
            Stoic
          </Link>
          <Link to="/recipes" className={`nav-link ${location.pathname === '/recipes' ? 'active' : ''}`} onClick={scrollToTop}>
            Recipes
          </Link>
        </div>

        {/* Desktop right section */}
        <div className="nav-right nav-right--desktop">
          <p className="nav-time-muted">
            {currentTime.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
            {currentTime.toLocaleTimeString('en-IE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <div className="nav-dropdown-wrap">
            <button
              type="button"
              className="nav-link nav-dropdown-btn"
              onClick={() => {
                setProfileOpen((v) => !v)
                setMoreOpen(false)
              }}
              aria-expanded={profileOpen}
            >
              Profile
            </button>
            <div className={`nav-dropdown-menu nav-dropdown-menu--profile ${profileOpen ? 'is-open' : ''}`} aria-hidden={!profileOpen}>
              {user?.email && (
                <span className="nav-user-email" title={user.email}>{user.email}</span>
              )}
              <Link
                to="/account"
                className="nav-dropdown-link"
                onClick={() => {
                  setProfileOpen(false)
                  scrollToTop()
                }}
              >
                Account
              </Link>
              <div className="nav-theme-wrap">
                <ThemeToggle />
              </div>
              <button type="button" className="nav-dropdown-link nav-dropdown-link-btn nav-logout" onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>

        {/* Mobile: theme toggle + hamburger always visible */}
        <div className="nav-mobile-controls">
          <ThemeToggle />
          <button
            className="nav-hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`nav-hamburger-icon ${menuOpen ? 'is-open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`nav-drawer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <Link
          to="/"
          className={`nav-drawer-link ${location.pathname === '/' || location.pathname === '/month' ? 'active' : ''}`}
          onClick={scrollToTop}
        >
          Habits
        </Link>
        <Link to="/todos" className={`nav-drawer-link ${location.pathname === '/todos' ? 'active' : ''}`} onClick={scrollToTop}>
          Todos
        </Link>
        <Link to="/flashcards" className={`nav-drawer-link ${location.pathname === '/flashcards' ? 'active' : ''}`} onClick={scrollToTop}>
          Flashcards
        </Link>
        <Link to="/calories" className={`nav-drawer-link ${location.pathname === '/calories' ? 'active' : ''}`} onClick={scrollToTop}>
          Calories
        </Link>
        <Link to="/stoic" className={`nav-drawer-link ${location.pathname === '/stoic' ? 'active' : ''}`} onClick={scrollToTop}>
          Stoic
        </Link>
        <Link to="/recipes" className={`nav-drawer-link ${location.pathname === '/recipes' ? 'active' : ''}`} onClick={scrollToTop}>
          Recipes
        </Link>
        <hr className="nav-drawer-divider" />
        {user?.email && (
          <span className="nav-drawer-email">{user.email}</span>
        )}
        <Link to="/account" className="nav-drawer-link" onClick={scrollToTop}>
          Account
        </Link>
        <button type="button" className="nav-drawer-link nav-drawer-logout" onClick={handleLogout}>
          Sign out
        </button>
        <div className="nav-drawer-time">
          {currentTime.toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}{' '}
          {currentTime.toLocaleTimeString('en-IE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </nav>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <LoginSplash />
  }

  return (
    <div className="app">
      <Navbar />
      <HabitDataProvider>
        <Outlet />
      </HabitDataProvider>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HabitTracker />} />
        <Route path="/month" element={<HabitMonthSummary />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/calories" element={<Calories />} />
        <Route path="/stoic" element={<StoicJournal />} />
        <Route path="/recipes" element={<MealPlan />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
