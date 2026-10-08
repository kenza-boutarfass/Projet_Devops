import { Activity, ArrowRight, CircleAlert, FolderKanban, Gauge, Plus, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import ApiStatus from '../components/ui/ApiStatus.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import ProjectTable from '../components/dashboard/ProjectTable.jsx'
import QualityOverview from '../components/dashboard/QualityOverview.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { demoMetrics, demoProjects } from '../services/mockData.js'

const icons = [FolderKanban, Activity, Gauge, CircleAlert]

function Dashboard() {
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
  }).format(new Date()).toUpperCase()

  return (
    <div className="page-content dashboard-page page-enter">
      <PageHeader
        eyebrow={today}
        title="Good morning, Analyst."
        description="A clear view of the work shaping your data quality."
        actions={<Button to="/projects/new" icon={Plus}>New project</Button>}
      />

      <div className="dashboard-context-row">
        <ApiStatus />
        <span className="demo-context"><span /> DEMONSTRATION DATA · NOT LIVE METRICS</span>
      </div>

      <section aria-label="Demonstration metrics" className="metrics-grid">
        {demoMetrics.map((metric, index) => (
          <MetricCard icon={icons[index]} key={metric.label} {...metric} />
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section className="panel recent-projects-panel" aria-labelledby="recent-projects-heading">
          <div className="panel-heading">
            <div>
              <p className="panel-eyebrow">WORKSPACE</p>
              <h2 id="recent-projects-heading">Recent projects</h2>
            </div>
            <Link className="panel-link" to="/projects">All projects <ArrowRight size={14} /></Link>
          </div>
          <div className="table-demo-note">Illustrative project data</div>
          <ProjectTable projects={demoProjects} />
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