import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    const controller = new AbortController()
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

    async function checkBackend() {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          signal: controller.signal,
        })
        const health = await response.json()
        setBackendStatus(
          response.ok && health.status === 'healthy' ? 'healthy' : 'unavailable',
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          setBackendStatus('unavailable')
        }
      }
    }

    checkBackend()
    return () => controller.abort()
  }, [])

  return (
    <main className="platform-shell">
      <header className="platform-header">
        <p className="eyebrow">DATA QUALITY PLATFORM</p>
        <h1>Data Quality Platform</h1>
        <p className="tagline">From Messy Data to Executable Quality.</p>
      </header>

      <section className="connection" aria-live="polite">
        <span
          className={`status-indicator status-${backendStatus}`}
          aria-hidden="true"
        />
        <p>
          Backend status:{' '}
          <strong>
            {backendStatus === 'checking' ? 'checking' : backendStatus}
          </strong>
        </p>
      </section>
    </main>
  )
}

export default App
