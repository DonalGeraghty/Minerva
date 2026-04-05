# Minerva (`minerva`)

**Codename: Minerva** — Roman goddess of wisdom, strategic craft, and the arts. This repository is Donal Geraghty’s **React / Vite** personal dashboard: habit tracking, todos, flashcards, nutrition logging, and a stoic journal with day-planner slots. **Authentication and all persisted data** are handled by **Janus** (the **`janus-gate`** Flask API on Google Cloud Run with Firestore).

## Features

### App

- **Habit tracker**: Grid by day, custom habits and categories, month summary
- **Todos**, **flashcards** (groups, cards, study shuffle), **calories / nutrition** history
- **Stoic** page: journal entries plus **day planner** options and daily slot selections
- **Responsive layout** and **light / dark** theme
- **JWT auth**: Sign in / register via Janus; protected routes behind a splash when logged out

### Frontend ↔ backend

- **`src/config/api.js`**: `API_BASE_URL` and `API_ENDPOINTS` for every Janus route the app uses
- **`authFetch`**: attaches `Authorization: Bearer <token>` from `localStorage` for user APIs

## Live URLs

- **Frontend**: Set your deployed Minerva URL (e.g. Cloud Run or GitHub Pages) when published. `package.json` lists a sample GitHub Pages homepage.
- **Backend (Janus)**: [https://janus-gate-965419436472.europe-west1.run.app/](https://janus-gate-965419436472.europe-west1.run.app/)

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 18, Vite 5 |
| Routing | React Router 7 |
| motion / 3D | Three.js (where used in the UI) |
| Tests | Vitest, Testing Library, jsdom |
| Docs / dev UI | Storybook 8 |
| Backend | **janus-gate** (Flask on Cloud Run), Firestore |

**Dependencies**: **`package.json`** / `package-lock.json`. The repo includes **`requirements.txt`** as a short non-runtime note only (no Python app server here).

## Project structure

```
src/
├── components/       # Navbar, theme toggle, shared UI
├── context/          # ThemeProvider, AuthProvider, HabitDataProvider
├── config/           # api.js — base URL, endpoints, token + authFetch
├── pages/            # HabitTracker, HabitMonthSummary, Todos, Flashcards, Calories, StoicJournal, LoginSplash
├── styles/           # shared.css
├── App.jsx           # Router, protected layout, nav
└── main.jsx          # Entry
```

## Getting started

### Prerequisites

- **Node.js** 18 or newer (recommended for Vite 5)
- **npm** (ships with Node)

### Install and run

```bash
git clone <your-repo-url>
cd minerva
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Vitest |
| `npm run test:ui` | Vitest UI |
| `npm run test:coverage` | Coverage |
| `npm run storybook` | Storybook dev server (port 6006) |
| `npm run build-storybook` | Static Storybook build |

## Configuration

### API base URL

Centralized in `src/config/api.js`. Endpoints cover auth, habits, categories, todos, flashcards, nutrition, stoic journal, and day planner (see the file for the full `API_ENDPOINTS` map).

```javascript
export const API_BASE_URL = 'https://janus-gate-965419436472.europe-west1.run.app'

export const API_ENDPOINTS = {
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_ME: '/api/auth/me',
  HABITS_GET: '/api/habits',
  HABITS_PUT: '/api/habits',
  HABITS_PATCH_CELL: '/api/habits/cell',
  USER_HABITS_GET: '/api/user/habits',
  USER_HABITS_PUT: '/api/user/habits',
  USER_HABIT_CATEGORIES: '/api/user/habit-categories',
  USER_TODOS: '/api/user/todos',
  USER_FLASHCARDS: '/api/user/flashcards',
  USER_FLASHCARD_GROUPS: '/api/user/flashcards/groups',
  USER_FLASHCARD_CARDS: '/api/user/flashcards/cards',
  USER_FLASHCARD_STUDY: '/api/user/flashcards/study',
  USER_NUTRITION: '/api/user/nutrition',
  USER_STOIC: '/api/user/stoic',
  DAY_PLANNER_OPTIONS: '/api/user/day-planner/options',
  DAY_PLANNER_DAILY: '/api/user/day-planner/daily',
}
```

After redeploying Janus, update **`API_BASE_URL`** if the Cloud Run hostname changes.

### Environment variables (optional)

Vite exposes only variables prefixed with `VITE_`. You can add e.g. `VITE_API_BASE_URL` and read it in `api.js` if you want environment-specific backends without editing the default export.

## Janus API (backend)

Repository: **janus-gate**. In addition to auth and `/health`, Janus exposes user-scoped Firestore-backed routes for habits, todos, flashcards, nutrition, stoic journal, and day planner. For a full list and request shapes, call **`GET /`** on the deployed service or see that repo’s README.

## Storybook

```bash
npm run storybook
```

Stories live next to components (e.g. `ThemeToggle.stories.jsx`, `Navbar.stories.jsx`).

## Testing

```bash
npm run test
```

Vitest is configured in `vite.config.js` (including `setupFiles` when present).

## Deployment

- **Static / CDN**: `npm run build` and deploy the **`dist/`** output.
- **Google Cloud Run**: Workflow **`.github/workflows/deploy-gcp.yml`** builds and deploys service **`minerva`** (project and region are defined there—confirm URLs in the GCP console after deploy).

**janus-gate** deploys from its own repo (Dockerfile + GitHub Actions).

## GitHub repository name

If you rename the repo to **`minerva`**, update the remote:

```bash
git remote set-url origin https://github.com/<you>/minerva.git
```

## Contributing

1. Fork the repository  
2. Create a branch (`git checkout -b feature/your-change`)  
3. Commit and push  
4. Open a pull request  

## Acknowledgments

React, Vite, Vitest, Storybook, Three.js, and the Janus / Cloud Run stack used for auth and data.
