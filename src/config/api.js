// Janus — auth API (Cloud Run). URL updates if service name changes.
export const API_BASE_URL = 'https://janus-gate-965419436472.europe-west1.run.app'

export const API_ENDPOINTS = {
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_ME: '/api/auth/me',
  AUTH_DELETE_ACCOUNT: '/api/auth/account',
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
  USER_MEAL_PLAN: '/api/user/meal-plan',
}

const TOKEN_KEY = 'dg_auth_token'

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export async function authFetch(path, options = {}) {
  const token = getStoredToken()
  const headers = {
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers })
}
