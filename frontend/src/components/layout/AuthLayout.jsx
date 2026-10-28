import { ArrowLeft, BookOpen, ClipboardList, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

function AuthLayout({ children, heading, intro, mode }) {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="auth-brand" to="/">
          <span className="brand-mark brand-mark-light" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span>Take Over My Work</span>
        </Link>
        <div className="auth-aside-content">
          <p className="eyebrow eyebrow-gold">YOUR WORK, UNDER CONTROL</p>
          <h2>Turn your instructions into organized work.</h2>
          <p>Choose your profile and build a personal workspace for study, teaching, or professional tasks.</p>
          <div className="auth-capabilities">
            <span><ClipboardList size={16} aria-hidden="true" /> Organize your tasks</span>
            <span><FileText size={16} aria-hidden="true" /> Work with your documents</span>
            <span><BookOpen size={16} aria-hidden="true" /> Prepare and learn</span>
          </div>
        </div>
        <p className="auth-aside-foot">Your account is managed by the application backend.</p>
      </aside>

      <section className="auth-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to home
        </Link>
        <div className={`auth-card auth-card-${mode}`}>
          <p className="page-eyebrow">TAKE OVER MY WORK</p>
          <h1>{heading}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </div>
        <p className="auth-legal">Sign in or create an account to access your personal workspace.</p>
      </section>
    </main>
  )
}

export default AuthLayout