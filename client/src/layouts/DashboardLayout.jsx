import { NavLink } from 'react-router-dom'
import { formatCurrentDate } from '../lib/date'
import AIAssistant from '../components/AIAssistant'

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
  { to: '/dashboard', label: 'Settings', ownsRoute: false },
]

export default function DashboardLayout({ children, title, subtitle, action }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const visibleNavItems = navItems
    .filter((item) => (!item.recruiterOnly || user.role === 'recruiter') && (!item.candidateOnly || user.role !== 'recruiter'))
    .map((item) => (item.label === 'Dashboard' && user.role === 'recruiter' ? { ...item, to: '/recruiter-dashboard' } : item))
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
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
              end
              className={({ isActive }) => (isActive && item.ownsRoute !== false ? 'sidebar-link active' : 'sidebar-link')}
            >
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="upgrade-card">
          <p>Unlock full mock interviews and deeper insights.</p>
          <button type="button" className="button button-primary button-small">
            Upgrade to Pro
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
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
            <NavLink to="/dashboard" className="button button-ghost button-small back-home-button">← Home</NavLink>
          </div>
        </header>

        {action && <div className="page-action-row">{action}</div>}
        <div className="dashboard-content">{children}</div>
        <AIAssistant />
      </main>
    </div>
  )
}
