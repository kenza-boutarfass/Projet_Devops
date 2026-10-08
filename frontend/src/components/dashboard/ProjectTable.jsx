import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from '../ui/StatusBadge.jsx'

function ProjectTable({ projects }) {
  return (
    <div className="table-scroll">
      <table className="project-table">
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">Dataset</th>
            <th scope="col">Last analysis</th>
            <th scope="col">Quality</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Open project</span></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <Link className="table-project-name" to={`/projects/${project.id}`}>
                  {project.name}
                </Link>
                <span className="table-project-description">{project.description}</span>
              </td>
              <td className="table-mono">{project.dataset_name || project.dataset || 'Not connected'}</td>
              <td>{project.updated_at ? new Date(project.updated_at).toLocaleDateString() : (project.updated || 'Recent')}</td>
              <td><span className="quality-value">{project.quality_score ?? project.score ?? 0}%</span></td>
              <td><StatusBadge status={project.status} /></td>
              <td>
                <Link
                  aria-label={`Open ${project.name}`}
                  className="table-open-link"
                  to={`/projects/${project.id}`}
                >
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ProjectTable