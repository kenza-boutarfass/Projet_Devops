const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('dq_auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAuth(authData) {
  try {
    localStorage.setItem('dq_auth', JSON.stringify(authData))
  } catch (err) {
    console.error('Failed to save auth to localStorage:', err)
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem('dq_auth')
  } catch (err) {
    console.error('Failed to clear auth:', err)
  }
}

export async function getHealth({ signal } = {}) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/health`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return response.json()
}

export async function login({ email, password }) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }

  setStoredAuth({ token: data.token, user: data.user })
  return data
}

export async function register({ email, password, fullName, role }) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password, fullName, role }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed')
  }

  setStoredAuth({ token: data.token, user: data.user })
  return data
}

export async function getMe() {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/me`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    clearStoredAuth()
    throw new Error(data.message || 'Session expired')
  }

  setStoredAuth({ token: auth.token, user: data.user })
  return data.user
}