import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Boxes, FileCheck2, Gauge, ScanSearch, ShieldCheck } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { demoProjects } from '../services/mockData.js'

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
  const location = useLocation()
  const project = location.state?.previewProject || demoProjects.find((item) => item.id === id)
  const [activeTab, setActiveTab] = useState('Overview')

  if (!project) {
    return (
      <div className="page-content page-enter">
        <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> Back to projects</Link>
        <div className="empty-state project-not-found">
          <Boxes size={23} aria-hidden="true" />
          <h1>Project not found</h1>
          <p>This preview does not persist new projects. Create another preview project or choose a demo project.</p>
          <Link className="button button-primary" to="/projects">View projects</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content page-enter project-details-page">
      <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> All projects</Link>
      <PageHeader
        eyebrow={`PROJECT / ${project.id.toUpperCase()}`}
        title={project.name}
        description={project.description}
        actions={<StatusBadge status={project.status || 'Preview'} />}
      />
      <div className="project-summary-strip">
        <div><span>ENVIRONMENT</span><strong>{project.environment || 'Development'}</strong></div>
        <div><span>DATASETS</span><strong>{project.dataset || 'Not connected'}</strong></div>
        <div><span>LAST ANALYSIS</span><strong>{project.updated || 'Not run'}</strong></div>
        <div><span>QUALITY SCORE</span><strong>{project.score ? `${project.score}%` : '—'}</strong></div>
        <span className="demo-label">PREVIEW</span>
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