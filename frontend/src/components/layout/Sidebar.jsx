import {
  Activity,
  ArrowUpRight,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  Gauge,
  LogOut,
  Settings,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clearStoredAuth, getStoredAuth } from '../../services/api.js'

const groups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: Gauge }],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'Analyses', icon: Activity, soon: true },
      { label: 'Contracts', icon: FileCheck2, soon: true },
      { label: 'Reports', icon: ClipboardCheck, soon: true },
    ],
  },
]

function Sidebar({ mobileOpen, onNavigate }) {
  const navigate = useNavigate()
  const auth = getStoredAuth()
  const user = auth?.user

  function handleSignOut() {
    clearStoredAuth()
    navigate('/login')
  }

  return (
    <>
      <button
        aria-label="Close navigation"
        className={`sidebar-scrim ${mobileOpen ? 'is-visible' : ''}`}
        onClick={onNavigate}
        tabIndex={mobileOpen ? 0 : -1}
        type="button"
      />
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <NavLink className="sidebar-brand" onClick={onNavigate} to="/">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <strong>Data Quality</strong>
            <small>Platform</small>
          </span>
        </NavLink>

        <div className="sidebar-workspace">
          <span className="workspace-avatar">{user ? user.role.charAt(0) : 'DQ'}</span>
          <span>
            <strong>{user ? `${user.role}` : 'Workspace'}</strong>
            <small>{user ? user.fullName : 'Personal environment'}</small>
          </span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </div>

        <nav aria-label="Main navigation" className="sidebar-nav">
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map(({ label, to, icon: Icon, soon }) =>
                soon ? (
                  <div className="nav-link nav-link-disabled" key={label} aria-disabled="true">
                    <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                    <span>{label}</span>
                    <small>Soon</small>
                  </div>
                ) : (
                  <NavLink
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                    end={to === '/dashboard'}
                    key={to}
                    onClick={onNavigate}
                    to={to}
                  >
                    <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                ),
              )}
            </section>
          ))}
          <section className="nav-group">
            <h2>System</h2>
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              onClick={onNavigate}
              to="/settings"
            >
              <Settings size={17} strokeWidth={1.7} aria-hidden="true" />
              <span>Settings</span>
            </NavLink>
          </section>
        </nav>

        <div className="sidebar-bottom">
          <div className="preview-note">
            <span className="preview-note-mark" />
            <span>
              <strong>{user ? `${user.role} Session` : 'UI preview'}</strong>
              <small>{user ? user.email : 'Demo data only'}</small>
            </span>
          </div>
          <button className="nav-link signout-link" onClick={handleSignOut} type="button">
            <LogOut size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>{user ? 'Sign out' : 'Exit preview'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar