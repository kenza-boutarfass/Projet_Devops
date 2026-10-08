import { useApiHealth } from '../../hooks/useApiHealth.js'

function ApiStatus() {
  const status = useApiHealth()

  return (
    <div className="api-status" aria-live="polite">
      <span className={`api-status-dot api-status-${status}`} aria-hidden="true" />
      <span>Backend status: <strong>{status}</strong></span>
    </div>
  )
}

export default ApiStatus