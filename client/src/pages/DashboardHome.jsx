import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import StatCard from '../components/ui/StatCard'
import { scoreTone } from '../lib/score'
import { apiRequest } from '../lib/api'
import heroArt from '../../public/ai.png'

const recentInterviews = [
  // Mock data: replace with real API data later.
  { role: 'Frontend Engineer', type: 'Technical', date: 'Sep 12, 2026', score: 82, duration: '30 min', link: '/interview/report' },
  { role: 'Full Stack Developer', type: 'Mixed', date: 'Sep 08, 2026', score: 74, duration: '45 min', link: '/interview/report' },
  { role: 'Data Analyst', type: 'Behavioral', date: 'Sep 05, 2026', score: 91, duration: '60 min', link: '/interview/report' },
]

export default function DashboardHome() {
  const [recommendation, setRecommendation] = useState(null)

  useEffect(() => {
    apiRequest('/api/interviews').then((items) => apiRequest('/api/ai/recommend-practice', {
      method: 'POST',
      body: JSON.stringify({
        pastReports: items.slice(0, 5),
        resumeAnalysis: JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'),
      }),
    })).then(setRecommendation).catch(() => {})
  }, [])

  return (
    <DashboardLayout title="Good Morning, Alex! 👋" subtitle="Ready to practice and improve today?">
      <div className="dashboard-grid">
        <div className="stat-row">
          <StatCard icon="◌" value="12" label="Interviews completed" tone="indigo" />
          <StatCard icon="★" value="84%" label="Average score" tone="blue" score={84} />
          <StatCard icon="◔" value="7.5h" label="Hours practiced" tone="orange" />
          <StatCard icon="✓" value="04" label="Saved jobs" tone="green" />
        </div>

        <div className="feature-cta">
          <div className="feature-cta__copy">
            <h2>Start a New Interview <span className="inline-badge">AI Interview</span></h2>
            <p>Practice with realistic questions tailored to your resume and target role.</p>
            <div className="dashboard-cta-actions"><Link to="/new-interview" className="button button-primary">Get Started <span aria-hidden="true">↗</span></Link><Link to="/workspaces" className="button button-ghost">+ New Workspace</Link></div>
          </div>
          <div className="feature-cta__art" aria-hidden="true">
            <img src={heroArt} alt="" className="feature-cta__image" />
          </div>
        </div>

        {recommendation && <section className="panel-block">
          <div className="panel-header">
            <h3>Recommended Practice</h3>
            <Link to="/progress">View progress</Link>
          </div>
          <p className="text-caption">{recommendation.reasoning}</p>
          <div className="skill-tags">
            {(recommendation.recommendedTopics || []).slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}
          </div>
        </section>}

        <section className="panel-block">
          <div className="panel-header">
            <h3>Recent Interviews</h3>
            <Link to="/interview-history">View all</Link>
          </div>

          <div className="table-list">
            {recentInterviews.map((item) => (
              <div key={`${item.role}-${item.date}`} className="table-row">
                <div className="table-cell table-cell--role">
                  <strong>{item.role}</strong>
                  <small>{item.type}</small>
                </div>
                <div className="table-cell">
                  <span>{item.date}</span>
                </div>
                <div className="table-cell table-cell--score">
                  <span className={`score-pill ${scoreTone(item.score)}`}>{item.score}</span>
                </div>
                <div className="table-cell">
                  <span>{item.duration}</span>
                </div>
                <div className="table-cell table-cell--actions">
                  <Link to={item.link} className="inline-link">View</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
