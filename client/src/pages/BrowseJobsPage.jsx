import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'

export default function BrowseJobsPage() {
  const [postings, setPostings] = useState([])
  const [applied, setApplied] = useState(new Set())
  const [saved, setSaved] = useState(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiRequest('/api/job-postings'), apiRequest('/api/saved-jobs')]).then(([jobs, savedJobs]) => {
      setPostings(jobs)
      setSaved(new Set(savedJobs.filter((job) => job.jobId).map((job) => String(job.jobId))))
    }).catch((requestError) => setError(requestError.message))
  }, [])

  const apply = async (posting) => {
    try {
      await apiRequest(`/api/job-postings/${posting._id}/apply`, { method: 'POST' })
      setApplied((current) => new Set([...current, posting._id]))
    } catch (requestError) { setError(requestError.message) }
  }

  const saveJob = async (posting) => {
    try {
      await apiRequest('/api/saved-jobs', { method: 'POST', body: JSON.stringify({ jobId: posting._id, title: posting.title, company: posting.company, jobDescription: posting.jobDescription, requiredSkills: posting.skills, jdSourceType: 'browse' }) })
      setSaved((current) => new Set([...current, posting._id]))
    } catch (requestError) { setError(requestError.message || 'Unable to save this job. Please try again.') }
  }

  return <DashboardLayout title="Browse Jobs" subtitle="Find your next interview opportunity"><div className="job-postings-toolbar"><span className="text-caption">{postings.length} open role{postings.length === 1 ? '' : 's'}</span></div>{error && <p className="form-error">{error}</p>}{postings.length ? <div className="saved-job-grid">{postings.map((posting) => <article className="panel-block saved-job-card" key={posting._id}><div className="saved-job-card__top"><div><h2>{posting.company}</h2><h3>{posting.title}</h3></div><span className="status-pill status-pill--stable">Published</span></div><div className="skill-tags">{posting.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><p className="job-description-preview">{posting.jobDescription}</p><div className="saved-job-card__actions"><button type="button" className="button button-primary button-small" onClick={() => apply(posting)} disabled={applied.has(posting._id)}>{applied.has(posting._id) ? 'Applied' : 'Apply now'}</button><button type="button" className="button button-ghost button-small" onClick={() => saveJob(posting)} disabled={saved.has(posting._id)}>{saved.has(posting._id) ? 'Saved' : 'Save job'}</button></div></article>)}</div> : <section className="panel-block empty-state"><div className="empty-state__icon">⌕</div><h2>No published jobs yet</h2><p className="text-caption">Check back soon for new opportunities.</p></section>}</DashboardLayout>
}
