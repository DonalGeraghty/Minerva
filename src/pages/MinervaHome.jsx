import React from 'react'
import { Link } from 'react-router-dom'
import './HubPage.css'
import './MinervaHome.css'

const TOOLS = [
  { to: '/habits', title: 'Habits', blurb: 'Daily habit grid and streaks.' },
  { to: '/todos', title: 'Todos', blurb: 'Quick capture list.' },
  { to: '/flashcards', title: 'Flashcards', blurb: 'Groups, cards, and study mode.' },
  { to: '/calories', title: 'Calories', blurb: 'Nutrition history.' },
  { to: '/stoic', title: 'Stoic', blurb: 'Day plan and evening review.' },
  { to: '/recipes', title: 'Recipes', blurb: 'Trainer meal plan and tracking.' },
  { to: '/account', title: 'Account', blurb: 'Profile and settings.' },
]

function MinervaHome() {
  return (
    <main className="hub-page minerva-home">
      <div className="hub-inner">
        <header className="hub-header">
          <h1 className="hub-title">Minerva</h1>
          <p className="hub-sub">
            Your personal dashboard: habits, learning, nutrition, and reflection in one place.
          </p>
        </header>

        <p className="hub-body">
          Choose a tool below. The habit tracker lives on its own route so this home stays a simple landing.
        </p>

        <ul className="minerva-home-grid" aria-label="Apps">
          {TOOLS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="minerva-home-card">
                <span className="minerva-home-card-title">{item.title}</span>
                <span className="minerva-home-card-blurb">{item.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

export default MinervaHome
