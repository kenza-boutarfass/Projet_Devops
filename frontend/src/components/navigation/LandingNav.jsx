import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function LandingNav() {
  return (
    <header className="landing-nav">
      <Link className="landing-brand" to="/">
        <span className="brand-mark brand-mark-light" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span>Take Over My Work</span>
      </Link>
      <nav aria-label="Landing page navigation" className="landing-nav-links">
        <a href="#workflow">How it works</a>
        <a href="#audience">Who it helps</a>
      </nav>
      <div className="landing-nav-actions">
        <Link className="landing-login" to="/login">Sign in</Link>
        <Link className="landing-nav-cta" to="/register">
          Get Started <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </header>
  )
}

export default LandingNav