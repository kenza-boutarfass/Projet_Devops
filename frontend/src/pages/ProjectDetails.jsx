import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCheck,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  Download,
  FileCheck2,
  FileCode,
  FileSpreadsheet,
  Filter,
  Gauge,
  Percent,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table,
  Upload,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import {
  attachSampleDataset,
  deleteRule,
  discoverRules,
  generateContract,
  getContract,
  getDatasets,
  getProject,
  getRules,
  getStoredAuth,
  updateRuleStatus,
  uploadDataset,
} from '../services/api.js'

const tabs = [
  { label: 'Overview', icon: Gauge },
  { label: 'Datasets', icon: Boxes },
  { label: 'Profile', icon: ScanSearch },
  { label: 'Rules', icon: FileCheck2 },
  { label: 'Contract', icon: FileCode },
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

  // Rules state
  const [rules, setRules] = useState([])
  const [rulesCounts, setRulesCounts] = useState({ PROPOSED: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 })
  const [ruleFilter, setRuleFilter] = useState('ALL')
  const [rulesLoading, setRulesLoading] = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [rulesMsg, setRulesMsg] = useState('')

  // Contract state
  const [contract, setContract] = useState(null)
  const [contractLoading, setContractLoading] = useState(false)
  const [contractGenerating, setContractGenerating] = useState(false)
  const [contractMsg, setContractMsg] = useState('')
  const [contractViewMode, setContractViewMode] = useState('yaml') // 'yaml' | 'assertions'
  const [copied, setCopied] = useState(false)

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

  async function loadRules(status = ruleFilter) {
    if (!projectData) return
    setRulesLoading(true)
    try {
      const data = await getRules(projectData.id, status)
      setRules(data.rules || [])
      setRulesCounts(data.counts || { PROPOSED: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 })
    } catch (err) {
      console.error('Failed to load rules:', err)
    } finally {
      setRulesLoading(false)
    }
  }

  async function loadContract() {
    if (!projectData) return
    setContractLoading(true)
    try {
      const data = await getContract(projectData.id)
      setContract(data.contract || null)
    } catch (err) {
      console.error('Failed to load contract:', err)
    } finally {
      setContractLoading(false)
    }
  }

  useEffect(() => {
    loadProjectAndDatasets()
  }, [id])

  useEffect(() => {
    if (projectData?.id) {
      loadRules(ruleFilter)
      loadContract()
    }
  }, [projectData?.id, ruleFilter])

  async function handleGenerateContract() {
    if (!projectData) return
    setContractGenerating(true)
    setContractMsg('')
    try {
      const res = await generateContract(projectData.id, {
        datasetId: selectedDataset?.id,
        version: 'v1.0.0',
      })
      setContract(res.contract)
      setContractMsg('Data Contract successfully compiled and activated!')
    } catch (err) {
      setContractMsg(err.message || 'Failed to generate contract')
    } finally {
      setContractGenerating(false)
    }
  }

  function handleCopyYaml() {
    if (!contract?.yaml_content) return
    navigator.clipboard.writeText(contract.yaml_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleDownloadYaml() {
    if (!contract?.yaml_content) return
    const blob = new Blob([contract.yaml_content], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectData.slug || 'project'}-contract-${contract.version || 'v1.0.0'}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

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

  async function handleDiscoverRules() {
    if (!projectData) return
    setDiscoverLoading(true)
    setRulesMsg('')
    try {
      const res = await discoverRules(projectData.id, selectedDataset?.id)
      setRulesMsg(res.message || 'Rules discovered successfully!')
      await loadRules('ALL')
      setRuleFilter('ALL')
    } catch (err) {
      setRulesMsg(err.message || 'Rule discovery failed')
    } finally {
      setDiscoverLoading(false)
    }
  }

  async function handleReviewRule(ruleId, newStatus) {
    if (!projectData) return
    try {
      await updateRuleStatus(projectData.id, ruleId, newStatus)
      await loadRules(ruleFilter)
    } catch (err) {
      setRulesMsg(err.message || 'Failed to update rule status')
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
              <p>Bring datasets and documentation together here. Profiling and AI rule discovery are ready. Contracts and CI/CD validation are next.</p>
              <span className="coming-label"><span /> Rule Discovery Active</span>
            </article>
            <article className="panel upcoming-panel">
              <p className="panel-eyebrow">WORKFLOW STATUS</p>
              <h2>Development phases</h2>
              <ol>
                <li><span>01</span><div><strong>Dataset intake</strong><small>CSV import & benchmarks</small></div><em style={{ color: '#10b981' }}>Active</em></li>
                <li><span>02</span><div><strong>Data profiling</strong><small>Deterministic structure scan</small></div><em style={{ color: '#10b981' }}>Active</em></li>
                <li><span>03</span><div><strong>AI rule discovery</strong><small>Proposals & human review</small></div><em style={{ color: '#10b981' }}>Active</em></li>
                <li><span>04</span><div><strong>Data contract</strong><small>Executable schemas</small></div><em>Next</em></li>
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

                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-eyebrow">DETERMINISTIC COLUMN PROFILING</p>
                      <h2>Structure & Data Distribution</h2>
                    </div>
                    <button
                      className="button button-primary"
                      onClick={() => setActiveTab('Rules')}
                      style={{ fontSize: '0.85rem' }}
                      type="button"
                    >
                      <Sparkles size={14} /> Proceed to Rule Discovery
                    </button>
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

        {/* ONGLET RULES (AI RULE DISCOVERY & HUMAN REVIEW) */}
        {activeTab === 'Rules' && (
          <div className="rules-tab-content">
            <div className="panel" style={{ marginBottom: '20px' }}>
              <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p className="panel-eyebrow">HUMAN-IN-THE-LOOP QUALITY DISCOVERY</p>
                  <h2>AI Proposed Rules & Approval</h2>
                </div>
                {!isSupervision && (
                  <button
                    className="button button-primary"
                    disabled={discoverLoading || datasets.length === 0}
                    onClick={handleDiscoverRules}
                    type="button"
                  >
                    {discoverLoading ? <RefreshCw className="button-spinner" size={15} /> : <Sparkles size={15} />}
                    {discoverLoading ? 'Analyzing Dataset with AI...' : 'Run AI Rule Discovery'}
                  </button>
                )}
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
                AI analyzes statistical profiles and detects constraints. Humans approve, reject or refine each rule before generating executable Data Contracts.
              </p>

              {rulesMsg && (
                <p style={{ padding: '8px 12px', borderRadius: '6px', background: '#0284c720', color: '#38bdf8', fontSize: '0.88rem', marginBottom: '16px' }}>
                  {rulesMsg}
                </p>
              )}

              {/* Compteurs de règles */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filter by status:</span>
                {[
                  { id: 'ALL', label: `All (${rulesCounts.TOTAL})` },
                  { id: 'PROPOSED', label: `Pending Review (${rulesCounts.PROPOSED})` },
                  { id: 'APPROVED', label: `Approved (${rulesCounts.APPROVED})` },
                  { id: 'REJECTED', label: `Rejected (${rulesCounts.REJECTED})` },
                ].map((f) => (
                  <button
                    className={ruleFilter === f.id ? 'filter-tab filter-tab-active' : 'filter-tab'}
                    key={f.id}
                    onClick={() => setRuleFilter(f.id)}
                    type="button"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {rulesLoading ? (
              <div className="empty-state">
                <RefreshCw className="button-spinner" size={24} />
                <h2>Loading quality rules...</h2>
              </div>
            ) : rules.length === 0 ? (
              <div className="empty-state">
                <Sparkles size={24} />
                <h2>No Quality Rules Found</h2>
                <p>
                  {datasets.length === 0
                    ? 'Connect a dataset first in the Datasets tab to discover candidate rules.'
                    : 'Click "Run AI Rule Discovery" above to analyze the dataset and generate quality rules.'}
                </p>
                {!isSupervision && datasets.length > 0 && (
                  <button className="button button-primary" onClick={handleDiscoverRules} type="button">
                    <Sparkles size={15} /> Discover Rules Now
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rules.map((rule) => {
                  const severityColors = {
                    ERROR: { bg: '#ef444420', text: '#f87171', border: '#ef444440' },
                    WARNING: { bg: '#f59e0b20', text: '#fbbf24', border: '#f59e0b40' },
                    INFO: { bg: '#3b82f620', text: '#60a5fa', border: '#3b82f640' },
                  }
                  const sevStyle = severityColors[rule.severity] || severityColors.INFO

                  const statusColors = {
                    PROPOSED: { bg: '#eab30820', text: '#facc15', label: 'Pending Review' },
                    APPROVED: { bg: '#10b98120', text: '#34d399', label: 'Approved ✓' },
                    REJECTED: { bg: '#ef444420', text: '#f87171', label: 'Rejected ✗' },
                  }
                  const statStyle = statusColors[rule.status] || statusColors.PROPOSED

                  return (
                    <div
                      key={rule.id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderLeft: `4px solid ${rule.status === 'APPROVED' ? '#10b981' : rule.status === 'REJECTED' ? '#ef4444' : '#f59e0b'}`,
                        borderRadius: '8px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                            {rule.column_name}
                          </span>
                          <span style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                            {rule.rule_type}
                          </span>
                          <span style={{ background: sevStyle.bg, color: sevStyle.text, border: `1px solid ${sevStyle.border}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {rule.severity}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: statStyle.bg, color: statStyle.text, padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                            {statStyle.label}
                          </span>

                          {!isSupervision && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {rule.status !== 'APPROVED' && (
                                <button
                                  className="button"
                                  onClick={() => handleReviewRule(rule.id, 'APPROVED')}
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#059669', color: '#fff', border: 'none' }}
                                  title="Approve this rule"
                                  type="button"
                                >
                                  <Check size={13} /> Approve
                                </button>
                              )}
                              {rule.status !== 'REJECTED' && (
                                <button
                                  className="button"
                                  onClick={() => handleReviewRule(rule.id, 'REJECTED')}
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#dc262620', color: '#f87171', border: '1px solid #ef444440' }}
                                  title="Reject this rule"
                                  type="button"
                                >
                                  <X size={13} /> Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#e2e8f0' }}>
                        {rule.description}
                      </p>

                      {rule.rationale && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.82rem', color: '#94a3b8', background: '#1e293b50', padding: '6px 10px', borderRadius: '4px' }}>
                          <Sparkles size={13} style={{ color: '#38bdf8', marginTop: '2px', flexShrink: 0 }} />
                          <span><strong>AI Rationale:</strong> {rule.rationale}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLER CONTRAT DE DONNÉES (DATA CONTRACT - ODCS) */}
        {activeTab === 'Contract' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                padding: '16px 20px',
                borderRadius: '8px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={20} style={{ color: '#38bdf8' }} />
                  Executable Data Contract (ODCS Spec v0.9.3)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Formalize schema schemas, assertions, and SLOs as version-controlled code for automated CI/CD gating.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {contract && (
                  <>
                    <button
                      className="button"
                      onClick={handleCopyYaml}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: copied ? '#059669' : '#1e293b',
                        color: copied ? '#ffffff' : '#e2e8f0',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                      }}
                      type="button"
                    >
                      {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy YAML'}
                    </button>

                    <button
                      className="button"
                      onClick={handleDownloadYaml}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                      }}
                      type="button"
                    >
                      <Download size={14} /> Download .yaml
                    </button>
                  </>
                )}

                {!isSupervision && (
                  <button
                    className="button"
                    disabled={contractGenerating || rules.length === 0}
                    onClick={handleGenerateContract}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                    }}
                    type="button"
                  >
                    <RefreshCw className={contractGenerating ? 'spin' : ''} size={14} />
                    {contractGenerating ? 'Compiling Contract...' : contract ? 'Re-compile Contract' : 'Compile Contract'}
                  </button>
                )}
              </div>
            </div>

            {contractMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: contractMsg.toLowerCase().includes('success') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${contractMsg.toLowerCase().includes('success') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: contractMsg.toLowerCase().includes('success') ? '#6ee7b7' : '#fca5a5',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {contractMsg.toLowerCase().includes('success') ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{contractMsg}</span>
              </div>
            )}

            {!contract && !contractLoading && (
              <div
                className="panel"
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px dashed rgba(148, 163, 184, 0.25)',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <FileCode size={28} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                  No Data Contract compiled yet
                </h3>
                <p style={{ margin: 0, maxWidth: '520px', color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  A Data Contract formalizes quality expectations as an executable ODCS specification (Open Data Contract Standard).
                  It binds dataset schema, approved assertions, and SLOs together.
                </p>

                {!isSupervision && (
                  <button
                    className="button"
                    disabled={contractGenerating || rules.length === 0}
                    onClick={handleGenerateContract}
                    style={{
                      marginTop: '10px',
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                    }}
                    type="button"
                  >
                    <Sparkles size={16} />
                    {contractGenerating ? 'Compiling Data Contract...' : 'Compile Contract from Rules'}
                  </button>
                )}

                {rules.length === 0 && (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#f59e0b' }}>
                    Tip: Go to the "Rules" tab to discover and approve quality rules first.
                  </p>
                )}
              </div>
            )}

            {contract && (
              <>
                {/* Métriques clés du contrat */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div className="panel" style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status & Version</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ background: '#05966920', color: '#34d399', border: '1px solid #10b98140', padding: '3px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700 }}>
                        {contract.status || 'ACTIVE'}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                        {contract.version || 'v1.0.0'}
                      </span>
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compiled Assertions</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>
                        {contract.contract_spec?.qualityRules?.length || 0}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>rules bound</span>
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Dataset</span>
                    <div style={{ marginTop: '6px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contract.contract_spec?.info?.dataset || 'Primary Dataset'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {contract.contract_spec?.schema?.length || 0} columns defined
                      </span>
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLO Gate Policy</span>
                    <div style={{ marginTop: '6px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f59e0b' }}>
                        {contract.contract_spec?.serviceLevelObjectives?.minimumQualityScore || 90}% Min Score
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block' }}>
                        {contract.contract_spec?.serviceLevelObjectives?.policyOnBreach || 'BLOCK_PIPELINE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sélecteur de vue : YAML pur vs Définitions tabulaires */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '10px' }}>
                  <button
                    className="button"
                    onClick={() => setContractViewMode('yaml')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      background: contractViewMode === 'yaml' ? '#0284c7' : 'transparent',
                      color: contractViewMode === 'yaml' ? '#ffffff' : '#94a3b8',
                      border: contractViewMode === 'yaml' ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                    type="button"
                  >
                    YAML Specification (ODCS)
                  </button>
                  <button
                    className="button"
                    onClick={() => setContractViewMode('assertions')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      background: contractViewMode === 'assertions' ? '#0284c7' : 'transparent',
                      color: contractViewMode === 'assertions' ? '#ffffff' : '#94a3b8',
                      border: contractViewMode === 'assertions' ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                    type="button"
                  >
                    Structured Schema & Assertions ({contract.contract_spec?.qualityRules?.length || 0})
                  </button>
                </div>

                {/* Vue YAML Specification */}
                {contractViewMode === 'yaml' && (
                  <div
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      background: '#090d16',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 16px',
                        background: '#131b2e',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                        fontSize: '0.8rem',
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                        datacontract.odcs.yaml
                      </span>
                      <span>Format: Open Data Contract Standard (ODCS 0.9.3)</span>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '18px 20px',
                        overflowX: 'auto',
                        fontSize: '0.85rem',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        lineHeight: 1.6,
                        color: '#e2e8f0',
                        maxHeight: '480px',
                      }}
                    >
                      {contract.yaml_content}
                    </pre>
                  </div>
                )}

                {/* Vue Structured Assertions */}
                {contractViewMode === 'assertions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="panel" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#f8fafc' }}>
                        Schema Definitions ({contract.contract_spec?.schema?.length || 0} fields)
                      </h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)', color: '#94a3b8' }}>
                              <th style={{ padding: '8px' }}>Column</th>
                              <th style={{ padding: '8px' }}>Logical Type</th>
                              <th style={{ padding: '8px' }}>Nullable</th>
                              <th style={{ padding: '8px' }}>Unique</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(contract.contract_spec?.schema || []).map((col, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                                <td style={{ padding: '8px', fontWeight: 600, color: '#f8fafc' }}>{col.column}</td>
                                <td style={{ padding: '8px', color: '#38bdf8' }}>{col.logicalType}</td>
                                <td style={{ padding: '8px', color: col.nullable ? '#f59e0b' : '#34d399' }}>{col.nullable ? 'YES' : 'NO'}</td>
                                <td style={{ padding: '8px', color: col.unique ? '#34d399' : '#94a3b8' }}>{col.unique ? 'YES' : 'NO'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#f8fafc' }}>
                        Enforced Quality Assertions ({contract.contract_spec?.qualityRules?.length || 0})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(contract.contract_spec?.qualityRules || []).map((ast, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#1e293b40',
                              border: '1px solid rgba(148, 163, 184, 0.1)',
                              borderRadius: '6px',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{ast.column}</span>
                              <span style={{ background: '#0284c720', color: '#38bdf8', border: '1px solid #0284c740', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                                {ast.assertion}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                {ast.description}
                              </span>
                            </div>
                            <span style={{ background: '#05966920', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {ast.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* AUTRES ONGLETS EN COURS DE DÉVELOPPEMENT */}
        {!['Overview', 'Datasets', 'Profile', 'Rules', 'Contract'].includes(activeTab) && (
          <div className="coming-soon-panel">
            <span className="coming-soon-icon"><Boxes size={20} aria-hidden="true" /></span>
            <p className="panel-eyebrow">{activeTab.toUpperCase()}</p>
            <h2>Coming in the next development phase</h2>
            <p>This workspace is prepared for {activeTab.toLowerCase()} capabilities. Next step is Deterministic Data Validation against Contract assertions.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default ProjectDetails