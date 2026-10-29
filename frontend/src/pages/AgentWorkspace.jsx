import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Bot, Check, Clock3, Lightbulb, X } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { approveAgentExecution, createAgentExecution, getAgentExecutions, rejectAgentExecution } from '../services/api.js'

const futureIdeas = [
  'Summarize this document and extract the key points.',
  'Create a revision checklist from my course.',
  'Organize my tasks for this week.',
  'Draft a professional reply to this email.',
]

function AgentWorkspace() {
  const [request, setRequest] = useState('')
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadExecutions() {
    setLoading(true)
    try {
      const data = await getAgentExecutions()
      setExecutions(data.executions || [])
      setLoadError('')
    } catch (loadError) {
      setLoadError(loadError.message || 'Unable to load agent activity.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadExecutions() }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const data = await createAgentExecution(request)
      setExecutions((current) => [data.execution, ...current])
      setNotice('Plan created. Review the proposed task below; nothing will be created until you approve it.')
      setRequest('')
    } catch (submitError) {
      setError(submitError.message || 'The agent could not plan this request.')
    } finally {
      setSubmitting(false)
    }
  }

  async function decide(execution, action) {
    if (busyId) return
    setBusyId(execution.id)
    setError('')
    setNotice('')
    try {
      if (action === 'approve') {
        const result = await approveAgentExecution(execution.id, {
          planHash: execution.plan?.planHash,
        })
        if (result.verified && result.task) {
          setNotice(`Task “${result.task.title}” was created and verified in the database.`)
        } else if (result.status === 'UNCERTAIN') {
          setError('Task outcome is uncertain: the task could not be confirmed in the database.')
        } else {
          setError(result.message || 'The approved action could not be verified by the backend.')
        }
      } else {
        await rejectAgentExecution(execution.id)
        setNotice('You rejected this proposed action. No task was created.')
      }
      await loadExecutions()
    } catch (decisionError) {
      setError(decisionError.message || 'The action could not be completed.')
      await loadExecutions()
    } finally {
      setBusyId('')
    }
  }

  const pending = executions.filter((execution) => execution.status === 'AWAITING_APPROVAL')

  return (
    <div className="page-content page-enter agent-workspace-page">
      <PageHeader
        eyebrow="PERSONAL AGENT"
        title="Agent Workspace"
        description="Give an instruction, review the plan, and decide whether the agent may create a task."
      />

      <section className="panel agent-prompt-panel" aria-labelledby="agent-prompt-heading">
        <div className="panel-heading">
          <div><p className="panel-eyebrow">AVAILABLE ACTION</p><h2 id="agent-prompt-heading">Create a task with your agent</h2></div>
          <Bot size={21} aria-hidden="true" />
        </div>
        <p className="assistant-panel-copy">This version supports internal task creation only. Your approval is required before a task is saved.</p>
        <form className="agent-request-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="agent-request">Instruction for the agent</label>
          <textarea
            id="agent-request"
            maxLength={1000}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="For example: Create a task to prepare my exam notes"
            required
            rows={3}
            value={request}
          />
          <div className="agent-request-footer">
            <small>{request.length}/1000 · Try “Create a task to …”</small>
            <button className="button button-primary" disabled={submitting || request.trim().length < 4} type="submit">
              {submitting ? 'Planning…' : 'Create plan'} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="agent-notice" role="status">{notice}</p>}
      </section>

      <section className="suggestions-section">
        <div className="suggestions-heading"><Lightbulb size={16} /><h2>Ideas for future capabilities</h2></div>
        <p>These are examples only. Document summaries, revision checklists, task organization, and email drafting are not executable in this version.</p>
        <ul>{futureIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul>
      </section>

      <section className="agent-approvals-section" aria-labelledby="approvals-heading">
        <div className="panel-heading">
          <div><p className="panel-eyebrow">HUMAN REVIEW</p><h2 id="approvals-heading">Pending Approvals</h2></div>
          <span className="approval-count">{pending.length}</span>
        </div>
        {loading ? <p className="workspace-message">Loading pending actions…</p> : loadError ? (
          <p className="workspace-message">Pending approvals could not be loaded.</p>
        ) : pending.length ? (
          <div className="approval-list">
            {pending.map((execution) => {
              const step = execution.plan?.steps?.[0]
              const isExpired = execution.plan?.expiresAt && new Date(execution.plan.expiresAt) < new Date()
              const isActionBusy = busyId === execution.id
              const isAnyBusy = Boolean(busyId)

              return (
                <article className="approval-card" key={execution.id}>
                  <div className="approval-card-icon">
                    {isExpired ? <AlertTriangle size={17} className="text-warning" /> : <Clock3 size={17} />}
                  </div>
                  <div className="approval-card-copy">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p className="panel-eyebrow">TASK CREATION REQUEST</p>
                      {isExpired && <span className="feature-status" style={{ color: '#ef4444', borderColor: '#ef4444' }}>EXPIRED</span>}
                    </div>
                    <h3>{step?.input?.title || 'Proposed task'}</h3>
                    <p>{execution.user_request}</p>
                    <small>
                      Created {new Date(execution.created_at).toLocaleString()}
                      {execution.plan?.expiresAt && (
                        <span> · {isExpired ? 'Expired' : `Expires ${new Date(execution.plan.expiresAt).toLocaleTimeString()}`}</span>
                      )}
                    </small>
                  </div>
                  <div className="approval-card-actions">
                    <button
                      className="button button-primary"
                      disabled={isAnyBusy || isExpired}
                      onClick={() => decide(execution, 'approve')}
                      type="button"
                    >
                      <Check size={15} /> {isActionBusy ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={isAnyBusy}
                      onClick={() => decide(execution, 'reject')}
                      type="button"
                    >
                      <X size={15} /> Reject
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="workspace-empty compact-empty"><Check size={20} /><h3>No action awaiting approval</h3><p>When you create a plan, it will appear here for review.</p></div>
        )}
      </section>
    </div>
  )
}

export default AgentWorkspace

