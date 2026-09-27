import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { formatCurrentDate } from '../lib/date'
import AIAssistant from '../components/AIAssistant'

function SidebarUserProfile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const name = user.name || user.email?.split('@')[0] || 'User'
  const email = user.email || ''
  const profileImage = user.profileImage || ''
  const role = user.role || 'user'
  const roleLabel = role === 'recruiter' ? 'Recruiter' : role === 'admin' ? 'Admin' : role === 'student' ? 'Student' : role === 'candidate' ? 'Candidate' : 'User'
  const initials = name.trim().charAt(0).toUpperCase() || 'U'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.assign('/login')
  }

  return (
    <div
      style={{
        marginTop: 'auto',
        marginBottom: '12px',
        padding: '16px 14px',
        borderRadius: '18px',
        background: 'linear-gradient(180deg, rgba(141, 119, 255, 0.12), rgba(16, 20, 34, 0.88))',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        {profileImage ? (
          <img
            src={profileImage}
            alt={name}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255, 255, 255, 0.28)',
              background: '#fff',
            }}
          />
        ) : (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              border: '2px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            {initials}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: '#f5f6ff', fontSize: '15px', fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          <div style={{ color: 'rgba(226, 232, 240, 0.8)', fontSize: '12px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {email}
          </div>
          <div style={{ color: 'rgba(168, 139, 250, 0.95)', fontSize: '11px', fontWeight: 600, marginTop: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {roleLabel}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 10px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#eff6ff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden="true">👤</span>
            View Profile
          </span>
          <span aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 10px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#eff6ff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden="true">⚙</span>
            Settings
          </span>
          <span aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 10px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.18)',
            color: '#fecaca',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden="true">🚪</span>
            Logout
          </span>
        </button>
      </div>
    </div>
  )
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', ownsRoute: true },
  { to: '/new-interview', label: 'New Interview', candidateOnly: true },
  { to: '/interview-history', label: 'Interview History', candidateOnly: true },
  { to: '/resume', label: 'My Resume', ownsRoute: true, candidateOnly: true },
  { to: '/saved-jobs', label: 'Saved Jobs', ownsRoute: true, candidateOnly: true },
  { to: '/browse-jobs', label: 'Browse Jobs', ownsRoute: true, recruiterOnly: false },
  { to: '/job-postings', label: 'Post a Job', ownsRoute: true, recruiterOnly: true },
  { to: '/workspaces', label: 'Workspaces', ownsRoute: true },
  { to: '/progress', label: 'Progress', ownsRoute: true, candidateOnly: true },
  { to: '/recruiter-dashboard', label: 'Recruiter Analytics', ownsRoute: true, recruiterOnly: true },
]

export default function DashboardLayout({ children, title, subtitle, action }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const dashboardLink = user.role === 'recruiter' ? '/recruiter-dashboard' : '/dashboard'
  const visibleNavItems = navItems
    .filter((item) => (!item.recruiterOnly || user.role === 'recruiter') && (!item.candidateOnly || user.role !== 'recruiter'))
    .map((item) => {
      if (item.label === 'Dashboard') return { ...item, to: dashboardLink }
      return item
    })
  return (
    <div className="dashboard-shell">
      <button
        type="button"
        className={`sidebar-backdrop ${isSidebarOpen ? 'is-visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Close navigation"
      />

      <aside className={`sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M6 17.5 10.5 5h3L18 17.5M8 13h8M16.8 6.2h.01" />
            </svg>
          </span>
          <span>interviewer</span>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              end
              className={({ isActive }) => (isActive && item.ownsRoute !== false ? 'sidebar-link active' : 'sidebar-link')}
            >
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <SidebarUserProfile />
      </aside>

      <main className="dashboard-main">
        <button type="button" className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation">
          <span />
          <span />
          <span />
        </button>
        <header className="dashboard-header">
          <div>
            <p className="eyebrow eyebrow--dark">{subtitle || 'Interview preparation'}</p>
            <h1>{title}</h1>
          </div>

          <div className="dashboard-header-actions">
            <span className="current-date">{formatCurrentDate()}</span>
            <label className="global-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" placeholder="Search" />
            </label>
            <div className="profile-pill" aria-label="Profile">AS</div>
            <NavLink to={dashboardLink} className="button button-ghost button-small back-home-button">← Home</NavLink>
          </div>
        </header>

        {action && <div className="page-action-row">{action}</div>}
        <div className="dashboard-content">{children}</div>
        <AIAssistant />
      </main>
    </div>
  )
}
