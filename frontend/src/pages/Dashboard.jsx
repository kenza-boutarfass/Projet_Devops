import { useEffect, useState } from 'react'
import { Activity, ArrowRight, CircleAlert, FolderKanban, Gauge, Plus, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import ApiStatus from '../components/ui/ApiStatus.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import ProjectTable from '../components/dashboard/ProjectTable.jsx'
import QualityOverview from '../components/dashboard/QualityOverview.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getProjects, getStoredAuth } from '../services/api.js'

const icons = [FolderKanban, Activity, Gauge, CircleAlert]

function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const auth = getStoredAuth()
  const user = auth?.user

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const data = await getProjects()
        setProjects(data.projects || [])
      } catch (err) {
        console.error('Failed to load dashboard projects:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
  }).format(new Date()).toUpperCase()

  const avgScore = projects.length
    ? Math.round(projects.reduce((acc, p) => acc + (p.quality_score || 0), 0) / projects.length)
    : 100
  const attentionCount = projects.filter((p) => p.status !== 'Healthy').length
  const healthyCount = projects.filter((p) => p.status === 'Healthy').length

  const liveMetrics = [
    { label: user?.role === 'PROFESSOR' ? 'Supervised Projects' : 'My Projects', value: String(projects.length), change: 'PostgreSQL', note: 'Live data' },
    { label: 'Quality score', value: `${avgScore}%`, change: avgScore >= 80 ? 'Good' : 'Needs attention', note: 'Live average' },
    { label: 'Healthy Datasets', value: String(healthyCount), change: 'Verified', note: 'Passing checks' },
    { label: 'Needs Review', value: String(attentionCount), change: attentionCount > 0 ? 'Review needed' : 'All clear', note: 'Pending approval' },
  ]

  const greetingName = user ? user.fullName : 'Analyst'
  const isProfessor = user?.role === 'PROFESSOR'

  return (
    <div className="page-content dashboard-page page-enter">
      <PageHeader
        eyebrow={isProfessor ? `${today} · PROFESSOR SUPERVISION` : today}
        title={`Good morning, ${greetingName}.`}
        description={
          isProfessor
            ? 'Supervise student submissions, review quality rules and monitor dataset health.'
            : 'A clear view of the work shaping your data quality.'
        }
        actions={<Button to="/projects/new" icon={Plus}>New project</Button>}
      />

      <div className="dashboard-context-row">
        <ApiStatus />
        <span className="demo-context" style={{ color: '#10b981' }}>
          <span style={{ background: '#10b981' }} /> POSTGRESQL CONNECTED · {user?.role || 'PREVIEW'} MODE
        </span>
      </div>

      <section aria-label="Live metrics" className="metrics-grid">
        {liveMetrics.map((metric, index) => (
          <MetricCard icon={icons[index]} key={metric.label} {...metric} />
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section className="panel recent-projects-panel" aria-labelledby="recent-projects-heading">
          <div className="panel-heading">
            <div>
              <p className="panel-eyebrow">{isProfessor ? 'STUDENT PROJECTS' : 'WORKSPACE'}</p>
              <h2 id="recent-projects-heading">Recent projects</h2>
            </div>
            <Link className="panel-link" to="/projects">All projects <ArrowRight size={14} /></Link>
          </div>
          <div className="table-demo-note">Live PostgreSQL data ({projects.length} project{projects.length > 1 ? 's' : ''})</div>
          <ProjectTable projects={projects} />
        </section>
        <QualityOverview />
      </div>

      <section className="next-step-banner">
        <div className="next-step-icon"><ScanLine size={19} aria-hidden="true" /></div>
        <div>
          <p className="panel-eyebrow">NEXT IN THE WORKFLOW</p>
          <h2>Start with a dataset and its context.</h2>
          <p>Profiling, rule discovery and contract workflows are planned for upcoming phases.</p>
        </div>
        <Link className="next-step-link" to="/projects/new" aria-label="Create a project">
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}

export default Dashboard