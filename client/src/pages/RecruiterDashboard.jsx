import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import StatCard from '../components/ui/StatCard'
import { apiRequest } from '../lib/api'

const formatDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function RecruiterDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiRequest('/api/recruiter/analytics'), apiRequest('/api/recruiter/analytics/interviews')])
      .then(([summary, upcoming]) => { setAnalytics(summary); setInterviews(upcoming) })
      .catch((requestError) => setError(requestError.message))
  }, [])

  return <DashboardLayout title="Recruiter Dashboard" subtitle="A clear view of your interview pipeline"><div className="dashboard-grid recruiter-dashboard"><p className="bento-label">Workspace analytics</p>{error && <p className="form-error">{error}</p>}<div className="stat-row"><StatCard icon="◎" value={analytics?.activeCandidates ?? '—'} label="Active candidates" tone="indigo" /><StatCard icon="◷" value={analytics?.interviewsToday ?? '—'} label="Interviews today" tone="blue" /><StatCard icon="!" value={analytics?.pendingFeedback ?? '—'} label="Pending feedback" tone="orange" /><StatCard icon="✓" value={analytics?.completedInterviews ?? '—'} label="Completed interviews" tone="green" /></div><section className="panel-block"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Upcoming interviews</p><h2>Observe and manage</h2></div><span className="text-caption">{interviews.length} scheduled</span></div>{interviews.length ? interviews.map((interview) => <article className="workspace-round" key={interview._id}><div><p className="bento-label">{interview.type} · {interview.status}</p><h3>{interview.workspace?.jobRole}</h3><p className="text-caption">{interview.workspace?.candidateId?.name || interview.workspace?.candidateId?.email || 'Candidate'} · {formatDate(interview.scheduledAt)}</p></div><Link to={`/recruiter-interviews/${interview._id}`} className="button button-primary button-small">Observe Interview</Link></article>) : <p className="text-caption">No interviews have been scheduled yet.</p>}</section><section className="bento-card recruiter-dashboard__brief"><div className="bento-card__header"><p className="bento-label">Keep momentum</p><span>Across your workspaces</span></div><h2>{analytics ? `${analytics.pendingFeedback} feedback item${analytics.pendingFeedback === 1 ? '' : 's'} need your attention.` : 'Loading your interview pipeline...'}</h2><p className="text-caption">Open an interview to review candidate context, AI evaluation, and progress.</p></section></div></DashboardLayout>
}
