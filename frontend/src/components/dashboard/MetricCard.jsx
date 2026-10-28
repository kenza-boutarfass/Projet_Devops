function MetricCard({ icon: Icon, label, value, change, note, status }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span className="metric-icon"><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span>
        <span className={`metric-${status.toLowerCase()}-label`}>{status}</span>
      </div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row">
        <strong className="metric-value">{value}</strong>
        <span className="metric-change">{change}</span>
      </div>
      <p className="metric-footnote">{note}</p>
    </article>
  )
}

export default MetricCard