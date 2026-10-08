import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, FolderKanban, Plus, RefreshCw, Search, User } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { getProjects, getStoredAuth } from '../services/api.js'

const filters = ['All projects', 'Healthy', 'Needs review', 'Failed']

function Projects() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState('All projects')
  const [projectsList, setProjectsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const auth = getStoredAuth()
  const search = searchParams.get('search') || ''

  async function loadProjects() {
    setLoading(true)
    setError('')
    try {
      const data = await getProjects()
      setProjectsList(data.projects || [])
    } catch (err) {
      setError(err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const projects = useMemo(() => {
    return projectsList.filter((project) => {
      const textToMatch = `${project.name} ${project.description || ''} ${project.dataset_name || ''} ${project.owner_name || ''}`.toLowerCase()
      const matchesSearch = textToMatch.includes(search.toLowerCase())
      const matchesFilter = filter === 'All projects' || project.status === filter
      return matchesSearch && matchesFilter
    })
  }, [projectsList, filter, search])

  function updateSearch(value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('search', value)
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }

  const isProfessor = auth?.user?.role === 'PROFESSOR'

  return (
    <div className="page-content page-enter">
      <PageHeader
        eyebrow={isProfessor ? 'PROFESSOR SUPERVISION' : 'WORKSPACE'}
        title={isProfessor ? 'Student & Supervised Projects' : 'Projects'}
        description={
          isProfessor
            ? 'Supervise student project progress, data quality health and submitted contracts.'
            : 'Organize datasets, context and future quality workflows by project.'
        }
        actions={<Button to="/projects/new" icon={Plus}>Create project</Button>}
      />

      <div className="project-toolbar">
        <label className="project-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search projects</span>
          <input
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search projects by name, dataset, or student..."
            value={search}
          />
        </label>
        <div aria-label="Filter projects by status" className="filter-tabs" role="group">
          {filters.map((option) => (
            <button
              aria-pressed={filter === option}
              className={filter === option ? 'filter-tab filter-tab-active' : 'filter-tab'}
              key={option}
              onClick={() => setFilter(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="projects-count-row">
        <span>{projects.length} project(s) found</span>
        <button className="text-button" onClick={loadProjects} type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
        {isProfessor && <span className="demo-label" style={{ background: '#3b82f620', color: '#60a5fa' }}>SUPERVISION MODE</span>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? (
        <div className="empty-state">
          <RefreshCw className="button-spinner" size={24} />
          <h2>Loading projects from database...</h2>
        </div>
      ) : projects.length ? (
        <div className="project-cards-grid">
          {projects.map((project, index) => (
            <article className="project-card" key={project.id} style={{ '--card-index': index }}>
              <div className="project-card-top">
                <span className="project-card-icon"><FolderKanban size={18} aria-hidden="true" /></span>
                <StatusBadge status={project.status} />
              </div>
              <h2>{project.name}</h2>
              <p className="project-card-description">{project.description || 'No description provided.'}</p>
              
              {isProfessor && project.owner_name && (
                <div style={{ fontSize: '0.8rem', color: '#93c5fd', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> <span>Owner: <strong>{project.owner_name}</strong> ({project.owner_role})</span>
                </div>
              )}

              <div className="project-card-dataset">
                <span>DATASET</span><strong>{project.dataset_name || 'Not connected'}</strong>
              </div>
              <div className="project-card-footer">
                <span>Environment: <strong>{project.environment || 'Development'}</strong></span>
                <span className="project-card-score">{project.quality_score}<small>%</small></span>
              </div>
              <Link className="project-card-open" to={`/projects/${project.id}`} aria-label={`Open ${project.name}`}>
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={22} aria-hidden="true" />
          <h2>No matching projects</h2>
          <p>Try another search or status filter.</p>
          <button className="text-button" onClick={() => { updateSearch(''); setFilter('All projects') }} type="button">Clear filters</button>
        </div>
      )}
    </div>
  )
}

export default Projects