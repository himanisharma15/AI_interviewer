import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'

const ratingFields = [{ key: 'technicalSkills', label: 'Technical skills' }, { key: 'communication', label: 'Communication' }, { key: 'problemSolving', label: 'Problem solving' }, { key: 'confidence', label: 'Confidence' }, { key: 'overall', label: 'Overall' }]
const formatDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))

export default function RecruiterInterviewPage() {
  const { id } = useParams()
  const [interview, setInterview] = useState(null)
  const [ratings, setRatings] = useState({ technicalSkills: 3, communication: 3, problemSolving: 3, confidence: 3, overall: 3 })
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    apiRequest(`/api/recruiter/analytics/interviews/${id}`).then((data) => {
      setInterview(data)
      if (data.feedback) { setRatings(data.feedback.ratings); setComments(data.feedback.comments || '') }
    }).catch((requestError) => setError(requestError.message))
  }, [id])

  const saveFeedback = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const feedback = await apiRequest(`/api/workspaces/${interview.workspace._id}/rounds/${id}/feedback`, { method: 'POST', body: JSON.stringify({ ratings, comments, visibleToCandidate: true }) })
      setInterview((current) => ({ ...current, feedback }))
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  if (error) return <DashboardLayout title="Interview" subtitle="Recruiter observation"><p className="form-error">{error}</p><Link to="/recruiter-dashboard" className="button button-ghost">Back to recruiter dashboard</Link></DashboardLayout>
  if (!interview) return <DashboardLayout title="Interview" subtitle="Recruiter observation"><section className="panel-block">Loading interview details...</section></DashboardLayout>

  const { round, workspace, candidate, aiReport } = interview
  const progress = round.questions?.length ? `${round.questions.filter((question) => question.answer).length} / ${round.questions.length}` : 'Not started'
  return <DashboardLayout title={`${workspace.jobRole} · ${round.type}`} subtitle="Observe interview"><Link to="/recruiter-dashboard" className="inline-link">← Recruiter dashboard</Link><div className="section-heading"><div><p className="text-caption">{formatDate(round.scheduledAt)} · {round.durationMinutes} minutes</p><h2>{candidate.name || candidate.email}</h2><p className="text-caption">{candidate.email} · {workspace.company}</p></div><span className="status-pill status-pill--stable">{round.status}</span></div>{error && <p className="form-error">{error}</p>}<div className="dashboard-grid"><section className="panel-block"><p className="eyebrow eyebrow--dark">Interview progress</p><h2>{progress}</h2><p className="text-caption">{round.questions?.length || 0} questions prepared for this round.</p>{round.questions?.map((question, index) => <article className="workspace-question" key={`${question.question}-${index}`}><p className="bento-label">Question {index + 1} · {question.category || round.questionType}</p><h3>{question.question}</h3><p className="text-caption">Candidate answer: {question.answer || 'Waiting for candidate response.'}</p></article>)}</section><section className="panel-block"><p className="eyebrow eyebrow--dark">Candidate and context</p><h2>{workspace.jobRole}</h2><p className="workspace-description">{workspace.jobDescription || 'No job description has been added yet.'}</p><p className="bento-label">AI evaluation</p>{aiReport ? <div className="stat-row"><div><span className="text-caption">Overall</span><strong>{aiReport.overallScore ?? '—'}%</strong></div><div><span className="text-caption">Technical</span><strong>{aiReport.technicalScore ?? '—'}%</strong></div><div><span className="text-caption">Communication</span><strong>{aiReport.communicationScore ?? '—'}%</strong></div></div> : <p className="text-caption">AI evaluation is not available yet.</p>}{interview.documents?.length > 0 && <><p className="bento-label">Resume and files</p>{interview.documents.map((document) => <p className="text-caption" key={document._id}>{document.filename} · {document.type}</p>)}</>}</section></div><section className="panel-block"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Recruiter feedback</p><h2>Submit your observation</h2></div><span className="text-caption">Visible to candidate</span></div><form onSubmit={saveFeedback} className="form-stack"><div className="feedback-rating-list">{ratingFields.map(({ key, label }) => <label className="feedback-rating" key={key}><span>{label}</span><select value={ratings[key]} onChange={(event) => setRatings((current) => ({ ...current, [key]: Number(event.target.value) }))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div><label className="field-label">Comments<textarea rows="5" value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Share strengths and specific next steps..." /></label><button type="submit" className="button button-primary button-small" disabled={isSaving}>{isSaving ? 'Submitting...' : interview.feedback ? 'Update Feedback' : 'Submit Feedback'}</button></form></section></DashboardLayout>
}
