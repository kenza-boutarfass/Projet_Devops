import { useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, GraduationCap, Presentation } from 'lucide-react'
import ProfileCard from './ProfileCard.jsx'

const profiles = [
  {
    id: 'student',
    title: 'Student',
    discipline: 'STUDY / PREPARE',
    description: 'Organize your studies, summarize courses, prepare exams, create revision notes, and manage assignments.',
    capabilities: ['Plan study tasks', 'Work with course documents', 'Prepare revision materials', 'Track assignments'],
    footer: 'A workspace for your studies',
    icon: GraduationCap,
  },
  {
    id: 'professor',
    title: 'Professor',
    discipline: 'TEACH / ORGANIZE',
    description: 'Prepare exams and teaching materials, work with documents, and organize academic activities.',
    capabilities: ['Organize academic tasks', 'Prepare teaching content', 'Work with course documents', 'Plan activities'],
    footer: 'Support for teaching and academic work',
    icon: Presentation,
  },
  {
    id: 'professional',
    title: 'Professional',
    discipline: 'PLAN / DELIVER',
    description: 'Organize work, manage documents, plan tasks, prepare professional content, and streamline email workflows.',
    capabilities: ['Plan work tasks', 'Work with documents', 'Prepare professional content', 'Organize email workflows'],
    footer: 'A more organized working day',
    icon: BriefcaseBusiness,
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
            <p className="section-kicker">ONE PLATFORM · THREE PROFILES</p>
            <h2 id="audience-heading">Built around the way you work</h2>
          </div>
          <p>
            Whether you&apos;re studying, teaching, or working professionally, your profile shapes a workspace for organizing tasks and working with your materials.
          </p>
        </div>
        <div className="audience-cards">
          {profiles.map((profile, index) => (
            <ProfileCard index={index} isVisible={isVisible} key={profile.id} profile={profile} />
          ))}
        </div>
        <p className="audience-disclaimer">Some document, study-material, and email capabilities are planned and are not available yet.</p>
      </div>
    </section>
  )
}

export default AudienceSection