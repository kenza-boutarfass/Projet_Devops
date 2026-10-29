import { Activity, CheckCircle2, CircleX, ListChecks, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getAgentActivity } from '../services/api.js'

function getEventIcon(eventType) {
  if (/FAIL|REJECT|CANCEL/.test(eventType)) return { Icon: CircleX, typeClass: 'activity-event-failed' }
  if (/DELETE/.test(eventType)) return { Icon: Trash2, typeClass: 'activity-event-deleted' }
  if (/START/.test(eventType)) return { Icon: Play, typeClass: 'activity-event-started' }
  if (/CREATE/.test(eventType)) return { Icon: Plus, typeClass: 'activity-event-created' }
  if (/CHECKLIST/.test(eventType)) return { Icon: ListChecks, typeClass: 'activity-event-checklist' }
  if (/UPDATE/.test(eventType)) return { Icon: RefreshCw, typeClass: 'activity-event-updated' }
  return { Icon: CheckCircle2, typeClass: '' }
}

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
            const { Icon, typeClass } = getEventIcon(event.event_type)
            return (
              <article className="activity-row" key={event.id}>
                <span className={`activity-event-icon ${typeClass}`}><Icon size={17} /></span>
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

