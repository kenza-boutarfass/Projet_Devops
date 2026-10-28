import { useEffect, useState } from 'react'
import { ArrowRight, Bot, CheckCircle2, ClipboardList, Clock3, FileText, Mail, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import ApiStatus from '../components/ui/ApiStatus.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getAgentExecutions, getStoredAuth, getTasks } from '../services/api.js'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskError, setTaskError] = useState('')
  const [executionError, setExecutionError] = useState('')
  const user = getStoredAuth()?.user

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [taskResult, executionResult] = await Promise.allSettled([getTasks(), getAgentExecutions()])
        if (taskResult.status === 'fulfilled') {
          setTasks(taskResult.value.tasks || [])
        } else {
          setTaskError(taskResult.reason.message || 'Unable to load your tasks.')
        }
        if (executionResult.status === 'fulfilled') {
          setExecutions(executionResult.value.executions || [])
        } else {
          setExecutionError(executionResult.reason.message || 'Unable to load agent approvals.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadWorkspace()
  }, [])

  const pending = executions.filter((execution) => execution.status === 'AWAITING_APPROVAL').length
  const active = tasks.filter((task) => task.status === 'IN_PROGRESS').length
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length
  const outstanding = tasks.filter((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS')
  const roleGreeting = {
    STUDENT: 'Ready to make progress on your studies?',
    PROFESSOR: 'Ready to organize your teaching work?',
    PROFESSIONAL: 'Ready to move your work forward?',
  }[user?.role] || 'Your personal workspace is ready.'

  const metrics = [
    { label: 'My tasks', value: loading || taskError ? '—' : String(tasks.length), change: 'All statuses', note: 'From your account', status: loading ? 'LOADING' : taskError ? 'UNAVAILABLE' : 'LIVE', icon: ClipboardList },
    { label: 'In progress', value: loading || taskError ? '—' : String(active), change: 'Tasks underway', note: 'From your task list', status: loading ? 'LOADING' : taskError ? 'UNAVAILABLE' : 'LIVE', icon: Clock3 },
    { label: 'Completed', value: loading || taskError ? '—' : String(completed), change: 'Tasks finished', note: 'From your task list', status: loading ? 'LOADING' : taskError ? 'UNAVAILABLE' : 'LIVE', icon: CheckCircle2 },
    { label: 'Pending approvals', value: loading || executionError ? '—' : String(pending), change: 'Agent actions', note: 'Awaiting your decision', status: loading ? 'LOADING' : executionError ? 'UNAVAILABLE' : 'LIVE', icon: Bot },
  ]

  return (
    <div className="page-content dashboard-page page-enter">
      <PageHeader
        eyebrow={user?.role || 'PERSONAL WORKSPACE'}
        title={`Welcome back${user?.fullName ? `, ${user.fullName}` : ''}.`}
        description={roleGreeting}
        actions={<Button to="/agent" icon={Plus}>Ask your agent</Button>}
      />

      <div className="dashboard-context-row">
        <ApiStatus />
        <span className="demo-context">PERSONAL WORKSPACE · {user?.role || 'GUEST'} PROFILE</span>
      </div>
      {taskError && <p className="form-error" role="alert">{taskError}</p>}
      {executionError && <p className="form-error" role="alert">{executionError}</p>}

      <section aria-label="Personal workspace statistics" className="metrics-grid">
        {metrics.map(({ icon, ...metric }) => (
          <MetricCard icon={icon} key={metric.label} {...metric} />
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section className="panel recent-projects-panel" aria-labelledby="tasks-heading">
          <div className="panel-heading">
            <div><p className="panel-eyebrow">MY TASKS</p><h2 id="tasks-heading">Next up</h2></div>
            <Link className="panel-link" to="/tasks">View all <ArrowRight size={14} /></Link>
          </div>
          {loading ? (
            <p className="workspace-message">Loading your tasks…</p>
          ) : taskError ? (
            <p className="workspace-message">Your task list could not be loaded.</p>
          ) : outstanding.length ? (
            <div className="workspace-task-list">
              {outstanding.slice(0, 5).map((task) => (
                <div className="workspace-task-row" key={task.id}>
                  <span className={`task-status-dot task-status-${task.status.toLowerCase()}`} />
                  <div><strong>{task.title}</strong><small>{task.status.replace('_', ' ')}{task.due_date ? ` · Due ${new Date(task.due_date).toLocaleDateString()}` : ''}</small></div>
                  <Link aria-label={`View ${task.title}`} to="/tasks"><ArrowRight size={15} /></Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="workspace-empty"><ClipboardList size={23} /><h3>No tasks yet</h3><p>Ask your agent to plan a task, then review and approve it.</p><Link className="panel-link" to="/agent">Open Agent Workspace <ArrowRight size={14} /></Link></div>
          )}
        </section>

        <section className="panel assistant-panel">
          <div className="panel-heading">
            <div><p className="panel-eyebrow">AGENT WORKSPACE</p><h2>Turn an instruction into a task</h2></div>
            <Bot size={19} aria-hidden="true" />
          </div>
          <p className="assistant-panel-copy">The agent currently plans personal task creation. You review and approve the action before it is performed.</p>
          <Link className="button button-primary" to="/agent">Give an instruction <ArrowRight size={15} /></Link>
          {executionError ? <p className="pending-approval-link">Approval status is unavailable.</p> : pending > 0 && <Link className="pending-approval-link" to="/agent">{pending} action{pending === 1 ? '' : 's'} awaiting your approval</Link>}
        </section>
      </div>

      <section className="coming-soon-grid" aria-label="Planned assistance">
        <article className="coming-soon-card"><FileText size={18} /><div><h3>My Documents</h3><p>Document upload and private document assistance are not connected yet.</p></div><span>Coming soon</span></article>
        <article className="coming-soon-card"><Mail size={18} /><div><h3>Email Assistant</h3><p>No mailbox is connected. Email reading and sending are not available.</p></div><span>Not connected</span></article>
      </section>
    </div>
  )
}

export default Dashboard
