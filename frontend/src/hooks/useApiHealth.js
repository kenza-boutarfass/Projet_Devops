import { useEffect, useState } from 'react'
import { getHealth } from '../services/api.js'

export function useApiHealth() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const controller = new AbortController()

    getHealth({ signal: controller.signal })
      .then((health) => {
        setStatus(health.status === 'healthy' ? 'healthy' : 'unavailable')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setStatus('unavailable')
        }
      })

    return () => controller.abort()
  }, [])

  return status
}