import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, FolderKanban, Plus, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { demoProjects } from '../services/mockData.js'

const filters = ['All projects', 'Healthy', 'Needs review', 'Failed']

function Projects() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState('All projects')
  const search = searchParams.get('search') || ''
  const projects = useMemo(() => demoProjects.filter((project) => {
    const matchesSearch = `${project.name} ${project.description} ${project.dataset}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesFilter = filter === 'All projects' || project.status === filter
    return matchesSearch && matchesFilter
  }), [filter, search])

  function updateSearch(value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('search', value)
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="page-content page-enter">
      <PageHeader
        eyebrow="WORKSPACE"
        title="Projects"
        description="Organize datasets, context and future quality workflows by project."
        actions={<Button to="/projects/new" icon={Plus}>Create project</Button>}
      />
      <div className="project-toolbar">
        <label className="project-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search projects</span>
          <input onChange={(event) => updateSearch(event.target.value)} placeholder="Search projects" value={search} />
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
        <span>{projects.length} projects</span>
        <span className="demo-label">DEMO DATA · NOT SAVED</span>
      </div>
      {projects.length ? (
        <div className="project-cards-grid">
          {projects.map((project, index) => (
            <article className="project-card" key={project.id} style={{ '--card-index': index }}>
              <div className="project-card-top">
                <span className="project-card-icon"><FolderKanban size={18} aria-hidden="true" /></span>
                <StatusBadge status={project.status} />
              </div>
              <h2>{project.name}</h2>
              <p className="project-card-description">{project.description}</p>
              <div className="project-card-dataset">
                <span>DATASET</span><strong>{project.dataset}</strong>
              </div>
              <div className="project-card-footer">
                <span>Last analysis <strong>{project.updated}</strong></span>
                <span className="project-card-score">{project.score}<small>%</small></span>
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
      <p className="demo-disclaimer">These entries are isolated UI examples. Project data is not persisted.</p>
    </div>
  )
}

export default Projects