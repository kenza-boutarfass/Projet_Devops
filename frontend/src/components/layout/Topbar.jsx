import { Bell, Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Topbar({ onMenuClick }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSearch(event) {
    event.preventDefault()
    navigate(`/projects${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
  }

  return (
    <header className="topbar">
      <button
        aria-label="Open navigation"
        className="icon-button mobile-menu-button"
        onClick={onMenuClick}
        type="button"
      >
        <Menu size={19} aria-hidden="true" />
      </button>
      <form className="topbar-search" onSubmit={handleSearch} role="search">
        <Search size={16} aria-hidden="true" />
        <label className="sr-only" htmlFor="global-search">Search projects</label>
        <input
          id="global-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects..."
          type="search"
          value={query}
        />
        <kbd>↵</kbd>
      </form>
      <div className="topbar-actions">
        <span className="topbar-environment">DEMO ENVIRONMENT</span>
        <button
          aria-label="Notifications are not available in this preview"
          className="icon-button notification-button"
          disabled
          title="Notifications coming in a later phase"
          type="button"
        >
          <Bell size={17} aria-hidden="true" />
          <span className="notification-dot" />
        </button>
        <div className="topbar-user" aria-label="Preview user">
          <span className="user-avatar">A</span>
          <span className="topbar-user-copy">
            <strong>Analyst</strong>
            <small>Preview account</small>
          </span>
        </div>
      </div>
    </header>
  )
}

export default Topbar