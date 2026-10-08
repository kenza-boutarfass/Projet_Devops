import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  function closeNavigation() {
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onNavigate={closeNavigation} />
      <div className="app-main min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="workspace-main" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell