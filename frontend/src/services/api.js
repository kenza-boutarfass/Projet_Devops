const API_BASE_URL = import.meta.env.VITE_API_URL

export async function getHealth({ signal } = {}) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not configured')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/health`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return response.json()
}