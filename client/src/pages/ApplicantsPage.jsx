import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'

export default function ApplicantsPage() {
  const { id } = useParams()
  const [posting, setPosting] = useState(null)
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/api/job-postings').then((items) => {
      const selected = items.find((item) => item._id === id)
      if (!selected) throw new Error('Job posting not found.')
      setPosting(selected)
      return apiRequest(`/api/job-postings/${id}/applications`)
    }).then(setApplications).catch((requestError) => setError(requestError.message))
  }, [id])

  const selectCandidate = async (application) => {
    try {
      await apiRequest(`/api/job-postings/${id}/applications/${application._id}/select`, { method: 'POST' })
      setApplications((items) => items.map((item) => item._id === application._id ? { ...item, status: 'selected' } : item))
    } catch (requestError) { setError(requestError.message) }
  }

  return <DashboardLayout title="Applicants" subtitle={posting ? `${posting.company} · ${posting.title}` : 'Review candidates'}><Link to="/job-postings" className="inline-link">← Back to postings</Link>{error && <p className="form-error">{error}</p>}{posting && <section className="panel-block applications-panel"><div className="panel-header"><div><h3>{posting.title}</h3><p className="text-caption">{applications.length} application{applications.length === 1 ? '' : 's'}</p></div></div>{applications.length ? applications.map((application) => <div className="table-row" key={application._id}><div className="table-cell table-cell--role"><strong>{application.candidateId?.name || application.candidateId?.email || 'Candidate'}</strong><small>{application.candidateId?.email}</small></div><div className="table-cell"><span className={`status-pill status-pill--${application.status === 'selected' ? 'stable' : application.status === 'rejected' ? 'urgent' : 'moderate'}`}>{application.status}</span></div><div className="table-cell table-cell--actions">{application.status === 'applied' ? <button type="button" className="button button-primary button-small" onClick={() => selectCandidate(application)}>Select</button> : application.status === 'selected' ? <span className="text-caption">Workspace created</span> : null}</div></div>) : <p className="text-caption">No candidates have applied yet.</p>}</section>}</DashboardLayout>
}
