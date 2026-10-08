const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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