import { useEffect, useRef, useState } from 'react'
import { ClipboardCheck, GraduationCap, Workflow } from 'lucide-react'
import ProfileCard from './ProfileCard.jsx'

const profiles = [
  {
    id: 'student',
    title: 'Students',
    discipline: 'LEARN / BUILD',
    description: 'Learn data quality through real projects, automated analysis, and executable quality rules.',
    capabilities: ['Create projects', 'Explore datasets', 'Analyze data quality', 'Discover quality rules', 'Generate reports'],
    footer: 'A practical path from concepts to applied work',
    icon: GraduationCap,
  },
  {
    id: 'professor',
    title: 'Professors',
    discipline: 'TEACH / REVIEW',
    description: 'Monitor student projects, review analyses, and gain a clear view of data quality and progress.',
    capabilities: ['Follow student projects', 'Review analyses', 'Monitor quality', 'Access reports', 'Track progress'],
    footer: 'A shared view for teaching and review',
    icon: ClipboardCheck,
  },
  {
    id: 'professional',
    title: 'Professionals',
    discipline: 'ENGINEER / OPERATE',
    description: 'Transform complex datasets into reliable data contracts, automated validations, and actionable quality insights.',
    capabilities: ['Manage projects', 'Analyze datasets', 'Define quality rules', 'Generate data contracts', 'Automate validation'],
    footer: 'Quality workflows designed for delivery',
    icon: Workflow,
  },
]

function AudienceSection() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    let observer
    const revealFallback = window.setTimeout(() => setIsVisible(true), 2200)
    const revealWhenVisible = () => {
      const bounds = section.getBoundingClientRect()
      if (bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0) {
        setIsVisible(true)
        window.clearTimeout(revealFallback)
        observer?.disconnect()
        window.removeEventListener('scroll', revealWhenVisible)
      }
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) revealWhenVisible()
      }, { threshold: 0 })
      observer.observe(section)
    }

    window.addEventListener('scroll', revealWhenVisible, { passive: true })
    revealWhenVisible()

    return () => {
      window.clearTimeout(revealFallback)
      observer?.disconnect()
      window.removeEventListener('scroll', revealWhenVisible)
    }
  }, [])

  return (
    <section aria-labelledby="audience-heading" className="audience-section" id="audience" ref={sectionRef}>
      <div className="landing-container">
        <div className="audience-heading-row">
          <div>
            <p className="section-kicker">ONE PLATFORM · THREE DATA JOURNEYS</p>
            <h2 id="audience-heading">Built for every data journey</h2>
          </div>
          <p>
            Whether you&apos;re learning, teaching, or working with real-world data,
            the platform provides a path to understand, validate, and improve data quality.
          </p>
        </div>
        <div className="audience-cards">
          {profiles.map((profile, index) => (
            <ProfileCard index={index} isVisible={isVisible} key={profile.id} profile={profile} />
          ))}
        </div>
        <p className="audience-disclaimer">Profile capabilities are part of the product direction and are not all available in this preview.</p>
      </div>
    </section>
  )
}

export default AudienceSection