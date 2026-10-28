import { useState } from 'react'
import { KeyRound, SlidersHorizontal, UserRound, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getStoredAuth } from '../services/api.js'

const sections = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'api', label: 'API', icon: KeyRound },
]

function Settings() {
  const [activeSection, setActiveSection] = useState('profile')
  const user = getStoredAuth()?.user

  return (
    <div className="page-content page-enter settings-page">
      <PageHeader eyebrow="PERSONAL WORKSPACE" title="Settings" description="Review your account details and workspace options." />
      <div className="settings-layout">
        <nav aria-label="Settings sections" className="settings-nav">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              aria-current={activeSection === id ? 'page' : undefined}
              className={activeSection === id ? 'settings-nav-item settings-nav-active' : 'settings-nav-item'}
              key={id}
              onClick={() => setActiveSection(id)}
              type="button"
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <section className="settings-panel">
          <div className="settings-panel-heading">
            <div><p className="panel-eyebrow">{activeSection.toUpperCase()}</p><h2>{sections.find((item) => item.id === activeSection)?.label}</h2></div>
            <span className="demo-label">ACCOUNT DETAILS</span>
          </div>
          {activeSection === 'profile' && (
            <div className="settings-fields">
              <label className="field-group">Display name<input readOnly value={user?.fullName || 'Not signed in'} /></label>
              <label className="field-group">Email<input readOnly value={user?.email || 'Not signed in'} type="email" /></label>
              <p className="settings-help">Profile details are managed by your account. Editing them is not available here yet.</p>
            </div>
          )}
          {activeSection === 'preferences' && (
            <div className="settings-fields">
              <div className="settings-placeholder"><SlidersHorizontal size={19} /><h3>Preferences are coming soon</h3><p>Personalized preferences are not saved or applied yet.</p></div>
            </div>
          )}
          {activeSection === 'security' && (
            <div className="settings-placeholder"><ShieldCheck size={19} /><h3>Account security</h3><p>Sign-in and role-based access are managed by the application backend. Password changes and additional security controls are not available here yet.</p></div>
          )}
          {activeSection === 'api' && (
            <div className="settings-fields">
              <label className="field-group">API base URL<input readOnly value={import.meta.env.VITE_API_URL || 'http://localhost:5000/api'} /></label>
              <p className="settings-help">This workspace uses the application API. No API keys are stored in the browser settings.</p>
            </div>
          )}
          <div className="settings-panel-footer">
            <p>Workspace preferences are not editable here yet.</p>
            <button className="button button-primary" disabled type="button">Save changes · Coming soon</button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Settings