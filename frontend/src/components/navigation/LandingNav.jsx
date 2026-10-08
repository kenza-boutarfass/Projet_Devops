import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function LandingNav() {
  return (
    <header className="landing-nav">
      <Link className="landing-brand" to="/">
        <span className="brand-mark brand-mark-light" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span>Data Quality Platform</span>
      </Link>
      <nav aria-label="Landing page navigation" className="landing-nav-links">
        <a href="#workflow">Workflow</a>
        <a href="#principles">Principles</a>
      </nav>
      <div className="landing-nav-actions">
        <Link className="landing-login" to="/login">Sign in</Link>
        <Link className="landing-nav-cta" to="/register">
          Get started <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </header>
  )
}

export default LandingNav