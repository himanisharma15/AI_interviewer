import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'
import { scoreTone } from '../lib/score'

const sourceTabs = ['browse', 'url', 'paste', 'upload', 'manual']
const sourceLabels = { browse: 'From Browse Jobs', url: 'Job URL', paste: 'Paste JD', upload: 'Upload JD', manual: 'Manual Entry' }
const statusOptions = ['Saved', 'Preparing', 'Applied', 'Interview Scheduled', 'Interviewed', 'Rejected', 'Offer']
const emptyDraft = { title: '', company: '', location: '', employmentType: '', experience: '', skills: [], jobDescription: '', sourceUrl: '', notes: '' }
const formatSavedDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))

export default function SavedJobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [sort, setSort] = useState('savedAt')
  const [selectedJob, setSelectedJob] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [sourceType, setSourceType] = useState('url')
  const [draft, setDraft] = useState(emptyDraft)
  const [pasteText, setPasteText] = useState('')
  const [url, setUrl] = useState('')
  const [resumeAnalysis] = useState(() => JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'))
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')

  const loadJobs = async () => {
    try {
      const params = new URLSearchParams({ sort })
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status', status)
      if (source) params.set('source', source)
      setJobs(await apiRequest(`/api/saved-jobs?${params}`))
    } catch { setError('Unable to load saved jobs.') }
  }

  useEffect(() => { loadJobs() }, [sort, status, source]) // eslint-disable-line react-hooks/exhaustive-deps, react/set-state-in-effect

  const stats = useMemo(() => ({
    total: jobs.length,
    preparing: jobs.filter((job) => job.status === 'Preparing').length,
    applied: jobs.filter((job) => job.status === 'Applied').length,
    interviews: jobs.filter((job) => ['Interview Scheduled', 'Interviewed'].includes(job.status)).length,
  }), [jobs])

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const analyzeText = async (text, type, sourceUrl = '') => {
    if (!text.trim()) return
    setIsExtracting(true); setError('')
    try {
      const extracted = await apiRequest('/api/ai/analyze-jd', { method: 'POST', body: JSON.stringify({ jobDescription: text }) })
      setDraft({ ...emptyDraft, title: extracted.jobRole || '', company: extracted.company || '', location: extracted.location || '', employmentType: extracted.employmentType || '', experience: extracted.experienceRequirements?.join(', ') || '', skills: extracted.requiredSkills || [], jobDescription: text, sourceUrl })
      setSourceType(type); setReviewing(true)
    } catch { setError('Unable to extract job information. Please check the JD and try again.') } finally { setIsExtracting(false) }
  }

  const importUrl = async (event) => {
    event.preventDefault()
    setIsExtracting(true); setError('')
    try {
      const imported = await apiRequest('/api/saved-jobs/import-url', { method: 'POST', body: JSON.stringify({ url }) })
      setDraft({ ...emptyDraft, title: imported.title || '', company: imported.company || '', location: imported.location || '', employmentType: imported.employmentType || '', experience: imported.experience || '', skills: imported.skills || [], jobDescription: imported.jobDescription || '', sourceUrl: imported.sourceUrl || url })
      setReviewing(true)
    } catch (requestError) { setError(requestError.message || 'Unable to import this URL. Please paste the job description instead.') } finally { setIsExtracting(false) }
  }

  const extractUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
      setError('For browser-based extraction, upload a .txt job description or use Paste JD.')
      return
    }
    analyzeText(await file.text(), 'upload')
  }

  const saveReviewedJob = async (event) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.jobDescription.trim()) { setError('Job title and job description are required.'); return }
    setIsSaving(true); setError('')
    try {
      const jdAnalysis = await apiRequest('/api/ai/analyze-jd', { method: 'POST', body: JSON.stringify({ jobDescription: draft.jobDescription }) })
      const match = await apiRequest('/api/ai/score-job-match', { method: 'POST', body: JSON.stringify({ resumeAnalysis, jdAnalysis }) })
      await apiRequest('/api/saved-jobs', { method: 'POST', body: JSON.stringify({ ...draft, requiredSkills: draft.skills, jdSourceType: sourceType, matchScore: Number(match.matchScore) || 0 }) })
      setDraft(emptyDraft); setPasteText(''); setUrl(''); setReviewing(false); setIsOpen(false); await loadJobs()
    } catch (requestError) { setError(requestError.message === 'Job already saved.' ? requestError.message : 'Unable to save this job. Please try again.') } finally { setIsSaving(false) }
  }

  const updateJob = async (id, updates) => {
    try {
      const updated = await apiRequest(`/api/saved-jobs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      setJobs((items) => items.map((job) => job._id === id ? updated : job))
      setSelectedJob((job) => job?._id === id ? updated : job)
    } catch { setError('Unable to update this saved job.') }
  }

  const prepareWithAi = async (job) => {
    setIsPreparing(true); setError('')
    try {
      const prepared = await apiRequest(`/api/saved-jobs/${job._id}/prepare`, { method: 'POST' })
      setJobs((items) => items.map((item) => item._id === job._id ? prepared : item)); setSelectedJob(prepared)
    } catch (requestError) { setError(requestError.message || 'Unable to prepare this job with AI.') } finally { setIsPreparing(false) }
  }

  const removeJob = async (id) => {
    if (!window.confirm('Remove this saved job?')) return
    try { await apiRequest(`/api/saved-jobs/${id}`, { method: 'DELETE' }); setJobs((items) => items.filter((job) => job._id !== id)); setSelectedJob(null) } catch { setError('Unable to remove saved job.') }
  }

  const renderPreparation = (preparation) => preparation && <div className="saved-job-ai">{Object.entries({ importantSkills: 'Important skills', technicalTopics: 'Technical topics', likelyInterviewQuestions: 'Interview questions', hrQuestions: 'HR questions', codingTopics: 'Coding and DSA', resumeKeywords: 'Resume keywords', weakAreas: 'Potential weak areas', preparationPlan: 'Preparation plan' }).map(([key, label]) => preparation[key]?.length ? <section key={key}><strong>{label}</strong><ul>{preparation[key].map((item) => <li key={item}>{item}</li>)}</ul></section> : null)}</div>

  const openSave = (type = 'url') => { setSourceType(type); setDraft(emptyDraft); setReviewing(false); setError(''); setIsOpen(true) }

  return (
    <DashboardLayout title="Saved Jobs" subtitle="Jobs you're preparing for" action={<button type="button" className="button button-primary" onClick={() => openSave()}>+ Save a Job</button>}>
      <div className="saved-job-stats"><div><strong>{stats.total}</strong><span>Total saved</span></div><div><strong>{stats.preparing}</strong><span>Preparing</span></div><div><strong>{stats.applied}</strong><span>Applied</span></div><div><strong>{stats.interviews}</strong><span>Interviews</span></div></div>
      <section className="saved-jobs-controls"><label className="global-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadJobs()} placeholder="Search title, company, or skill" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)}><option value="">All sources</option>{sourceTabs.map((item) => <option key={item} value={item}>{sourceLabels[item]}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="savedAt">Recently saved</option><option value="oldest">Oldest</option><option value="title">Job title</option><option value="matchScore">Match score</option></select></section>
      {error && <p className="form-error">{error}</p>}
      {!jobs.length ? <section className="panel-block empty-state"><div className="empty-state__icon">☆</div><h2>No saved jobs yet</h2><p className="text-caption">Save a job to start preparing personalized AI interview questions.</p><button type="button" className="button button-primary" onClick={() => openSave()}>+ Save a Job</button></section> : <div className="saved-job-grid">{jobs.map((job) => <article className="panel-block saved-job-card" key={job._id}><div className="saved-job-card__top"><div><h2>{job.company || 'Company not provided'}</h2><h3>{job.title || job.roleTitle}</h3></div><button type="button" className="bookmark-button" onClick={() => removeJob(job._id)} aria-label={`Remove ${job.title || job.roleTitle}`}>★</button></div><p className="text-caption">{job.location || 'Location not provided'}{job.employmentType ? ` · ${job.employmentType}` : ''} · Saved {formatSavedDate(job.savedAt)}</p><p className="text-caption">{job.experience || job.seniority || 'Experience not specified'} · Source: {job.jdSourceType}</p><div className="saved-job-card__meta"><span className={`score-pill ${scoreTone(job.matchScore)}`}>Resume Match: {job.matchScore}%</span><select value={job.status} onChange={(event) => updateJob(job._id, { status: event.target.value })} aria-label={`Status for ${job.title || job.roleTitle}`}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></div><div className="skill-tags">{(job.requiredSkills || []).slice(0, 5).map((skill) => <span key={skill}>{skill}</span>)}</div>{job.notes && <p className="saved-job-note">{job.notes}</p>}<div className="saved-job-card__actions"><button type="button" className="button button-primary button-small" onClick={() => prepareWithAi(job)} disabled={isPreparing}>Prepare with AI</button><button type="button" className="button button-ghost button-small" onClick={() => navigate('/new-interview', { state: { jobDescription: job.jobDescription || job.jdText, role: job.title || job.roleTitle } })}>Start Interview</button><button type="button" className="button button-ghost button-small" onClick={() => setSelectedJob(job)}>Details</button></div></article>)}</div>}

      {selectedJob && <div className="modal-backdrop" role="presentation"><section className="modal-panel saved-job-detail" role="dialog" aria-modal="true" aria-labelledby="saved-job-detail-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Saved job</p><h2 id="saved-job-detail-title">{selectedJob.title || selectedJob.roleTitle}</h2><p className="text-caption">{selectedJob.company}</p></div><button type="button" className="icon-button" onClick={() => setSelectedJob(null)} aria-label="Close">×</button></div><p>{selectedJob.jobDescription || selectedJob.jdText}</p><p className="text-caption">{selectedJob.location} · {selectedJob.employmentType} · {selectedJob.experience || selectedJob.seniority} · {selectedJob.jdSourceType}</p><div className="saved-job-detail__row"><span>Resume Match <strong>{selectedJob.matchScore}%</strong></span><label>Status<select value={selectedJob.status} onChange={(event) => updateJob(selectedJob._id, { status: event.target.value })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="field-label">Private notes<textarea rows="4" value={selectedJob.notes || ''} onChange={(event) => setSelectedJob((job) => ({ ...job, notes: event.target.value }))} /><button type="button" className="button button-primary button-small" onClick={() => updateJob(selectedJob._id, { notes: selectedJob.notes || '' })}>Save notes</button></label>{renderPreparation(selectedJob.aiPreparation)}<div className="saved-job-card__actions"><button type="button" className="button button-primary" onClick={() => navigate('/new-interview', { state: { jobDescription: selectedJob.jobDescription || selectedJob.jdText, role: selectedJob.title || selectedJob.roleTitle } })}>Start Interview</button><button type="button" className="button button-ghost" onClick={() => prepareWithAi(selectedJob)} disabled={isPreparing}>Prepare with AI</button><button type="button" className="button button-ghost" onClick={() => removeJob(selectedJob._id)}>Remove Saved Job</button></div></section></div>}

      {isOpen && <div className="modal-backdrop" role="presentation"><section className="modal-panel saved-job-import-modal" role="dialog" aria-modal="true" aria-labelledby="save-job-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Job library</p><h2 id="save-job-title">{reviewing ? 'Review Job Information' : 'Save a Job'}</h2></div><button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Close">×</button></div>{!reviewing && <div className="source-tabs">{sourceTabs.map((tab) => <button type="button" key={tab} className={sourceType === tab ? 'source-tab active' : 'source-tab'} onClick={() => { if (tab === 'browse') { navigate('/browse-jobs'); setIsOpen(false); return } setSourceType(tab); setError('') }}>{sourceLabels[tab]}</button>)}</div>}{error && <p className="form-error">{error}</p>}{reviewing ? <form onSubmit={saveReviewedJob} className="form-stack"><p className="text-caption">Confirm or edit the information extracted from your source before saving.</p><label className="field-label">Job title<input required value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label><label className="field-label">Company<input value={draft.company} onChange={(event) => updateDraft('company', event.target.value)} /></label><label className="field-label">Location<input value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} /></label><label className="field-label">Employment type<input value={draft.employmentType} onChange={(event) => updateDraft('employmentType', event.target.value)} /></label><label className="field-label">Experience<input value={draft.experience} onChange={(event) => updateDraft('experience', event.target.value)} /></label><label className="field-label">Skills<input value={draft.skills.join(', ')} onChange={(event) => updateDraft('skills', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label><label className="field-label">Job description<textarea required rows="8" value={draft.jobDescription} onChange={(event) => updateDraft('jobDescription', event.target.value)} /></label><label className="field-label">Private notes (optional)<textarea rows="3" value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Add a private note after reviewing the job." /></label><div className="saved-job-card__actions"><button type="button" className="button button-ghost" onClick={() => setReviewing(false)}>Edit source</button><button type="submit" className="button button-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Job'}</button></div></form> : sourceType === 'url' ? <form onSubmit={importUrl} className="form-stack"><label className="field-label">Paste Job URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://company.com/jobs/..." /></label><p className="text-caption">Public job pages are imported when technically accessible. If extraction fails, paste the JD instead.</p><button type="submit" className="button button-primary" disabled={isExtracting || !url.trim()}>{isExtracting ? 'Importing...' : 'Import and Review'}</button></form> : sourceType === 'paste' ? <form onSubmit={(event) => { event.preventDefault(); analyzeText(pasteText, 'paste') }} className="form-stack"><label className="field-label">Paste the complete job description<textarea required rows="10" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste the complete JD here. Title, company, and skills will be extracted automatically." /></label><button type="submit" className="button button-primary" disabled={isExtracting || !pasteText.trim()}>{isExtracting ? 'Extracting...' : 'Extract and Review'}</button></form> : sourceType === 'upload' ? <div className="form-stack"><div className="upload-card upload-card--compact"><strong>Upload a text-based job description</strong><p>Use a .txt file for browser extraction, or paste the text if your file format is not supported.</p><input type="file" accept=".txt" onChange={extractUpload} /><span className="choose-file">Choose File</span></div>{isExtracting && <p className="text-caption">Extracting job information...</p>}<button type="button" className="button button-ghost" onClick={() => { setSourceType('paste'); setError('') }}>Paste JD instead</button></div> : <form onSubmit={(event) => { event.preventDefault(); setDraft({ ...draft, title: draft.title.trim(), jobDescription: draft.jobDescription.trim() }); setReviewing(true) }} className="form-stack"><p className="text-caption">Use Manual Entry only when the source cannot be imported automatically.</p><label className="field-label">Job title<input required value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label><label className="field-label">Company<input value={draft.company} onChange={(event) => updateDraft('company', event.target.value)} /></label><label className="field-label">Location<input value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} /></label><label className="field-label">Job description<textarea required rows="8" value={draft.jobDescription} onChange={(event) => updateDraft('jobDescription', event.target.value)} /></label><button type="submit" className="button button-primary">Review Job Information</button></form>}</section></div>}
    </DashboardLayout>
  )
}
