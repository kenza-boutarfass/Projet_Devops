import { useState } from 'react'
import { ArrowLeft, Check, ChevronDown, FolderPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import { createProject } from '../services/api.js'

function CreateProject() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState('Development')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    if (name.trim().length < 3) {
      setError('Project name must be at least 3 characters.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const created = await createProject({
        name: name.trim(),
        description: description.trim(),
        environment,
      })
      navigate(`/projects/${created.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content page-enter">
      <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> Back to projects</Link>
      <PageHeader eyebrow="WORKSPACE / PROJECTS" title="Create a project" description="Set up a place for datasets, documentation and quality workflows." />
      <div className="create-project-layout">
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-panel-heading">
            <span className="form-panel-icon"><FolderPlus size={19} /></span>
            <div><h2>Project details</h2><p>Required information to create a workspace.</p></div>
          </div>
          <div className="field-group">
            <label htmlFor="project-name">Project name <span className="required-mark">*</span></label>
            <input autoFocus id="project-name" maxLength={80} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="e.g. Customer data quality" required value={name} />
            <small>Use a clear name your team will recognize.</small>
          </div>
          <div className="field-group">
            <label htmlFor="project-description">Description <span className="optional-label">Optional</span></label>
            <textarea id="project-description" maxLength={280} onChange={(event) => setDescription(event.target.value)} placeholder="What data or process does this project cover?" rows={4} value={description} />
            <small className="character-count">{description.length}/280</small>
          </div>
          <div className="field-group">
            <label htmlFor="project-environment">Environment</label>
            <div className="select-wrap">
              <select id="project-environment" onChange={(event) => setEnvironment(event.target.value)} value={environment}>
                <option>Development</option><option>Staging</option><option>Production</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-panel-footer">
            <p><Check size={14} /> Preview only · Nothing is saved to a database</p>
            <button className="button button-primary" type="submit">Create project <FolderPlus size={16} /></button>
          </div>
        </form>
        <aside className="create-project-aside">
          <p className="panel-eyebrow">WHAT COMES NEXT</p>
          <h2>A home for your quality workflow.</h2>
          <p>Dataset ingestion, profiling and rule discovery are planned for later phases. This preview only prepares the project workspace.</p>
          <div className="aside-step-list"><span>01 <b>Project workspace</b></span><span>02 <b>Dataset & documentation</b></span><span>03 <b>Quality discovery</b></span></div>
        </aside>
      </div>
    </div>
  )
}

export default CreateProject