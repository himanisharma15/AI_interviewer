import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'
import { scoreTone } from '../lib/score'

const tabs = ['paste', 'file', 'url']
const tabLabels = { paste: 'Paste JD', file: 'Upload file', url: 'Job URL' }

function formatSavedDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default function SavedJobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [sort, setSort] = useState('savedAt')
  const [isOpen, setIsOpen] = useState(false)
  const [sourceType, setSourceType] = useState('paste')
  const [company, setCompany] = useState('')
  const [jdText, setJdText] = useState('')
  const [resumeAnalysis] = useState(() => JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const loadJobs = async () => {
    try { setJobs(await apiRequest(`/api/saved-jobs?sort=${sort}`)) } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { loadJobs() }, [sort]) // eslint-disable-line react-hooks/exhaustive-deps, react/set-state-in-effect

  const saveJob = async (event) => {
    event.preventDefault()
    if (!jdText.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const jdAnalysis = await apiRequest('/api/ai/analyze-jd', { method: 'POST', body: JSON.stringify({ jobDescription: jdText }) })
      const match = await apiRequest('/api/ai/score-job-match', { method: 'POST', body: JSON.stringify({ resumeAnalysis, jdAnalysis }) })
      await apiRequest('/api/saved-jobs', {
        method: 'POST',
        body: JSON.stringify({
          company,
          roleTitle: jdAnalysis.jobRole || 'Untitled role',
          jdText,
          jdSourceType: sourceType,
          matchScore: Number(match.matchScore) || 0,
          requiredSkills: jdAnalysis.requiredSkills || [],
          seniority: jdAnalysis.experienceRequirements?.[0] || '',
        }),
      })
      setCompany(''); setJdText(''); setIsOpen(false); await loadJobs()
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  const removeJob = async (id) => {
    if (!window.confirm('Remove this saved job?')) return
    try { await apiRequest(`/api/saved-jobs/${id}`, { method: 'DELETE' }); setJobs((items) => items.filter((job) => job._id !== id)) } catch (requestError) { setError(requestError.message) }
  }

  return (
    <DashboardLayout title="Saved Jobs" subtitle="Job descriptions you're preparing for" action={<button type="button" className="button button-primary" onClick={() => setIsOpen(true)}>+ Save a Job</button>}>
      <div className="saved-jobs-toolbar"><span className="text-caption">{jobs.length} saved job{jobs.length === 1 ? '' : 's'}</span><label className="sort-control">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="savedAt">Date saved</option><option value="matchScore">Match score</option></select></label></div>
      {error && <p className="form-error">{error}</p>}
      {!jobs.length ? <section className="panel-block empty-state"><div className="empty-state__icon">☆</div><h2>Save a job description to get interview questions tailored to it</h2><button type="button" className="button button-primary" onClick={() => setIsOpen(true)}>+ Save a Job</button></section> : <div className="saved-job-grid">{jobs.map((job) => <article className="panel-block saved-job-card" key={job._id}><div className="saved-job-card__top"><div><h2>{job.company || 'Company not provided'}</h2><h3>{job.roleTitle}</h3></div><span className={`score-pill ${scoreTone(job.matchScore)}`}>{job.matchScore}% match</span></div><p className="text-caption">Saved {formatSavedDate(job.savedAt)}</p><div className="skill-tags">{job.requiredSkills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}{job.requiredSkills.length > 3 && <span>+{job.requiredSkills.length - 3} more</span>}</div><div className="saved-job-card__actions"><button type="button" className="button button-primary button-small" onClick={() => navigate('/new-interview', { state: { jobDescription: job.jdText } })}>Start Tailored Interview</button><button type="button" className="icon-button" onClick={() => removeJob(job._id)} aria-label={`Remove ${job.roleTitle}`}>×</button></div></article>)}</div>}

      {isOpen && <div className="modal-backdrop" role="presentation"><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="save-job-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Job library</p><h2 id="save-job-title">Save a Job</h2></div><button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Close">×</button></div><div className="source-tabs">{tabs.map((tab) => <button type="button" key={tab} className={sourceType === tab ? 'source-tab active' : 'source-tab'} onClick={() => setSourceType(tab)}>{tabLabels[tab]}</button>)}</div><form onSubmit={saveJob} className="form-stack"><label className="field-label">Company name<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Optional" /></label><label className="field-label">{sourceType === 'url' ? 'Job posting URL' : 'Job description'}{sourceType === 'file' ? <div className="upload-card upload-card--compact"><strong>Upload a text-based JD</strong><input type="file" accept=".txt,.pdf,.doc,.docx" onChange={async (event) => { const file = event.target.files?.[0]; if (file?.type === 'text/plain' || file?.name.endsWith('.txt')) setJdText(await file.text()) }} /><span className="choose-file">Choose File</span></div> : <textarea required rows="9" value={jdText} onChange={(event) => setJdText(event.target.value)} placeholder={sourceType === 'url' ? 'https://company.com/jobs/...' : 'Paste the full job description here...'} />}</label><button type="submit" className="button button-primary" disabled={isSaving || !jdText.trim()}>{isSaving ? 'Analyzing...' : 'Analyze and Save Job'}</button></form></section></div>}
    </DashboardLayout>
  )
}
