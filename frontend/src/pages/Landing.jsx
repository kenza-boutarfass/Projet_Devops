import { ArrowRight, CircleCheck, FileCode2, ScanSearch, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import LandingNav from '../components/navigation/LandingNav.jsx'
import Pipeline from '../components/navigation/Pipeline.jsx'
import AudienceSection from '../components/landing/AudienceSection.jsx'

const principles = [
  {
    number: '01',
    icon: ScanSearch,
    title: 'Understand before enforcing',
    text: 'Profile the shape of unfamiliar data first. Surface context and candidate rules for people to review.',
  },
  {
    number: '02',
    icon: FileCode2,
    title: 'Keep rules executable',
    text: 'Turn reviewed expectations into explicit contracts that can travel with the data workflow.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Keep validation deterministic',
    text: 'AI can help discover what to check. A deterministic engine should decide whether the checks pass.',
  },
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
              <p className="eyebrow eyebrow-gold">DATA QUALITY PLATFORM</p>
              <h1>From Messy Data<br /><em>to Executable Quality.</em></h1>
              <p className="hero-description">
                Understand heterogeneous data, discover quality rules with AI,
                generate executable contracts, and bring validation into DevOps.
              </p>
              <div className="hero-actions">
                <Button to="/register" icon={ArrowRight}>Get Started</Button>
                <a className="text-action" href="#workflow">Explore Platform <span aria-hidden="true">↓</span></a>
              </div>
              <div className="hero-footnote">
                <span className="hero-footnote-rule" />
                <span>AI-assisted discovery. Human-reviewed rules. Deterministic validation.</span>
              </div>
            </div>
            <div className="hero-visual" aria-label="Illustration of the proposed data quality workflow">
              <div className="visual-topline">
                <span>QUALITY LIFECYCLE</span>
                <span>01 — 07</span>
              </div>
              <Pipeline />
              <div className="visual-bottomline">
                <span className="visual-orbit" aria-hidden="true"><CircleCheck size={15} /></span>
                <span>Human review remains in the loop</span>
              </div>
            </div>
          </div>
          <div className="hero-bottom-rule">
            <span>DATA ENGINEERING</span><span>QUALITY SYSTEMS</span><span>DELIVERY CONFIDENCE</span>
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="landing-container workflow-layout">
          <div className="section-intro">
            <p className="section-kicker">A DIFFERENT STARTING POINT</p>
            <h2>Rules should come<br />from understanding.</h2>
          </div>
          <div className="workflow-copy">
            <p>
              Data quality often begins with rules someone already knows to write.
              This platform is designed to help teams find the rules hidden in data
              and documentation, make them reviewable, then run them consistently.
            </p>
            <div className="workflow-steps-inline">
              <span>Discover</span><i /><span>Review</span><i /><span>Execute</span>
            </div>
          </div>
        </div>
        <div className="landing-container">
          <Pipeline />
          <p className="workflow-disclaimer">Proposed product workflow · Capabilities are being built in phases</p>
        </div>
      </section>

      <AudienceSection />

      <section className="principles-section" id="principles">
        <div className="landing-container">
          <div className="principles-heading">
            <div>
              <p className="section-kicker">THE PRODUCT PRINCIPLES</p>
              <h2>Intelligence with<br />clear boundaries.</h2>
            </div>
            <p>Assist the people shaping quality. Keep the system that executes it transparent and predictable.</p>
          </div>
          <div className="principle-list">
            {principles.map(({ number, icon: Icon, title, text }) => (
              <article className="principle-row" key={number}>
                <span className="principle-number">{number}</span>
                <span className="principle-icon"><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
                <ArrowRight className="principle-arrow" size={18} aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span className="footer-label">DATA QUALITY PLATFORM</span>
          <span>Built for data teams · Product preview</span>
          <Link to="/dashboard">Open preview <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </footer>
    </main>
  )
}

export default Landing