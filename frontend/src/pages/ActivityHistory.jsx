import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, CircleX } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getAgentActivity } from '../services/api.js'

function ActivityHistory() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadActivity() {
      try {
        const data = await getAgentActivity()
        setEvents(data.events || [])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load activity history.')
      } finally {
        setLoading(false)
      }
    }
    loadActivity()
  }, [])

  return (
    <div className="page-content page-enter">
      <PageHeader eyebrow="PERSONAL WORKSPACE" title="Activity History" description="A record of your agent plans, approvals, and task actions." />
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="workspace-message">Loading activity…</p> : error ? (
        <p className="workspace-message">Activity could not be loaded.</p>
      ) : events.length ? (
        <div className="activity-list">
          {events.map((event) => {
            const failed = /FAIL|REJECT|CANCEL/.test(event.event_type)
            const Icon = failed ? CircleX : CheckCircle2
            return (
              <article className="activity-row" key={event.id}>
                <span className={`activity-event-icon ${failed ? 'activity-event-failed' : ''}`}><Icon size={17} /></span>
                <div><h2>{event.summary}</h2><p>{event.event_type.replaceAll('_', ' ')}</p></div>
                <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="workspace-empty task-empty"><Activity size={24} /><h2>No activity yet</h2><p>Agent plans, approvals, and completed task actions will appear here.</p></div>
      )}
    </div>
  )
}

export default ActivityHistory
