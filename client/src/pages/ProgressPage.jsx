import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'
import { scoreTone } from '../lib/score'

const categoryFields = [
  { label: 'Technical', field: 'technicalScore', color: '#4F46E5' },
  { label: 'Communication', field: 'communicationScore', color: '#F59E0B' },
  { label: 'Problem Solving', field: 'problemSolvingScore', color: '#10B981' },
  { label: 'JD Relevance', field: 'jdRelevanceScore', color: '#6366F1' },
]

const dayKey = (date) => new Date(date).toISOString().slice(0, 10)
const shortDate = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date))
const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length) : 0

function practiceStreak(interviews) {
  const days = new Set(interviews.map((item) => dayKey(item.createdAt)))
  let cursor = new Date()
  let streak = 0
  while (days.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

function getWeakAreas(interviews) {
  const counts = new Map()
  interviews.forEach((item) => (item.weakAreas || []).forEach((area) => counts.set(area, (counts.get(area) || 0) + 1)))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function getQuestionCategories(interviews) {
  const counts = new Map()
  interviews.forEach((item) => (item.questions || []).forEach((question) => { if (question.category) counts.set(question.category, (counts.get(question.category) || 0) + 1) }))
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, percentage: total ? Math.round((count / total) * 100) : 0 }))
}

function weeklyBars(interviews) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now)
    start.setDate(now.getDate() - ((5 - index) * 7) - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { label: `W${index + 1}`, count: interviews.filter((item) => { const date = new Date(item.createdAt); return date >= start && date <= end }).length }
  })
}

function timelineDays(interviews) {
  const now = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))
    const key = dayKey(date)
    return { key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), items: interviews.filter((item) => dayKey(item.createdAt) === key) }
  })
}

function statusForCount(count) { return count >= 3 ? 'Urgent' : count === 2 ? 'Moderate' : 'Stable' }

