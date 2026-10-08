import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Database,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  Percent,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Table,
  Upload,
  UserCheck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import {
  attachSampleDataset,
  getDatasets,
  getProject,
  getStoredAuth,
  uploadDataset,
} from '../services/api.js'

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

  // Datasets & Profiling state
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetMsg, setDatasetMsg] = useState('')

  const auth = getStoredAuth()

  async function loadProjectAndDatasets() {
    try {
      const data = await getProject(id)
      setProjectData(data.project)
      setIsSupervision(data.isSupervisionView)

      const dsData = await getDatasets(data.project.id)
      setDatasets(dsData.datasets || [])
      if (dsData.datasets?.length > 0) {
        setSelectedDataset(dsData.datasets[0])
      }
    } catch (err) {
      setError(err.message || 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjectAndDatasets()
  }, [id])

  async function handleAttachSample(sampleType) {
    if (!projectData) return
    setDatasetLoading(true)
    setDatasetMsg('')
    try {
      const ds = await attachSampleDataset(projectData.id, sampleType)
      setDatasetMsg(`Dataset ${ds.name} successfully imported and profiled!`)
      await loadProjectAndDatasets()
      setSelectedDataset(ds)
    } catch (err) {
      setDatasetMsg(err.message || 'Failed to attach sample dataset')
    } finally {
      setDatasetLoading(false)
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file || !projectData) return

    setDatasetLoading(true)
    setDatasetMsg('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('datasetName', file.name)

    try {
      const ds = await uploadDataset(projectData.id, formData)
      setDatasetMsg(`Uploaded and profiled ${ds.name} (${ds.row_count} rows)!`)
      await loadProjectAndDatasets()
      setSelectedDataset(ds)
    } catch (err) {
      setDatasetMsg(err.message || 'Failed to upload CSV')
    } finally {
      setDatasetLoading(false)
    }
  }

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
  const profile = selectedDataset?.profile_summary
  const previewRows = selectedDataset?.raw_preview || []
  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : []

  return (
    <div className="page-content page-enter project-details-page">
      <Link className="back-link workspace-back-link" to="/projects"><ArrowLeft size={15} /> All projects</Link>

      {isSupervision && (
        <div style={{ background: '#1e3a8a30', border: '1px solid #3b82f650', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd' }}>
          <UserCheck size={18} />
          <span><strong>Supervision Mode:</strong> Reviewing student project submitted by <strong>{project.owner_name}</strong> ({project.owner_email}). Modifications are disabled.</span>
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
        {activeTab === 'Overview' && (
          <div className="detail-overview-grid">
            <article className="panel detail-intro-panel">
              <p className="panel-eyebrow">PROJECT OVERVIEW</p>
              <h2>Quality work starts with context.</h2>
              <p>Bring datasets and documentation together here. Profiling is ready, rule discovery and contracts are next.</p>
              <span className="coming-label"><span /> Profiling Engine Active</span>
            </article>
            <article className="panel upcoming-panel">
              <p className="panel-eyebrow">WORKFLOW STATUS</p>
              <h2>Development phases</h2>
              <ol>
                <li><span>01</span><div><strong>Dataset intake</strong><small>CSV import & benchmarks</small></div><em style={{ color: '#10b981' }}>Active</em></li>
                <li><span>02</span><div><strong>Data profiling</strong><small>Deterministic structure scan</small></div><em style={{ color: '#10b981' }}>Active</em></li>
                <li><span>03</span><div><strong>AI rule discovery</strong><small>Proposals & human review</small></div><em>Next</em></li>
              </ol>
            </article>
          </div>
        )}

        {/* ONGLET DATASETS */}
        {activeTab === 'Datasets' && (
          <div className="datasets-tab-content">
            {!isSupervision && (
              <div className="panel" style={{ marginBottom: '20px' }}>
                <div className="panel-heading">
                  <div>
                    <p className="panel-eyebrow">INTAKE & INGESTION</p>
                    <h2>Connect a Dataset</h2>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.9rem' }}>
                  Import a custom CSV dataset or attach an instant benchmark dataset for testing.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label className="button button-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={16} /> Upload CSV File
                    <input accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} type="file" />
                  </label>

                  <button
                    className="button"
                    disabled={datasetLoading}
                    onClick={() => handleAttachSample('customers')}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
                    type="button"
                  >
                    <FileSpreadsheet size={15} /> Attach Sample: Customers (CSV)
                  </button>

                  <button
                    className="button"
                    disabled={datasetLoading}
                    onClick={() => handleAttachSample('orders')}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
                    type="button"
                  >
                    <Database size={15} /> Attach Sample: Orders Stream (CSV)
                  </button>
                </div>

                {datasetMsg && (
                  <p style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', background: '#0284c720', color: '#38bdf8', fontSize: '0.88rem' }}>
                    {datasetMsg}
                  </p>
                )}
              </div>
            )}

            {datasets.length === 0 ? (
              <div className="empty-state">
                <Boxes size={24} />
                <h2>No datasets connected yet</h2>
                <p>Upload a CSV file or attach a sample dataset above to start deterministic profiling.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  {datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => setSelectedDataset(ds)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: selectedDataset?.id === ds.id ? '2px solid #3b82f6' : '1px solid #334155',
                        background: selectedDataset?.id === ds.id ? '#1e3a8a30' : '#0f172a',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      type="button"
                    >
                      <div style={{ fontWeight: 600 }}>{ds.name}</div>
                      <small style={{ color: '#94a3b8' }}>{ds.row_count} rows · {ds.column_count} cols</small>
                    </button>
                  ))}
                </div>

                {previewRows.length > 0 && (
                  <div className="panel">
                    <div className="panel-heading">
                      <div>
                        <p className="panel-eyebrow">RAW PREVIEW</p>
                        <h2>{selectedDataset.name} (First 10 records)</h2>
                      </div>
                      <button
                        className="button button-primary"
                        onClick={() => setActiveTab('Profile')}
                        style={{ fontSize: '0.85rem' }}
                        type="button"
                      >
                        <ScanSearch size={14} /> View Profiling Analysis
                      </button>
                    </div>

                    <div className="table-scroll">
                      <table className="project-table">
                        <thead>
                          <tr>
                            {previewHeaders.map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx}>
                              {previewHeaders.map((h) => (
                                <td key={h} className="table-mono">
                                  {row[h] !== '' ? row[h] : <span style={{ color: '#ef4444' }}>NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ONGLET PROFILE */}
        {activeTab === 'Profile' && (
          <div className="profile-tab-content">
            {!profile ? (
              <div className="empty-state">
                <ScanSearch size={24} />
                <h2>No Profiling Data Available</h2>
                <p>Connect a dataset first in the Datasets tab to trigger automatic deterministic profiling.</p>
                <button className="button button-primary" onClick={() => setActiveTab('Datasets')} type="button">
                  Go to Datasets tab
                </button>
              </div>
            ) : (
              <div>
                {/* Metrics du profiling */}
                <div className="metrics-grid" style={{ marginBottom: '24px' }}>
                  <article className="metric-card">
                    <span className="metric-label">Dataset Name</span>
                    <strong className="metric-value" style={{ fontSize: '1.25rem' }}>{selectedDataset.name}</strong>
                    <span className="metric-note">Format: CSV</span>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Dataset Shape</span>
                    <strong className="metric-value">{profile.totalRows} × {profile.totalColumns}</strong>
                    <span className="metric-note">{profile.totalRows} rows, {profile.totalColumns} cols</span>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Completeness</span>
                    <strong className="metric-value" style={{ color: profile.qualityHealth.completeness >= 95 ? '#10b981' : '#f59e0b' }}>
                      {profile.qualityHealth.completeness}%
                    </strong>
                    <span className="metric-note">{profile.qualityHealth.nullCells} null cells</span>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Quality Score</span>
                    <strong className="metric-value" style={{ color: '#38bdf8' }}>
                      {profile.qualityHealth.overallScore}%
                    </strong>
                    <span className="metric-note">Deterministic rating</span>
                  </article>
                </div>

                {/* Table de décomposition des colonnes */}
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-eyebrow">DETERMINISTIC COLUMN PROFILING</p>
                      <h2>Structure & Data Distribution</h2>
                    </div>
                    <span className="demo-label" style={{ background: '#10b98120', color: '#34d399' }}>
                      {profile.columns.length} COLUMNS ANALYZED
                    </span>
                  </div>

                  <div className="table-scroll">
                    <table className="project-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Inferred Type</th>
                          <th>Completeness</th>
                          <th>Nulls</th>
                          <th>Cardinality</th>
                          <th>Numeric Stats</th>
                          <th>Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.columns.map((col) => {
                          const completenessPct = (100 - col.nullPercentage).toFixed(1)
                          const typeColors = {
                            INTEGER: '#3b82f6',
                            FLOAT: '#60a5fa',
                            EMAIL: '#8b5cf6',
                            DATE: '#ec4899',
                            BOOLEAN: '#10b981',
                            TEXT: '#94a3b8',
                          }
                          const badgeColor = typeColors[col.inferredType] || '#94a3b8'

                          return (
                            <tr key={col.name}>
                              <td>
                                <strong>{col.name}</strong>
                                {col.isUnique && (
                                  <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#10b981', background: '#10b98115', padding: '2px 6px', borderRadius: '4px' }}>
                                    UNIQUE
                                  </span>
                                )}
                              </td>
                              <td>
                                <span style={{ background: `${badgeColor}20`, color: badgeColor, padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                  {col.inferredType}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '60px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${completenessPct}%`, height: '100%', background: col.nullCount === 0 ? '#10b981' : '#f59e0b' }} />
                                  </div>
                                  <span style={{ fontSize: '0.85rem' }}>{completenessPct}%</span>
                                </div>
                              </td>
                              <td>
                                {col.nullCount > 0 ? (
                                  <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <ShieldAlert size={13} /> {col.nullCount} ({col.nullPercentage}%)
                                  </span>
                                ) : (
                                  <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} /> 0
                                  </span>
                                )}
                              </td>
                              <td className="table-mono">
                                {col.distinctCount} distinct
                              </td>
                              <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                                {col.min !== undefined ? (
                                  <span>min: <strong>{col.min}</strong> | max: <strong>{col.max}</strong> | avg: <strong>{col.avg}</strong></span>
                                ) : (
                                  <span style={{ color: '#64748b' }}>—</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {(col.samples || []).slice(0, 3).map((s, sIdx) => (
                                    <span key={sIdx} style={{ background: '#1e293b', padding: '1px 5px', borderRadius: '3px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                      {String(s)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AUTRES ONGLETS EN COURS DE DÉVELOPPEMENT */}
        {!['Overview', 'Datasets', 'Profile'].includes(activeTab) && (
          <div className="coming-soon-panel">
            <span className="coming-soon-icon"><Boxes size={20} aria-hidden="true" /></span>
            <p className="panel-eyebrow">{activeTab.toUpperCase()}</p>
            <h2>Coming in the next development phase</h2>
            <p>This workspace is prepared for {activeTab.toLowerCase()} capabilities. Next step is AI Rule Discovery based on this profiled dataset.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default ProjectDetails