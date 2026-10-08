import { demoChecks } from '../../services/mockData.js'

function QualityOverview() {
  return (
    <section className="panel quality-panel" aria-labelledby="quality-heading">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">QUALITY OVERVIEW</p>
          <h2 id="quality-heading">Validation snapshot</h2>
        </div>
        <span className="demo-label">DEMO DATA</span>
      </div>
      <div className="quality-content">
        <div className="quality-ring" style={{ '--score': '92%' }} role="img" aria-label="Demo quality score: 92 percent">
          <div className="quality-ring-center">
            <strong>92<span>%</span></strong>
            <small>quality score</small>
          </div>
        </div>
        <div className="quality-legend">
          {demoChecks.map((check) => (
            <div className="quality-legend-row" key={check.label}>
              <span className={`legend-dot legend-${check.color}`} />
              <span>{check.label}</span>
              <strong>{String(check.value).padStart(2, '0')}</strong>
            </div>
          ))}
          <p className="quality-note">Illustrative snapshot · Not connected to live validation</p>
        </div>
      </div>
    </section>
  )
}

export default QualityOverview