export default function ProgressPage() {
  const [interviews, setInterviews] = useState([])
  const [recommendation, setRecommendation] = useState(null)
  const [error, setError] = useState('')
  const [weeklyGoal, setWeeklyGoal] = useState(() => Number(localStorage.getItem('weeklyInterviewGoal')) || 3)

  useEffect(() => {
  const loadProgress = async () => {
    try {
      setError('')

      const items = await apiRequest('/api/interviews')

      setInterviews(items || [])

      // Do not call AI if there are no interviews
      if (!items || items.length === 0) {
        setRecommendation(null)
        return
      }

      // AI recommendation is only needed when interviews exist
      try {
        const recommendation = await apiRequest('/api/ai/recommend-practice', {
          method: 'POST',
          body: JSON.stringify({
            pastReports: items.slice(0, 5),
            resumeAnalysis: JSON.parse(
              localStorage.getItem('resumeAnalysis') || '{}'
            )
          })
        })

        setRecommendation(recommendation)
      } catch (aiError) {
        // AI failure should NOT break the Progress page
        console.error('Practice recommendation failed:', aiError)
        setRecommendation(null)
      }

    } catch (requestError) {
      console.error('Failed to load progress:', requestError)
      setError(requestError.message || 'Failed to load progress data.')
    }
  }

  loadProgress()
}, [])

  const sorted = useMemo(() => [...interviews].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [interviews])
  const summary = useMemo(() => {
    const scores = interviews.map((item) => item.overallScore)
    return { average: average(scores), best: scores.length ? Math.max(...scores.map((score) => Number(score) || 0)) : 0, streak: practiceStreak(interviews) }
  }, [interviews])
  const weakAreas = useMemo(() => getWeakAreas(interviews), [interviews])
  const categories = useMemo(() => getQuestionCategories(interviews), [interviews])
  const categoryTrends = useMemo(() => categoryFields.map((item) => { const values = sorted.map((interview) => interview[item.field]); const recent = Number(values.at(-1)) || 0; const previous = Number(values.at(-2)) || recent; return { ...item, value: average(values), delta: recent - previous } }), [sorted])
  const scoreTrend = useMemo(() => sorted.map((item) => ({ ...item, dateLabel: shortDate(item.createdAt) })), [sorted])
  const monthlyCount = useMemo(() => { const now = new Date(); return interviews.filter((item) => { const date = new Date(item.createdAt); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).length }, [interviews])
  const volumeData = useMemo(() => weeklyBars(interviews), [interviews])
  const timeline = useMemo(() => timelineDays(interviews), [interviews])
  const readinessScore = useMemo(() => Math.max(0, Math.min(100, Math.round((summary.average * 0.78) + (Math.min(summary.streak, 10) * 1.5) - (weakAreas.length * 2)))), [summary, weakAreas])
  const currentWeekCount = volumeData.at(-1)?.count || 0
  const weeklyProgress = Math.min(100, Math.round((currentWeekCount / weeklyGoal) * 100))

  const handleWeeklyGoalChange = (event) => {
    const nextGoal = Math.max(1, Number(event.target.value) || 1)
    setWeeklyGoal(nextGoal)
    localStorage.setItem('weeklyInterviewGoal', String(nextGoal))
  }

  return (
    <DashboardLayout title="Progress" subtitle="Track how you're improving over time">
      {error && <p className="form-error">{error}</p>}
      {!interviews.length ? <section className="panel-block empty-state"><div className="empty-state__icon">↗</div><h2>Complete your first interview to start tracking progress</h2><Link to="/new-interview" className="button button-primary">Start an Interview</Link></section> : <div className="progress-bento">
        <section className="bento-card bento-card--insight"><p className="bento-label">Score Insight</p><strong className={`bento-score ${scoreTone(summary.average)}`}>{summary.average}%</strong><p className="bento-copy">{sorted.length >= 6 ? `Your Technical score is ${Math.abs(categoryTrends[0].delta)}% ${categoryTrends[0].delta >= 0 ? 'up' : 'down'} versus the previous interview.` : 'Complete more interviews to see trends.'}</p><div className="score-meter"><span style={{ left: `${summary.average}%` }} /></div><div className="meter-labels"><span>Beginner</span><span>Advanced</span></div><div className="streak-summary"><div><span className="bento-label">Current streak</span><strong>{summary.streak} days</strong></div><div className="badge-row">{summary.streak >= 5 && <span className="milestone-badge">5-day streak</span>}{interviews.length >= 10 && <span className="milestone-badge">10 interviews</span>}</div></div></section>
        <section className="bento-card bento-card--readiness"><p className="bento-label">Interview Readiness</p><strong className="readiness-score">{readinessScore}%</strong><p className="bento-copy">Driven by your average score, practice streak, and remaining weak areas.</p><div className="score-meter"><span style={{ left: `${readinessScore}%` }} /></div></section>
        <section className="bento-card bento-card--volume"><div className="bento-card__header"><p className="bento-label">Interviews Over Time</p><span>This month</span></div><strong className="bento-number">{monthlyCount}</strong><div className="weekly-goal"><label htmlFor="weekly-goal">Weekly goal</label><input id="weekly-goal" type="number" min="1" value={weeklyGoal} onChange={handleWeeklyGoalChange} /><span>{currentWeekCount} of {weeklyGoal} this week</span><div className="weekly-goal__track"><span style={{ width: `${weeklyProgress}%` }} /></div></div><div className="mini-chart"><ResponsiveContainer width="100%" height={120}><BarChart data={volumeData}><Bar dataKey="count" radius={[5, 5, 0, 0]}>{volumeData.map((item, index) => <Cell key={item.label} fill={index === volumeData.length - 1 ? '#4F46E5' : '#c7d2fe'} />)}</Bar><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><Tooltip /></BarChart></ResponsiveContainer></div></section>
        <section className="bento-card bento-card--focus"><p className="bento-label">Recommended Focus</p>{(recommendation?.recommendedTopics || weakAreas.slice(0, 3).map(([area]) => area)).slice(0, 3).map((topic, index) => <div className="focus-item" key={topic}><span className={`focus-icon focus-icon--${index}`}>{topic.charAt(0).toUpperCase()}</span><div><strong>{topic}</strong><small>{recommendation?.reasoning || `Flagged in ${weakAreas.find(([area]) => area === topic)?.[1] || 1} recent reports`}</small></div></div>)}</section>
        <section className="bento-card bento-card--timeline"><div className="bento-card__header"><p className="bento-label">Practice Timeline</p><span>This week</span></div><div className="timeline-grid">{timeline.map((day) => <div className="timeline-day" key={day.key}><span>{day.label}</span>{day.items.map((item) => <div className={`timeline-block timeline-block--${(item.interviewType || 'mixed').toLowerCase().replace('/', '-')}`} key={item._id}>{item.role || 'Interview'}<small>{item.interviewType || 'Mixed'}</small></div>)}</div>)}</div></section>
        <section className="bento-card bento-card--gaps"><p className="bento-label">Skill Gaps</p><div className="skill-gap-table"><div className="skill-gap-row skill-gap-head"><span>Skill</span><span>Status</span><span>Frequency</span></div>{weakAreas.slice(0, 5).map(([area, count]) => <div className="skill-gap-row" key={area}><strong>{area}</strong><span className={`status-pill status-pill--${statusForCount(count).toLowerCase()}`}>{statusForCount(count)}</span><small>Flagged in {count} report{count === 1 ? '' : 's'}</small></div>)}</div></section>
        <section className="bento-card bento-card--topics"><p className="bento-label">Most Practiced Topics</p>{categories.length ? categories.map((item) => <div className="topic-row" key={item.label}><div><span>{item.label}</span><b>{item.percentage}%</b></div><div className="topic-progress"><span style={{ width: `${item.percentage}%` }} /></div></div>) : <p className="text-caption">Question categories will appear after interview records include them.</p>}</section>
        <section className="bento-card bento-card--trend"><div className="bento-card__header"><p className="bento-label">Score Trend</p><div className="trend-legend"><span><i className="dot dot--overall" />Overall {summary.average}</span><span><i className="dot dot--technical" />Technical {categoryTrends[0].value}</span><span><i className="dot dot--communication" />Communication {categoryTrends[1].value}</span></div></div><ResponsiveContainer width="100%" height={220}><LineChart data={scoreTrend}><CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" /><XAxis dataKey="dateLabel" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Line type="monotone" dataKey="overallScore" stroke="#4F46E5" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="technicalScore" stroke="#F59E0B" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="communicationScore" stroke="#10B981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></section>
        <section className="bento-card bento-card--radar"><div className="bento-card__header"><p className="bento-label">Skill Radar</p><span>Average by skill</span></div><ResponsiveContainer width="100%" height={260}><RadarChart data={categoryTrends}><PolarGrid /><PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} /><Radar dataKey="value" stroke="#4F46E5" fill="#818cf8" fillOpacity={0.35} /></RadarChart></ResponsiveContainer></section>
        <section className="bento-card bento-card--assistant"><div className="assistant-orb" onClick={() => document.querySelector('.ai-assistant__bubble')?.click()} role="button" tabIndex="0" aria-label="Open AI Assistant"><span>↗</span></div><p className="bento-label">AI Assistant</p><input placeholder="Ask about your progress..." onFocus={() => document.querySelector('.ai-assistant__bubble')?.click()} /></section>
      </div>}
    </DashboardLayout>
  )
}
