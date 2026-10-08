import { useState } from 'react'
import { KeyRound, SlidersHorizontal, UserRound, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'

const sections = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'api', label: 'API', icon: KeyRound },
]

function Settings() {
  const [activeSection, setActiveSection] = useState('profile')
  const [message, setMessage] = useState('')

  return (
    <div className="page-content page-enter settings-page">
      <PageHeader eyebrow="SYSTEM" title="Settings" description="Preferences for this local product preview." />
      <div className="settings-layout">
        <nav aria-label="Settings sections" className="settings-nav">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              aria-current={activeSection === id ? 'page' : undefined}
              className={activeSection === id ? 'settings-nav-item settings-nav-active' : 'settings-nav-item'}
              key={id}
              onClick={() => { setActiveSection(id); setMessage('') }}
              type="button"
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <section className="settings-panel">
          <div className="settings-panel-heading">
            <div><p className="panel-eyebrow">{activeSection.toUpperCase()}</p><h2>{sections.find((item) => item.id === activeSection)?.label}</h2></div>
            <span className="demo-label">VISUAL PREVIEW</span>
          </div>
          {activeSection === 'profile' && (
            <div className="settings-fields">
              <label className="field-group">Display name<input defaultValue="Analyst" /></label>
              <label className="field-group">Email<input defaultValue="analyst@example.com" type="email" /></label>
            </div>
          )}
          {activeSection === 'preferences' && (
            <div className="settings-fields">
              <label className="field-group">Timezone<select defaultValue="UTC"><option>UTC</option><option>Europe/Paris</option><option>America/New_York</option></select></label>
              <label className="settings-toggle"><span><strong>Product updates</strong><small>Receive updates when features become available.</small></span><input defaultChecked type="checkbox" /></label>
            </div>
          )}
          {activeSection === 'security' && (
            <div className="settings-placeholder"><ShieldCheck size={19} /><h3>Account security is not connected</h3><p>Authentication and security controls will be added with the backend identity phase.</p></div>
          )}
          {activeSection === 'api' && (
            <div className="settings-fields">
              <label className="field-group">API base URL<input readOnly value={import.meta.env.VITE_API_URL || 'Not configured'} /></label>
              <p className="settings-help">No API keys are stored in this preview. The current service only calls the health endpoint.</p>
            </div>
          )}
          <div className="settings-panel-footer">
            <p>{message || 'Changes are visual only and are not saved.'}</p>
            <button className="button button-primary" onClick={() => setMessage('Preview only: changes were not saved.')} type="button">Save changes</button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Settings