import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Boxes, FileCheck2, Gauge, RefreshCw, ScanSearch, ShieldCheck, UserCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { getProject, getStoredAuth } from '../services/api.js'

const tabs = [
  { label: 'Overview', icon: Gauge },
  { label: 'Datasets', icon: Boxes },
  { label: 'Profile', icon: ScanSearch },
  { label: 'Rules', icon: FileCheck2 },
  { label: 'Contract', icon: FileCheck2 },
  { label: 'Validation', icon: ShieldCheck },
  { label: 'Reports', icon: ArrowUpRight },
]

function ProjectDetails() {
  const { id } = useParams()
  const [projectData, setProjectData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSupervision, setIsSupervision] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const auth = getStoredAuth()

  useEffect(() => {
    async function loadProject() {
      setLoading(true)
      setError('')
      try {
        const data = await getProject(id)
        setProjectData(data.project)
        setIsSupervision(data.isSupervisionView)
      } catch (err) {
        setError(err.message || 'Failed to load project details')
      } finally {
        setLoading(false)
      }
    }
    loadProject()
  }, [id])

  if (loading) {
    return (
      <div className="page-content page-enter">
        <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> Back to projects</Link>
        <div className="empty-state">
          <RefreshCw className="button-spinner" size={24} />
          <h2>Loading project details...</h2>
        </div>
      </div>
    )
  }

  if (error || !projectData) {
    return (
      <div className="page-content page-enter">
        <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> Back to projects</Link>
        <div className="empty-state project-not-found">
          <Boxes size={23} aria-hidden="true" />
          <h1>Project not found</h1>
          <p>{error || 'This project does not exist or you do not have permission to view it.'}</p>
          <Link className="button button-primary" to="/projects">View projects</Link>
        </div>
      </div>
    )
  }

  const project = projectData

  return (
    <div className="page-content page-enter project-details-page">
      <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> All projects</Link>

      {isSupervision && (
        <div style={{ background: '#1e3a8a30', border: '1px solid #3b82f650', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd' }}>
          <UserCheck size={18} />
          <span><strong>Supervision Mode:</strong> You are reviewing student project submitted by <strong>{project.owner_name}</strong> ({project.owner_email}). Modifications are disabled.</span>
        </div>
      )}

      <PageHeader
        eyebrow={`PROJECT / ${(project.slug || project.id).toUpperCase()}`}
        title={project.name}
        description={project.description || 'No description provided.'}
        actions={<StatusBadge status={project.status || 'Healthy'} />}
      />
      <div className="project-summary-strip">
        <div><span>ENVIRONMENT</span><strong>{project.environment || 'Development'}</strong></div>
        <div><span>DATASET</span><strong>{project.dataset_name || 'Not connected'}</strong></div>
        <div><span>OWNER</span><strong>{project.owner_name || auth?.user?.fullName || 'User'}</strong></div>
        <div><span>QUALITY SCORE</span><strong>{project.quality_score ? `${project.quality_score}%` : '—'}</strong></div>
        <span className="demo-label" style={{ background: '#10b98120', color: '#34d399' }}>POSTGRES PERSISTED</span>
      </div>
      <div aria-label="Project sections" className="detail-tabs" role="tablist">
        {tabs.map(({ label, icon: Icon }) => (
          <button
            aria-selected={activeTab === label}
            className={`detail-tab ${activeTab === label ? 'detail-tab-active' : ''}`}
            id={`tab-${label.toLowerCase()}`}
            key={label}
            onClick={() => setActiveTab(label)}
            role="tab"
            type="button"
          >
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <section aria-labelledby={`tab-${activeTab.toLowerCase()}`} className="detail-tab-panel" role="tabpanel">
        {activeTab === 'Overview' ? (
          <div className="detail-overview-grid">
            <article className="panel detail-intro-panel">
              <p className="panel-eyebrow">PROJECT OVERVIEW</p>
              <h2>Quality work starts with context.</h2>
              <p>Bring datasets and documentation together here. Future phases will add deterministic profiling, AI-assisted rule discovery and reviewable contracts.</p>
              <span className="coming-label"><span /> Workspace foundation</span>
            </article>
            <article className="panel upcoming-panel">
              <p className="panel-eyebrow">PLANNED WORKFLOW</p>
              <h2>Next development phases</h2>
              <ol>
                <li><span>01</span><div><strong>Dataset intake</strong><small>Files and documentation</small></div><em>Planned</em></li>
                <li><span>02</span><div><strong>Data profiling</strong><small>Deterministic structure scan</small></div><em>Planned</em></li>
                <li><span>03</span><div><strong>Rule discovery</strong><small>AI proposals with human review</small></div><em>Planned</em></li>
              </ol>
            </article>
          </div>
        ) : (
          <div className="coming-soon-panel">
            <span className="coming-soon-icon"><Boxes size={20} aria-hidden="true" /></span>
            <p className="panel-eyebrow">{activeTab.toUpperCase()}</p>
            <h2>Coming in the next development phase</h2>
            <p>This workspace is prepared for {activeTab.toLowerCase()} capabilities. No placeholder processing or data has been added.</p>
          </div>
        )}
      </section>
      <p className="demo-disclaimer">Project details are illustrative. No project data is saved.</p>
    </div>
  )
}

export default ProjectDetails