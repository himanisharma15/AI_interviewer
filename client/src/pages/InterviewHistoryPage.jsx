import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'
import { scoreTone } from '../lib/score'

const pageSize = 8
const typeOptions = ['All', 'HR', 'Technical', 'Coding', 'Managerial', 'Mixed']
const statusOptions = ['All', 'Completed', 'In Progress', 'Cancelled']
const scoreOptions = ['All', '80+', '60-79', 'Below 60']
const dateOptions = ['All Time', 'Today', 'This Week', 'This Month', 'This Year']
const sortOptions = ['Newest First', 'Oldest First', 'Highest Score', 'Lowest Score']
const formatDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
const hasScore = (item) => Number.isFinite(Number(item.overallScore))
const getStatus = (item) => hasScore(item) ? 'Completed' : 'In Progress'
const getFeedback = (item) => item.recruiterFeedback || null
const scoreValue = (item) => hasScore(item) ? Number(item.overallScore) : null

function withinDateRange(value, range) {
  if (range === 'All Time') return true
  const date = new Date(value)
  const now = new Date()
  if (range === 'Today') return date.toDateString() === now.toDateString()
  if (range === 'This Year') return date.getFullYear() === now.getFullYear()
  const start = new Date(now)
  if (range === 'This Week') start.setDate(now.getDate() - 7)
  if (range === 'This Month') start.setMonth(now.getMonth() - 1)
  return date >= start
}

