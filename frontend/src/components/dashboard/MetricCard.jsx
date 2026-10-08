function MetricCard({ icon: Icon, label, value, change }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span className="metric-icon"><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span>
        <span className="demo-label">DEMO</span>
      </div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row">
        <strong className="metric-value">{value}</strong>
        <span className="metric-change">{change}</span>
      </div>
      <p className="metric-footnote">Illustrative data</p>
    </article>
  )
}

export default MetricCard