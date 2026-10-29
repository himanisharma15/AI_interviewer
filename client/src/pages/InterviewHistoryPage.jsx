import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { scoreTone } from '../lib/score'
import BackHomeButton from '../components/BackHomeButton'
import { formatCurrentDate } from '../lib/date'
import { apiRequest } from '../lib/api'

const formatDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
const toHistoryItem = (interview) => ({ ...interview, role: interview.role || 'Interview', type: interview.interviewType || 'General', date: formatDate(interview.createdAt), score: Number(interview.overallScore) || 0 })

export default function InterviewHistoryPage() {
  const [searchValue, setSearchValue] = useState('')
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [recruiterFeedback, setRecruiterFeedback] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/api/interviews/history').then(({ interviews, recruiterFeedback: feedback }) => {
      const items = interviews.map(toHistoryItem)
      setHistory(items)
      setFilteredHistory(items)
      setRecruiterFeedback(feedback || [])
    }).catch((requestError) => setError(requestError.message))
  }, [])

  const handleSearch = async (event) => {
    event.preventDefault()
    const query = searchValue.trim()
    if (!query) return setFilteredHistory(history)
    try {
      const filters = await apiRequest('/api/ai/parse-search', { method: 'POST', body: JSON.stringify({ query }) })
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
      const dateTo = filters.dateTo ? new Date(filters.dateTo) : null
      if (dateTo) dateTo.setHours(23, 59, 59, 999)
      setFilteredHistory(history.filter((item) => {
        const itemDate = new Date(item.createdAt)
        return (!filters.role || item.role.toLowerCase().includes(String(filters.role).toLowerCase())) && (!filters.interviewType || item.type.toLowerCase().includes(String(filters.interviewType).toLowerCase())) && (filters.minScore === undefined || item.score >= Number(filters.minScore)) && (filters.maxScore === undefined || item.score <= Number(filters.maxScore)) && (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo)
      }))
    } catch {
      setFilteredHistory(history.filter((item) => `${item.role} ${item.type}`.toLowerCase().includes(query.toLowerCase())))
    }
  }

  return <div className="page-shell history-page"><header className="history-header"><div><p className="eyebrow eyebrow--dark">Interview History</p><h1>View your AI interviews and recruiter feedback</h1></div><div className="dashboard-header-actions"><span className="current-date">{formatCurrentDate()}</span><form className="global-search" onSubmit={handleSearch}><span aria-hidden="true">⌕</span><input type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search interviews" /></form><div className="profile-pill" aria-label="Profile">AS</div><BackHomeButton /></div></header>{error && <p className="form-error">{error}</p>}<div className="panel-block table-panel"><table><thead><tr><th>Role &amp; Interview Type</th><th>Date</th><th>AI Score</th><th>Recruiter Feedback</th><th>Actions</th></tr></thead><tbody>{filteredHistory.length ? filteredHistory.map((item) => <tr key={item._id}><td><div className="role-cell"><strong>{item.role}</strong><small>{item.type}</small></div></td><td>{item.date}</td><td><span className={`score-pill ${scoreTone(item.score)}`}>{item.score || '—'}</span></td><td>{item.recruiterFeedback ? <span className="text-caption">{item.recruiterFeedback.ratings?.overall}/5 · Feedback submitted</span> : <span className="text-caption">Pending</span>}</td><td><Link to={`/interview/report?id=${item._id}`} className="button button-ghost button-small">View</Link></td></tr>) : <tr><td colSpan="5"><p className="text-caption">No saved interviews yet. Complete an interview to see it here.</p></td></tr>}</tbody></table></div>{recruiterFeedback.length > 0 && <section className="panel-block"><div className="panel-header"><h3>Recruiter Feedback</h3><span>{recruiterFeedback.length} review{recruiterFeedback.length === 1 ? '' : 's'}</span></div>{recruiterFeedback.map((feedback) => <article className="feedback-card" key={feedback._id}><p className="bento-label">{feedback.workspace?.jobRole || 'Interview'} · {feedback.round?.type || 'Round'}</p><div className="feedback-rating-list">{Object.entries(feedback.ratings || {}).map(([key, value]) => <div className="feedback-rating" key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><strong>{value}/5</strong></div>)}</div><p>{feedback.comments || 'No additional comments were provided.'}</p></article>)}</section>}</div>
}
