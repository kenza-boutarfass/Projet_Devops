import { ArrowRight, BookOpen, CheckCircle2, FileText, ListTodo, Mail, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import LandingNav from '../components/navigation/LandingNav.jsx'
import AudienceSection from '../components/landing/AudienceSection.jsx'

const features = [
  { icon: ListTodo, title: 'Task management', detail: 'Create, organize, and complete personal tasks.', status: 'Available' },
  { icon: FileText, title: 'Document assistance', detail: 'Work with your study and work documents.', status: 'Coming soon' },
  { icon: BookOpen, title: 'Content preparation', detail: 'Prepare revision and teaching materials.', status: 'Coming soon' },
  { icon: ShieldCheck, title: 'Human control', detail: 'Review proposed task actions before they run.', status: 'Available' },
  { icon: Mail, title: 'Email assistance', detail: 'Prepare and manage email workflows.', status: 'Coming soon' },
]

function Landing() {
  return (
    <main className="landing-page min-h-screen">
      <section className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-container landing-hero-inner">
          <LandingNav />
          <div className="hero-content">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-gold">YOUR PERSONAL AI AGENT</p>
              <h1>Your AI Agent.<br /><em>Your Work. Under Control.</em></h1>
              <p className="hero-description">
                Delegate tasks, work with your documents, organize your day, and manage your workflow with an AI agent designed around your needs.
              </p>
              <div className="hero-actions">
                <Button to="/register" icon={ArrowRight}>Get Started</Button>
                <a className="text-action" href="#features">Explore Features <span aria-hidden="true">↓</span></a>
              </div>
              <div className="hero-footnote">
                <span className="hero-footnote-rule" />
                <span>Actions stay transparent and under your control.</span>
              </div>
            </div>
            <div className="hero-visual" aria-label="Agent action lifecycle">
              <div className="visual-topline"><span>YOUR WORKFLOW</span><span>PLAN · REVIEW · ACT</span></div>
              <div className="agent-flow">
                {['Your instruction', 'Agent plans', 'You approve', 'Task completed'].map((step, index) => (
                  <div className="agent-flow-step" key={step}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{step}</strong>
                    {index < 3 && <ArrowRight size={16} aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <div className="visual-bottomline">
                <span className="visual-orbit" aria-hidden="true"><CheckCircle2 size={15} /></span>
                <span>Human approval before task creation</span>
              </div>
            </div>
          </div>
          <div className="hero-bottom-rule">
            <span>STUDY</span><span>TEACH</span><span>WORK</span>
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="landing-container workflow-layout">
          <div className="section-intro">
            <p className="section-kicker">FROM INSTRUCTION TO ACTION</p>
            <h2>Make room for<br />the work that matters.</h2>
          </div>
          <div className="workflow-copy">
            <p>
              Give your agent a task. It can currently prepare a task-creation plan for your review; once you approve, it creates and verifies that task in your workspace. Document and email assistance are planned, not connected yet.
            </p>
            <div className="workflow-steps-inline">
              <span>Instruct</span><i /><span>Review</span><i /><span>Approve</span><i /><span>Verify</span>
            </div>
          </div>
        </div>
        <div className="landing-container">
          <p className="workflow-disclaimer">Available agent action: create a personal task after your approval.</p>
        </div>
      </section>

      <section className="principles-section" id="features">
        <div className="landing-container">
          <div className="principles-heading">
            <div>
              <p className="section-kicker">WHAT YOUR WORKSPACE OFFERS</p>
              <h2>Useful tools,<br />clearly scoped.</h2>
            </div>
            <p>We distinguish live functionality from planned assistance. No simulated document access, email connection, or completed actions.</p>
          </div>
          <div className="principle-list">
            {features.map(({ icon: Icon, title, detail, status }, index) => (
              <article className="principle-row" key={title}>
                <span className="principle-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="principle-icon"><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{detail}</p></div>
                <span className={`feature-status ${status === 'Available' ? 'feature-status-live' : ''}`}>{status}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AudienceSection />

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span className="footer-label">TAKE OVER MY WORK</span>
          <span>Your tasks, your decisions.</span>
          <Link to="/register">Get Started <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </footer>
    </main>
  )
}

export default Landing
