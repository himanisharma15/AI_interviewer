import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'

const emptyForm = { title: '', company: '', jobDescription: '', skills: '' }

export default function JobPostingsPage() {
  const navigate = useNavigate()
  const [postings, setPostings] = useState([])
  const [applications, setApplications] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPosting, setSelectedPosting] = useState(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadPostings = async () => {
    try { setPostings(await apiRequest('/api/job-postings')) } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { loadPostings() }, []) // eslint-disable-line react-hooks/exhaustive-deps, react/set-state-in-effect

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const savePosting = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const posting = await apiRequest('/api/job-postings', { method: 'POST', body: JSON.stringify({ ...form, skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean) }) })
      setPostings((items) => [posting, ...items])
      setForm(emptyForm)
      setIsOpen(false)
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  const updateStatus = async (posting, status) => {
    try {
      const updated = await apiRequest(status === 'published' ? `/api/job-postings/${posting._id}/publish` : `/api/job-postings/${posting._id}`, { method: 'PATCH', body: JSON.stringify(status === 'published' ? {} : { status }) })
      setPostings((items) => items.map((item) => item._id === updated._id ? updated : item))
    } catch (requestError) { setError(requestError.message) }
  }

  const viewApplications = async (posting) => {
    navigate(`/job-postings/${posting._id}/applicants`)
  }

  const selectCandidate = async (application) => {
    try {
      await apiRequest(`/api/job-postings/${selectedPosting._id}/applications/${application._id}/select`, { method: 'POST' })
      setApplications((items) => items.map((item) => item._id === application._id ? { ...item, status: 'selected' } : item))
    } catch (requestError) { setError(requestError.message) }
  }

  return <DashboardLayout title="Job Postings" subtitle="Find candidates for your open roles" action={<button type="button" className="button button-primary" onClick={() => setIsOpen(true)}>+ New Job Posting</button>}><div className="job-postings-toolbar"><span className="text-caption">{postings.length} posting{postings.length === 1 ? '' : 's'}</span></div>{error && <p className="form-error">{error}</p>}{postings.length ? <div className="saved-job-grid">{postings.map((posting) => <article className="panel-block saved-job-card" key={posting._id}><div className="saved-job-card__top"><div><h2>{posting.company}</h2><h3>{posting.title}</h3></div><span className={`status-pill status-pill--${posting.status === 'published' ? 'stable' : posting.status === 'closed' ? 'urgent' : 'moderate'}`}>{posting.status}</span></div><p className="text-caption">{posting.skills.length ? posting.skills.join(' · ') : 'No skills listed'}</p><div className="saved-job-card__actions"><button type="button" className="button button-ghost button-small" onClick={() => viewApplications(posting)}>View applicants</button>{posting.status !== 'published' && posting.status !== 'closed' && <button type="button" className="button button-primary button-small" onClick={() => updateStatus(posting, 'published')}>Publish</button>}{posting.status === 'published' && <button type="button" className="button button-ghost button-small" onClick={() => updateStatus(posting, 'closed')}>Close</button>}</div></article>)}</div> : <section className="panel-block empty-state"><div className="empty-state__icon">+</div><h2>Create your first job posting</h2><button type="button" className="button button-primary" onClick={() => setIsOpen(true)}>+ New Job Posting</button></section>}{selectedPosting && <section className="panel-block applications-panel"><div className="panel-header"><div><h3>Applicants for {selectedPosting.title}</h3><p className="text-caption">{applications.length} application{applications.length === 1 ? '' : 's'}</p></div><button type="button" className="icon-button" onClick={() => setSelectedPosting(null)} aria-label="Close applicants">×</button></div>{applications.length ? applications.map((application) => <div className="table-row" key={application._id}><div className="table-cell table-cell--role"><strong>{application.candidateId?.name || application.candidateId?.email || 'Candidate'}</strong><small>{application.candidateId?.email}</small></div><div className="table-cell"><span className={`status-pill status-pill--${application.status === 'selected' ? 'stable' : application.status === 'rejected' ? 'urgent' : 'moderate'}`}>{application.status}</span></div><div className="table-cell table-cell--actions">{application.status === 'applied' || application.status === 'reviewing' ? <button type="button" className="button button-primary button-small" onClick={() => selectCandidate(application)}>Select</button> : application.status === 'selected' ? <span className="text-caption">Workspace created</span> : null}</div></div>) : <p className="text-caption">No candidates have applied yet.</p>}</section>}{isOpen && <div className="modal-backdrop" role="presentation"><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="new-posting-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Recruiter tools</p><h2 id="new-posting-title">New Job Posting</h2></div><button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Close">×</button></div><form onSubmit={savePosting} className="form-stack"><label className="field-label">Job title<input required name="title" value={form.title} onChange={updateForm} placeholder="Frontend Engineer" /></label><label className="field-label">Company<input required name="company" value={form.company} onChange={updateForm} placeholder="Company name" /></label><label className="field-label">Skills<input name="skills" value={form.skills} onChange={updateForm} placeholder="React, JavaScript, CSS" /></label><label className="field-label">Job description<textarea required name="jobDescription" rows="9" value={form.jobDescription} onChange={updateForm} placeholder="Describe the role and responsibilities..." /></label><button type="submit" className="button button-primary" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Draft'}</button></form></section></div>}</DashboardLayout>
}
