import {
  Database,
  FileCheck2,
  GitBranch,
  ListChecks,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const steps = [
  { label: 'Messy data', icon: Database },
  { label: 'Profile', icon: ScanLine },
  { label: 'AI discovery', icon: Sparkles },
  { label: 'Quality rules', icon: ListChecks },
  { label: 'Data contract', icon: FileCheck2 },
  { label: 'Validation', icon: ShieldCheck },
  { label: 'Quality gate', icon: GitBranch },
]

function Pipeline() {
  return (
    <div className="pipeline" aria-label="Data quality workflow, proposed for future phases">
      <div className="pipeline-track" aria-hidden="true" />
      <ol className="pipeline-steps">
        {steps.map(({ label, icon: Icon }, index) => (
          <li className={`pipeline-step ${index < 2 ? 'pipeline-step-ready' : ''}`} key={label}>
            <span className="pipeline-node">
              <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="pipeline-label">{label}</span>
            {index < steps.length - 1 && (
              <span className="pipeline-connector" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      <p className="pipeline-caption">
        <span className="pipeline-live-dot" />
        A reviewable path from raw inputs to deployment decisions
      </p>
    </div>
  )
}

export default Pipeline