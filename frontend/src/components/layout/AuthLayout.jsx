import { ArrowLeft, Database, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function AuthLayout({ children, heading, intro, mode }) {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="auth-brand" to="/">
          <span className="brand-mark brand-mark-light" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span>Data Quality Platform</span>
        </Link>
        <div className="auth-aside-content">
          <p className="eyebrow eyebrow-gold">ENGINEERED FOR TRUST</p>
          <h2>Make quality part of the data lifecycle.</h2>
          <p>Bring context, people and deterministic checks into one reviewable workflow.</p>
          <div className="auth-capabilities">
            <span><Database size={16} aria-hidden="true" /> Understand the data</span>
            <span><Sparkles size={16} aria-hidden="true" /> Discover candidate rules</span>
            <span><ShieldCheck size={16} aria-hidden="true" /> Validate with confidence</span>
          </div>
        </div>
        <p className="auth-aside-foot">Concept preview · No account data is stored</p>
      </aside>

      <section className="auth-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to overview
        </Link>
        <div className={`auth-card auth-card-${mode}`}>
          <p className="page-eyebrow">DATA QUALITY PLATFORM</p>
          <h1>{heading}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </div>
        <p className="auth-legal">Authentication is a visual preview and is not connected.</p>
      </section>
    </main>
  )
}

export default AuthLayout