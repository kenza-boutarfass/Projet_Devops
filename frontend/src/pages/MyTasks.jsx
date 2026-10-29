import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit2,
  Filter,
  ListChecks,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import {
  addTaskChecklist,
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  startTask,
  updateTask,
} from '../services/api.js'

function isOverdue(dateStr, status) {
  if (!dateStr || status === 'COMPLETED') return false
  const due = new Date(`${dateStr}T23:59:59`)
  return due.getTime() < Date.now()
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function MyTasks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filter states (synced with URL search params)
  const search = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || 'ALL'
  const priorityFilter = searchParams.get('priority') || 'ALL'
  const dueFilter = searchParams.get('due') || 'ALL'

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    checklistText: '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    status: 'PENDING',
  })

  // New checklist item input inside details modal
  const [newChecklistText, setNewChecklistText] = useState('')

  async function loadTasks() {
    setLoading(true)
    setError('')
    try {
      const data = await getTasks({
        status: statusFilter,
        priority: priorityFilter,
        due: dueFilter,
        search,
      })
      setTasks(data.tasks || [])
      // If a task is currently selected, refresh its data from the latest list
      if (selectedTask) {
        const refreshed = (data.tasks || []).find((t) => t.id === selectedTask.id)
        if (refreshed) setSelectedTask(refreshed)
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [search, statusFilter, priorityFilter, dueFilter])

  function updateFilterParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'ALL') {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const hasActiveFilters = Boolean(search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || dueFilter !== 'ALL')

  // Task creation handler
  async function handleCreateSubmit(e) {
    e.preventDefault()
    if (!createForm.title.trim()) return
    setActionBusy(true)
    setError('')
    setNotice('')
    try {
      const initialChecklist = createForm.checklistText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ text, completed: false }))

      const res = await createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priority: createForm.priority,
        dueDate: createForm.dueDate || null,
        checklist: initialChecklist,
      })

      setNotice(`Task “${res.task.title}” was created successfully.`)
      setIsCreateOpen(false)
      setCreateForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', checklistText: '' })
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to create task.')
    } finally {
      setActionBusy(false)
    }
  }

  // Open details modal
  function openDetails(task) {
    setSelectedTask(task)
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.due_date ? task.due_date.slice(0, 10) : '',
      status: task.status,
    })
    setIsEditing(false)
    setNewChecklistText('')
  }

  // Edit submission handler
  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!selectedTask) return
    setActionBusy(true)
    setError('')
    try {
      const res = await updateTask(selectedTask.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
        status: editForm.status,
      })
      setSelectedTask(res.task)
      setIsEditing(false)
      setNotice(`Task “${res.task.title}” updated.`)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to update task.')
    } finally {
      setActionBusy(false)
    }
  }

  // Start task handler
  async function handleStartTask(task) {
    setActionBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await startTask(task.id)
      setNotice(`Task “${res.task.title}” is now in progress.`)
      if (selectedTask?.id === task.id) setSelectedTask(res.task)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to start task.')
    } finally {
      setActionBusy(false)
    }
  }

  // Complete task handler
  async function handleCompleteTask(task) {
    setActionBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await completeTask(task.id)
      setNotice(`Task “${res.task.title}” was completed.`)
      if (selectedTask?.id === task.id) setSelectedTask(res.task)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to complete task.')
    } finally {
      setActionBusy(false)
    }
  }

  // Delete task handler
  async function handleDeleteTask(task) {
    if (!window.confirm(`Are you sure you want to delete the task “${task.title}”?`)) {
      return
    }
    setActionBusy(true)
    setError('')
    setNotice('')
    try {
      await deleteTask(task.id)
      setNotice(`Task “${task.title}” was deleted.`)
      if (selectedTask?.id === task.id) {
        setSelectedTask(null)
      }
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to delete task.')
    } finally {
      setActionBusy(false)
    }
  }

  // Add checklist if not exists
  async function handleAddChecklist(task) {
    setActionBusy(true)
    setError('')
    try {
      const res = await addTaskChecklist(task.id)
      setSelectedTask(res.task)
      setNotice('Checklist added to task.')
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to add checklist.')
    } finally {
      setActionBusy(false)
    }
  }

  // Toggle checklist item completion
  async function handleToggleChecklistItem(itemId) {
    if (!selectedTask) return
    const currentList = Array.isArray(selectedTask.checklist) ? [...selectedTask.checklist] : []
    const updated = currentList.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )

    // Optimistic UI update
    setSelectedTask({ ...selectedTask, checklist: updated })

    try {
      const res = await updateTask(selectedTask.id, { checklist: updated })
      setSelectedTask(res.task)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to update checklist item.')
      await loadTasks()
    }
  }

  // Add individual checklist item
  async function handleAddSingleChecklistItem(e) {
    e.preventDefault()
    if (!selectedTask || !newChecklistText.trim()) return
    const currentList = Array.isArray(selectedTask.checklist) ? [...selectedTask.checklist] : []
    const updated = [
      ...currentList,
      { id: crypto.randomUUID(), text: newChecklistText.trim(), completed: false },
    ]

    setNewChecklistText('')
    setSelectedTask({ ...selectedTask, checklist: updated })

    try {
      const res = await updateTask(selectedTask.id, { checklist: updated })
      setSelectedTask(res.task)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to add checklist item.')
      await loadTasks()
    }
  }

  // Remove individual checklist item
  async function handleRemoveChecklistItem(itemId) {
    if (!selectedTask) return
    const currentList = Array.isArray(selectedTask.checklist) ? [...selectedTask.checklist] : []
    const updated = currentList.filter((item) => item.id !== itemId)

    setSelectedTask({ ...selectedTask, checklist: updated })

    try {
      const res = await updateTask(selectedTask.id, { checklist: updated })
      setSelectedTask(res.task)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Failed to remove checklist item.')
      await loadTasks()
    }
  }

  return (
    <div className="page-content page-enter">
      <PageHeader
        eyebrow="PERSONAL WORKSPACE"
        title="My Tasks"
        description="Review, organize, filter, and execute tasks saved to your account."
        actions={
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)} type="button">
            New Task
          </Button>
        }
      />

      {/* Notification and error alerts */}
      {notice && (
        <p className="agent-notice" role="status" style={{ marginBottom: '14px' }}>
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert" style={{ marginBottom: '14px' }}>
          {error}
        </p>
      )}

      {/* Filter and Controls Toolbar */}
      <div className="task-controls-bar">
        <div className="task-filters">
          <label className="task-search-input-wrap">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search tasks</span>
            <input
              onChange={(e) => updateFilterParam('search', e.target.value)}
              placeholder="Search by title or description..."
              value={search}
            />
          </label>

          <select
            aria-label="Filter by Status"
            className="task-select"
            onChange={(e) => updateFilterParam('status', e.target.value)}
            value={statusFilter}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            aria-label="Filter by Priority"
            className="task-select"
            onChange={(e) => updateFilterParam('priority', e.target.value)}
            value={priorityFilter}
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <select
            aria-label="Filter by Due Date"
            className="task-select"
            onChange={(e) => updateFilterParam('due', e.target.value)}
            value={dueFilter}
          >
            <option value="ALL">All Due Dates</option>
            <option value="OVERDUE">Overdue</option>
            <option value="TODAY">Due Today</option>
            <option value="UPCOMING">Upcoming (Next 7 days)</option>
            <option value="NO_DUE_DATE">No Due Date</option>
          </select>

          {hasActiveFilters && (
            <button className="task-clear-btn" onClick={resetFilters} title="Reset all filters" type="button">
              <RotateCcw size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Task List */}
      {loading ? (
        <p className="workspace-message">Loading your tasks…</p>
      ) : tasks.length > 0 ? (
        <div className="task-list">
          {tasks.map((task) => {
            const checklist = Array.isArray(task.checklist) ? task.checklist : []
            const completedCount = checklist.filter((i) => i.completed).length
            const overdue = isOverdue(task.due_date, task.status)

            return (
              <article className={`task-card task-card-${task.status.toLowerCase()}`} key={task.id}>
                <span className="task-card-icon" title={`Status: ${task.status}`}>
                  {task.status === 'COMPLETED' ? (
                    <Check size={18} />
                  ) : task.status === 'IN_PROGRESS' ? (
                    <Clock3 size={18} />
                  ) : (
                    <ClipboardList size={18} />
                  )}
                </span>

                <div className="task-card-copy">
                  <h2 onClick={() => openDetails(task)}>
                    {task.title}
                    <span className={`priority-pill priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </h2>

                  {task.description && <p>{task.description}</p>}

                  <div className="task-card-meta">
                    <span>
                      <Clock3 size={13} /> {task.status.replace('_', ' ')}
                    </span>
                    {task.due_date && (
                      <span className={`due-pill ${overdue ? 'due-pill-overdue' : ''}`}>
                        <Calendar size={13} /> Due {formatDate(task.due_date)}
                        {overdue && ' (Overdue)'}
                      </span>
                    )}
                    {checklist.length > 0 && (
                      <span className="checklist-badge">
                        <ListChecks size={13} /> {completedCount}/{checklist.length} items
                      </span>
                    )}
                  </div>
                </div>

                <div className="task-card-actions">
                  {task.status === 'PENDING' && (
                    <button
                      className="button button-secondary"
                      disabled={actionBusy}
                      onClick={() => handleStartTask(task)}
                      title="Start working on this task"
                      type="button"
                    >
                      <Play size={13} /> Start task
                    </button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <button
                      className="button button-primary"
                      disabled={actionBusy}
                      onClick={() => handleCompleteTask(task)}
                      title="Mark task as finished"
                      type="button"
                    >
                      <CheckCircle2 size={13} /> Complete
                    </button>
                  )}
                  <button
                    className="button button-secondary"
                    onClick={() => openDetails(task)}
                    title="View and edit task details"
                    type="button"
                  >
                    <Edit2 size={13} /> Details
                  </button>
                  <button
                    className="button button-danger"
                    disabled={actionBusy}
                    onClick={() => handleDeleteTask(task)}
                    title="Delete task"
                    type="button"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="workspace-empty task-empty">
          <ClipboardList size={26} />
          <h2>{hasActiveFilters ? 'No matching tasks' : 'No tasks yet'}</h2>
          <p>
            {hasActiveFilters
              ? 'No tasks match your selected criteria. Try adjusting your filters or search terms.'
              : 'Create your first task using the “New Task” button or ask your agent in Agent Workspace.'}
          </p>
          {hasActiveFilters ? (
            <button className="button button-secondary" onClick={resetFilters} type="button">
              Reset filters
            </button>
          ) : (
            <button className="button button-primary" onClick={() => setIsCreateOpen(true)} type="button">
              <Plus size={14} /> Create a task
            </button>
          )}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="task-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div>
                <h2>Create New Task</h2>
                <p>Define a new task, priority, deadline, and optional checklist.</p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsCreateOpen(false)}
                title="Close modal"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form className="task-form" onSubmit={handleCreateSubmit}>
              <div className="task-form-group">
                <label htmlFor="create-task-title">Title *</label>
                <input
                  id="create-task-title"
                  maxLength={200}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Finish Kafka lab presentation"
                  required
                  value={createForm.title}
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="create-task-desc">Description</label>
                <textarea
                  id="create-task-desc"
                  maxLength={2000}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Context, specifications, and details for this task..."
                  rows={3}
                  value={createForm.description}
                />
              </div>

              <div className="task-form-row">
                <div className="task-form-group">
                  <label htmlFor="create-task-priority">Priority</label>
                  <select
                    id="create-task-priority"
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    value={createForm.priority}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="task-form-group">
                  <label htmlFor="create-task-due">Due Date</label>
                  <input
                    id="create-task-due"
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    type="date"
                    value={createForm.dueDate}
                  />
                </div>
              </div>

              <div className="task-form-group">
                <label htmlFor="create-task-checklist">Initial Checklist (one item per line)</label>
                <textarea
                  id="create-task-checklist"
                  onChange={(e) => setCreateForm({ ...createForm, checklistText: e.target.value })}
                  placeholder={"Read assignment guidelines\nWrite Dockerfile\nValidate results"}
                  rows={3}
                  value={createForm.checklistText}
                />
              </div>

              <div className="task-modal-footer">
                <button
                  className="button button-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-primary" disabled={actionBusy} type="submit">
                  {actionBusy ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAILS & EDIT MODAL */}
      {selectedTask && (
        <div className="task-modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div>
                <h2>{isEditing ? 'Edit Task' : selectedTask.title}</h2>
                <p>
                  Created on {new Date(selectedTask.created_at).toLocaleDateString()}
                  {selectedTask.updated_at && ` · Updated ${new Date(selectedTask.updated_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedTask(null)}
                title="Close details"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {isEditing ? (
              <form className="task-form" onSubmit={handleEditSubmit}>
                <div className="task-form-group">
                  <label htmlFor="edit-task-title">Title *</label>
                  <input
                    id="edit-task-title"
                    maxLength={200}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                    value={editForm.title}
                  />
                </div>

                <div className="task-form-group">
                  <label htmlFor="edit-task-desc">Description</label>
                  <textarea
                    id="edit-task-desc"
                    maxLength={2000}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    value={editForm.description}
                  />
                </div>

                <div className="task-form-row">
                  <div className="task-form-group">
                    <label htmlFor="edit-task-priority">Priority</label>
                    <select
                      id="edit-task-priority"
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      value={editForm.priority}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label htmlFor="edit-task-status">Status</label>
                    <select
                      id="edit-task-status"
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      value={editForm.status}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="task-form-group">
                  <label htmlFor="edit-task-due">Due Date</label>
                  <input
                    id="edit-task-due"
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    type="date"
                    value={editForm.dueDate}
                  />
                </div>

                <div className="task-modal-footer">
                  <button
                    className="button button-secondary"
                    onClick={() => setIsEditing(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button className="button button-primary" disabled={actionBusy} type="submit">
                    {actionBusy ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span className={`priority-pill priority-${selectedTask.priority.toLowerCase()}`}>
                      {selectedTask.priority} Priority
                    </span>
                    <span className="priority-pill" style={{ background: '#eee', color: '#444' }}>
                      Status: {selectedTask.status.replace('_', ' ')}
                    </span>
                    {selectedTask.due_date && (
                      <span
                        className={`due-pill ${isOverdue(selectedTask.due_date, selectedTask.status) ? 'due-pill-overdue' : ''}`}
                      >
                        <Calendar size={13} /> Due {formatDate(selectedTask.due_date)}
                      </span>
                    )}
                  </div>

                  {selectedTask.description ? (
                    <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#4d4c46' }}>
                      {selectedTask.description}
                    </p>
                  ) : (
                    <p style={{ fontSize: '11px', color: '#9a988f', fontStyle: 'italic' }}>
                      No description provided for this task.
                    </p>
                  )}
                </div>

                {/* CHECKLIST SECTION */}
                <div className="task-checklist-section">
                  <div className="task-checklist-header">
                    <h3>
                      <ListChecks size={15} /> Checklist
                    </h3>
                    {(!Array.isArray(selectedTask.checklist) || selectedTask.checklist.length === 0) && (
                      <button
                        className="button button-secondary"
                        disabled={actionBusy}
                        onClick={() => handleAddChecklist(selectedTask)}
                        style={{ minHeight: '28px', padding: '0 8px', fontSize: '10px' }}
                        type="button"
                      >
                        <Plus size={12} /> Add checklist
                      </button>
                    )}
                  </div>

                  {Array.isArray(selectedTask.checklist) && selectedTask.checklist.length > 0 ? (
                    <div>
                      {(() => {
                        const total = selectedTask.checklist.length
                        const done = selectedTask.checklist.filter((i) => i.completed).length
                        const percent = Math.round((done / total) * 100)
                        return (
                          <>
                            <div className="task-checklist-progress-bar">
                              <div
                                className="task-checklist-progress-fill"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <small
                              style={{ display: 'block', marginBottom: '10px', fontSize: '9px', color: '#77756e' }}
                            >
                              {done} of {total} completed ({percent}%)
                            </small>
                          </>
                        )
                      })()}

                      <div className="task-checklist-items">
                        {selectedTask.checklist.map((item) => (
                          <div
                            className={`task-checklist-item ${item.completed ? 'completed' : ''}`}
                            key={item.id}
                          >
                            <input
                              checked={item.completed}
                              onChange={() => handleToggleChecklistItem(item.id)}
                              type="checkbox"
                            />
                            <span>{item.text}</span>
                            <button
                              aria-label={`Remove checklist item ${item.text}`}
                              className="checklist-remove-btn"
                              onClick={() => handleRemoveChecklistItem(item.id)}
                              type="button"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <form className="task-checklist-add-form" onSubmit={handleAddSingleChecklistItem}>
                        <input
                          onChange={(e) => setNewChecklistText(e.target.value)}
                          placeholder="Add next checklist item..."
                          value={newChecklistText}
                        />
                        <button className="button button-secondary" type="submit">
                          <Plus size={12} /> Add
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p style={{ fontSize: '11px', color: '#8c8a82', margin: '4px 0 0' }}>
                      This task currently has no checklist. Click “Add checklist” to break down this task into steps.
                    </p>
                  )}
                </div>

                <div className="task-modal-footer" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <button
                      className="button button-danger"
                      disabled={actionBusy}
                      onClick={() => handleDeleteTask(selectedTask)}
                      type="button"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedTask.status === 'PENDING' && (
                      <button
                        className="button button-secondary"
                        disabled={actionBusy}
                        onClick={() => handleStartTask(selectedTask)}
                        type="button"
                      >
                        <Play size={13} /> Start Task
                      </button>
                    )}
                    {selectedTask.status === 'IN_PROGRESS' && (
                      <button
                        className="button button-primary"
                        disabled={actionBusy}
                        onClick={() => handleCompleteTask(selectedTask)}
                        type="button"
                      >
                        <CheckCircle2 size={13} /> Complete Task
                      </button>
                    )}
                    <button
                      className="button button-secondary"
                      onClick={() => setIsEditing(true)}
                      type="button"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MyTasks
