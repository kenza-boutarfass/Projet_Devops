import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardList, Clock3, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import { completeTask, getTasks, updateTask } from '../services/api.js'

function MyTasks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const search = searchParams.get('search') || ''

  async function loadTasks() {
    setLoading(true)
    setError('')
    try {
      const data = await getTasks()
      setTasks(data.tasks || [])
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTasks() }, [])

  const filteredTasks = useMemo(
    () => tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(search.toLowerCase())),
    [tasks, search],
  )

  function updateSearch(value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('search', value)
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }

  async function setTaskStatus(task, status) {
    setError('')
    try {
      if (status === 'COMPLETED') await completeTask(task.id)
      else await updateTask(task.id, { status })
      await loadTasks()
    } catch (actionError) {
      setError(actionError.message || 'Unable to update this task.')
    }
  }

  return (
    <div className="page-content page-enter">
      <PageHeader eyebrow="PERSONAL WORKSPACE" title="My Tasks" description="Review and update tasks saved to your account." />
      <label className="task-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search tasks</span>
        <input onChange={(event) => updateSearch(event.target.value)} placeholder="Search your tasks..." value={search} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="workspace-message">Loading your tasks…</p> : error ? (
        <p className="workspace-message">Your tasks could not be loaded.</p>
      ) : filteredTasks.length ? (
        <div className="task-list">
          {filteredTasks.map((task) => (
            <article className={`task-card task-card-${task.status.toLowerCase()}`} key={task.id}>
              <span className="task-card-icon">{task.status === 'COMPLETED' ? <Check size={18} /> : <ClipboardList size={18} />}</span>
              <div className="task-card-copy">
                <h2>{task.title}</h2>
                {task.description && <p>{task.description}</p>}
                <div className="task-card-meta">
                  <span><Clock3 size={13} /> {task.status.replace('_', ' ')}</span>
                  <span>{task.priority} priority</span>
                  {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="task-card-actions">
                {task.status === 'PENDING' && <button className="button button-secondary" onClick={() => setTaskStatus(task, 'IN_PROGRESS')} type="button">Start task</button>}
                {task.status === 'IN_PROGRESS' && <button className="button button-primary" onClick={() => setTaskStatus(task, 'COMPLETED')} type="button">Mark complete</button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-empty task-empty"><ClipboardList size={24} /><h2>{search ? 'No matching tasks' : 'No tasks yet'}</h2><p>{search ? 'Try another search.' : 'Create a task through Agent Workspace. It will appear here after you approve the plan.'}</p></div>
      )}
    </div>
  )
}

export default MyTasks