function Stat({ label, value, tone = '' }) {
  return <div className={`history-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>
}

export default function InterviewHistoryPage() {
  const [history, setHistory] = useState([])
  const [recruiterFeedback, setRecruiterFeedback] = useState([])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [status, setStatus] = useState('All')
  const [scoreFilter, setScoreFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [sort, setSort] = useState('Newest First')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [compareIds, setCompareIds] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = async () => {
    setIsLoading(true); setError('')
    try {
      const data = await apiRequest('/api/interviews/history')
      setHistory((data.interviews || []).map((item) => ({ ...item, role: item.role || 'Interview', type: item.interviewType || 'General' })))
      setRecruiterFeedback(data.recruiterFeedback || [])
    } catch { setError('Unable to load your interview history.') } finally { setIsLoading(false) }
  }

  useEffect(() => { loadHistory() }, [])

  const feedbackByRole = useMemo(() => new Map(recruiterFeedback.map((item) => [item.workspace?.jobRole?.toLowerCase(), item])), [recruiterFeedback])
  const enrichedHistory = useMemo(() => history.map((item) => ({ ...item, recruiterFeedback: item.recruiterFeedback || feedbackByRole.get(item.role.toLowerCase()) || null })), [history, feedbackByRole])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const items = enrichedHistory.filter((item) => {
      const score = scoreValue(item)
      const matchesQuery = !normalizedQuery || `${item.role} ${item.type} ${item.summary || ''}`.toLowerCase().includes(normalizedQuery)
      const matchesType = type === 'All' || item.type.toLowerCase().includes(type.toLowerCase())
      const matchesStatus = status === 'All' || getStatus(item) === status
      const matchesScore = scoreFilter === 'All' || (score !== null && (scoreFilter === '80+' ? score >= 80 : scoreFilter === '60-79' ? score >= 60 && score < 80 : score < 60))
      return matchesQuery && matchesType && matchesStatus && matchesScore && withinDateRange(item.createdAt, dateFilter)
    })
    return items.sort((a, b) => {
      if (sort === 'Oldest First') return new Date(a.createdAt) - new Date(b.createdAt)
      if (sort === 'Highest Score') return (scoreValue(b) ?? -1) - (scoreValue(a) ?? -1)
      if (sort === 'Lowest Score') return (scoreValue(a) ?? 101) - (scoreValue(b) ?? 101)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [dateFilter, enrichedHistory, query, scoreFilter, sort, status, type])

  useEffect(() => { setPage(1) }, [query, type, status, scoreFilter, dateFilter, sort])

  const scored = enrichedHistory.map(scoreValue).filter((score) => score !== null)
  const completed = enrichedHistory.filter((item) => getStatus(item) === 'Completed').length
  const average = scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : 0
  const best = scored.length ? Math.max(...scored) : 0
  const visibleItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const chartData = [...enrichedHistory].filter((item) => scoreValue(item) !== null).reverse().map((item) => ({ date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(item.createdAt)), score: scoreValue(item) }))
  const improvement = scored.length > 1 ? scored[0] - scored[scored.length - 1] : null
  const strongest = enrichedHistory.flatMap((item) => item.strongAreas || []).filter(Boolean)[0]
  const weak = enrichedHistory.flatMap((item) => item.weakAreas || []).filter(Boolean)[0]
  const typeCounts = enrichedHistory.reduce((counts, item) => ({ ...counts, [item.type]: (counts[item.type] || 0) + 1 }), {})
  const mostPracticed = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const toggleCompare = (id) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current)
  const compareItems = enrichedHistory.filter((item) => compareIds.includes(item._id))

  return (
    <DashboardLayout title="Your Interview Journey" subtitle="Review your past AI interviews, recruiter feedback and performance improvements." action={<span className="history-eyebrow">Interview History</span>}>
      {isLoading ? <div className="history-loading"><div className="history-stat-skeleton" /><div className="history-stat-skeleton" /><div className="history-stat-skeleton" /><div className="history-stat-skeleton" /><div className="panel-block history-chart-skeleton" /><div className="panel-block history-list-skeleton" /></div> : error ? <section className="panel-block history-empty"><h2>Unable to load your interview history.</h2><button type="button" className="button button-primary" onClick={loadHistory}>Try Again</button></section> : <>
        <section className="history-stats"><Stat label="Total Interviews" value={enrichedHistory.length} /><Stat label="Completed Interviews" value={completed} /><Stat label="Average AI Score" value={`${average}%`} /><Stat label="Best Score" value={`${best}%`} /><Stat label="Recruiter Reviews" value={recruiterFeedback.length} /><Stat label="Improvement" value={improvement === null ? 'N/A' : `${improvement >= 0 ? '+' : ''}${improvement}%`} /></section>
        <section className="history-overview-grid"><div className="panel-block history-chart-card"><div className="panel-header"><div><p className="eyebrow eyebrow--dark">Performance overview</p><h2>Interview Performance</h2></div></div>{chartData.length > 1 ? <ResponsiveContainer width="100%" height={250}><AreaChart data={chartData}><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} /><Tooltip /><Area type="monotone" dataKey="score" stroke="#6366f1" fill="#eef2ff" strokeWidth={3} /></AreaChart></ResponsiveContainer> : <div className="history-limited-data"><strong>{chartData.length ? `${chartData[0].score}% latest score` : 'No scored interviews yet'}</strong><span>Complete at least two scored interviews to see your performance trend.</span></div>}</div><section className="panel-block history-insights"><div className="panel-header"><h3>Your Interview Insights</h3></div>{enrichedHistory.length > 1 ? <div className="history-insight-list"><div><span>Strongest area</span><strong>{strongest || 'N/A'}</strong></div><div><span>Needs improvement</span><strong>{weak || 'N/A'}</strong></div><div><span>Recent trend</span><strong>{improvement === null ? 'N/A' : `${improvement >= 0 ? '+' : ''}${improvement}%`}</strong></div><div><span>Most practiced type</span><strong>{mostPracticed || 'N/A'}</strong></div></div> : <p className="text-caption">Complete more interviews to unlock performance insights.</p>}</section></section>
        <section className="history-toolbar panel-block"><label className="global-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by role or interview type..." /></label><select value={type} onChange={(event) => setType(event.target.value)}>{typeOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)}>{scoreOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{dateOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((item) => <option key={item}>{item}</option>)}</select></section>
        {compareIds.length > 0 && <div className="history-compare-bar"><span>{compareIds.length} selected</span><button type="button" className="button button-primary button-small" onClick={() => setShowCompare(true)} disabled={compareIds.length < 2}>Compare Interviews</button><button type="button" className="button button-ghost button-small" onClick={() => setCompareIds([])}>Clear</button></div>}
        {!enrichedHistory.length ? <section className="panel-block history-empty"><div className="empty-state__icon">◌</div><h2>No interviews yet</h2><p>Complete your first AI interview and your performance history will appear here.</p><Link to="/new-interview" className="button button-primary">Start Your First Interview</Link></section> : !visibleItems.length ? <section className="panel-block history-empty"><h2>No matching interviews</h2><p>Try changing your search or filters.</p></section> : <section className="history-list">{visibleItems.map((item) => { const score = scoreValue(item); const feedback = getFeedback(item); return <article className="panel-block history-card" key={item._id}><div className="history-card__select"><input type="checkbox" checked={compareIds.includes(item._id)} onChange={() => toggleCompare(item._id)} aria-label={`Select ${item.role} for comparison`} /></div><div className="history-card__main"><div className="history-card__heading"><div><p className="eyebrow eyebrow--dark">{item.type}</p><h2>{item.role}</h2><p className="text-caption">{formatDate(item.createdAt)} · {item.questions?.length || 0} questions</p></div><span className="status-pill status-pill--stable">{getStatus(item)}</span></div><div className="history-card__metrics"><div><span>AI Score</span><strong className={score === null ? '' : scoreTone(score)}>{score === null ? 'N/A' : `${score}%`}</strong></div><div><span>Technical</span><strong>{item.technicalScore ?? 'N/A'}</strong></div><div><span>Communication</span><strong>{item.communicationScore ?? 'N/A'}</strong></div><div><span>Recruiter</span><strong>{feedback ? 'Received' : 'Pending'}</strong></div></div><div className="skill-tags">{(item.recommendedTopics || []).slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}</div><div className="history-card__actions"><button type="button" className="button button-ghost button-small" onClick={() => setSelected(item)}>View Details</button><Link to={`/interview/report?id=${item._id}`} className="button button-primary button-small">View Report</Link><Link to="/new-interview" state={{ role: item.role, interviewType: item.interviewType }} className="button button-ghost button-small">Practice Again</Link></div></div></article>})}</section>}
        {filtered.length > pageSize && <div className="history-pagination"><span>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button type="button" className="button button-ghost button-small" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><strong>{page} / {pageCount}</strong><button type="button" className="button button-ghost button-small" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
      </>}
      {selected && <div className="modal-backdrop" role="presentation"><section className="modal-panel history-detail" role="dialog" aria-modal="true" aria-labelledby="history-detail-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Interview overview</p><h2 id="history-detail-title">{selected.role}</h2><p className="text-caption">{selected.type} · {formatDate(selected.createdAt)}</p></div><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Close">×</button></div><div className="history-detail__grid"><div><span>Status</span><strong>{getStatus(selected)}</strong></div><div><span>Score</span><strong>{scoreValue(selected) === null ? 'N/A' : `${scoreValue(selected)}%`}</strong></div><div><span>Questions</span><strong>{selected.questions?.length || 0}</strong></div><div><span>Recruiter feedback</span><strong>{getFeedback(selected) ? 'Received' : 'Pending'}</strong></div></div>{selected.summary && <section><h3>AI feedback</h3><p>{selected.summary}</p></section>}{selected.strongAreas?.length > 0 && <section><h3>Strengths</h3><ul>{selected.strongAreas.map((item) => <li key={item}>{item}</li>)}</ul></section>}{selected.weakAreas?.length > 0 && <section><h3>Needs improvement</h3><ul>{selected.weakAreas.map((item) => <li key={item}>{item}</li>)}</ul></section>}<div className="history-card__actions"><Link to={`/interview/report?id=${selected._id}`} className="button button-primary">View Full Report</Link><Link to="/new-interview" state={{ role: selected.role, interviewType: selected.interviewType }} className="button button-ghost">Practice Again</Link></div></section></div>}
      {showCompare && <div className="modal-backdrop" role="presentation"><section className="modal-panel history-compare" role="dialog" aria-modal="true" aria-labelledby="compare-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Performance comparison</p><h2 id="compare-title">Compare Interviews</h2></div><button type="button" className="icon-button" onClick={() => setShowCompare(false)} aria-label="Close">×</button></div><div className="history-compare-table">{compareItems.map((item) => <div className="history-compare-row" key={item._id}><strong>{item.role}</strong><span>{formatDate(item.createdAt)}</span><span>AI: {scoreValue(item) === null ? 'N/A' : `${scoreValue(item)}%`}</span><span>Technical: {item.technicalScore ?? 'N/A'}</span><span>Communication: {item.communicationScore ?? 'N/A'}</span><span>Problem solving: {item.problemSolvingScore ?? 'N/A'}</span></div>)}</div></section></div>}
    </DashboardLayout>
  )
}
