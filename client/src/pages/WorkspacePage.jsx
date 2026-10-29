import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'

const tabs = ['Overview', 'Job Description', 'Resume', 'Interview Rounds', 'AI Preparation', 'Feedback', 'Messages', 'Documents', 'Notes', 'Activity']
const roundTypes = ['HR', 'Technical', 'Coding', 'Managerial', 'Final']
const roundStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled']

const roundStatusTone = { Scheduled: 'moderate', 'In Progress': 'urgent', Completed: 'stable', Cancelled: 'urgent' }
const feedbackFields = [{ key: 'technicalSkills', label: 'Technical skills' }, { key: 'communication', label: 'Communication' }, { key: 'problemSolving', label: 'Problem solving' }, { key: 'confidence', label: 'Confidence' }, { key: 'overall', label: 'Overall' }]
const documentTypes = ['resume', 'jd', 'portfolio', 'certificate', 'code', 'other']
const noteActions = [{ key: 'explain', label: 'Explain' }, { key: 'improve', label: 'Improve' }, { key: 'generate-readme', label: 'Generate README' }, { key: 'explain-code', label: 'Explain Code' }]
const publicFieldLabels = { resume: 'Resume', achievements: 'Achievements', skills: 'Skills', interviewSummary: 'Interview summary', status: 'Interview status' }
const formatRoundDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))
const renderMarkdown = (value = '') => value.split('\n').map((line) => {
  const escaped = escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>')
  if (escaped.startsWith('### ')) return `<h4>${escaped.slice(4)}</h4>`
  if (escaped.startsWith('## ')) return `<h3>${escaped.slice(3)}</h3>`
  if (escaped.startsWith('# ')) return `<h2>${escaped.slice(2)}</h2>`
  if (/^[-*] /.test(escaped)) return `<li>${escaped.slice(2)}</li>`
  return escaped ? `<p>${escaped}</p>` : '<br />'
}).join('')

export default function WorkspacePage() {
  const { id } = useParams()
  const [workspace, setWorkspace] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [error, setError] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [rounds, setRounds] = useState([])
  const [roundForm, setRoundForm] = useState({ type: 'Technical', interviewerName: '', scheduledAt: '', durationMinutes: 60, instructions: '' })
  const [isCreatingRound, setIsCreatingRound] = useState(false)
  const [invitationNotice, setInvitationNotice] = useState('')
  const [invitationNoticeType, setInvitationNoticeType] = useState('success')
  const [focusRoundId, setFocusRoundId] = useState('')
  const [focusForm, setFocusForm] = useState({ focusTopics: '', difficulty: 'Intermediate', durationMinutes: 60, questionType: 'Technical' })
  const [isSavingFocus, setIsSavingFocus] = useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [feedbackByRound, setFeedbackByRound] = useState({})
  const [feedbackForm, setFeedbackForm] = useState({ technicalSkills: 3, communication: 3, problemSolving: 3, confidence: 3, overall: 3, comments: '', visibleToCandidate: true })
  const [isSavingFeedback, setIsSavingFeedback] = useState(false)
  const [improvementPlan, setImprovementPlan] = useState(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [documents, setDocuments] = useState([])
  const [documentForm, setDocumentForm] = useState({ type: 'other', filename: '', fileText: '' })
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [notes, setNotes] = useState([])
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [noteForm, setNoteForm] = useState({ title: '', contentMarkdown: '' })
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteAction, setNoteAction] = useState('')
  const [noteActionResult, setNoteActionResult] = useState('')
  const [activity, setActivity] = useState([])
  const [isSavingPublicSettings, setIsSavingPublicSettings] = useState(false)
  const [publicLinkCopied, setPublicLinkCopied] = useState(false)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    apiRequest(`/api/workspaces/${id}`).then(setWorkspace).catch((requestError) => setError(requestError.message))
  }, [id])

  useEffect(() => {
    if (!['Interview Rounds', 'AI Preparation', 'Feedback'].includes(activeTab)) return
    apiRequest(`/api/workspaces/${id}/rounds`).then(async (items) => {
      setRounds(items)
      setFocusRoundId((current) => current || items[0]?._id || '')
      if (activeTab === 'Feedback') {
        const entries = await Promise.all(items.map(async (round) => [round._id, await apiRequest(`/api/workspaces/${id}/rounds/${round._id}/feedback`)]))
        setFeedbackByRound(Object.fromEntries(entries))
      }
    }).catch((requestError) => setError(requestError.message))
  }, [activeTab, id]) // eslint-disable-line react/set-state-in-effect

  useEffect(() => {
    const round = rounds.find((item) => item._id === focusRoundId)
    if (round) setFocusForm({ focusTopics: round.focusTopics.join(', '), difficulty: round.difficulty, durationMinutes: round.durationMinutes, questionType: round.questionType }) // eslint-disable-line react/set-state-in-effect
  }, [focusRoundId, rounds]) // eslint-disable-line react/set-state-in-effect

  useEffect(() => {
    const feedback = feedbackByRound[focusRoundId]
    if (feedback) setFeedbackForm({ ...feedback.ratings, comments: feedback.comments || '', visibleToCandidate: feedback.visibleToCandidate }) // eslint-disable-line react/set-state-in-effect
  }, [feedbackByRound, focusRoundId]) // eslint-disable-line react/set-state-in-effect

  useEffect(() => {
    if (activeTab === 'Documents') apiRequest(`/api/workspaces/${id}/documents`).then(setDocuments).catch((requestError) => setError(requestError.message))
    if (activeTab === 'Notes') apiRequest(`/api/workspaces/${id}/notes`).then((items) => { setNotes(items); setSelectedNoteId((current) => current || items[0]?._id || '') }).catch((requestError) => setError(requestError.message))
  }, [activeTab, id])

  useEffect(() => {
    if (activeTab === 'Activity') apiRequest(`/api/workspaces/${id}/activity`).then(setActivity).catch((requestError) => setError(requestError.message))
  }, [activeTab, id])

  useEffect(() => {
    const note = notes.find((item) => item._id === selectedNoteId)
    if (note) setNoteForm({ title: note.title, contentMarkdown: note.contentMarkdown }) // eslint-disable-line react/set-state-in-effect
  }, [notes, selectedNoteId]) // eslint-disable-line react/set-state-in-effect

  const acceptInvite = async () => {
    setIsAccepting(true)
    try { setWorkspace(await apiRequest(`/api/workspaces/${id}/accept`)) } catch (requestError) { setError(requestError.message) } finally { setIsAccepting(false) }
  }

  const savePublicSettings = async (nextFields, rotateSlug = false) => {
    setIsSavingPublicSettings(true)
    setError('')
    try {
      const settings = await apiRequest(`/api/workspaces/${id}/public-settings`, { method: 'PATCH', body: JSON.stringify({ publicFields: nextFields, rotateSlug }) })
      setWorkspace((current) => ({ ...current, ...settings }))
    } catch (requestError) { setError(requestError.message) } finally { setIsSavingPublicSettings(false) }
  }

  const togglePublicSharing = (event) => {
    const enabled = event.target.checked
    const nextFields = enabled ? { ...publicFields, status: true } : Object.fromEntries(Object.keys(publicFields).map((field) => [field, false]))
    savePublicSettings(nextFields, enabled && !workspace.publicSlug)
  }

  const copyPublicLink = async () => {
    if (!workspace?.publicSlug) return
    await navigator.clipboard.writeText(`${window.location.origin}/interview-workspace/${workspace.publicSlug}/public`)
    setPublicLinkCopied(true)
    window.setTimeout(() => setPublicLinkCopied(false), 1800)
  }

  const renderPublicSharing = () => <div className="public-sharing"><div className="public-sharing__header"><div><p className="bento-label">Public profile</p><strong>Share public profile</strong><p className="text-caption">Choose exactly what visitors can see without signing in.</p></div><label className="toggle-control"><input type="checkbox" checked={publicSharingEnabled} onChange={togglePublicSharing} disabled={isSavingPublicSettings} /><span /></label></div>{publicSharingEnabled && <><div className="public-fields">{Object.entries(publicFieldLabels).map(([field, label]) => <label key={field}><input type="checkbox" checked={Boolean(publicFields[field])} onChange={(event) => savePublicSettings({ ...publicFields, [field]: event.target.checked })} disabled={isSavingPublicSettings} />{label}</label>)}</div><div className="public-link-row"><input readOnly value={`${window.location.origin}/interview-workspace/${workspace.publicSlug}/public`} /><button type="button" className="button button-ghost button-small" onClick={copyPublicLink}>{publicLinkCopied ? 'Copied' : 'Copy link'}</button><button type="button" className="inline-link" onClick={() => savePublicSettings(publicFields, true)} disabled={isSavingPublicSettings}>Rotate link</button></div></>}</div>

  const isRecruiter = workspace && (String(workspace.recruiterId) === String(currentUser.id) || (activeTab === 'Interview Rounds' && String(workspace.candidateId) === String(currentUser.id)))
  const publicFields = workspace?.publicFields || { resume: false, achievements: false, skills: false, interviewSummary: false, status: false }
  const publicSharingEnabled = Boolean(workspace?.publicSlug && Object.values(publicFields).some(Boolean))
  const updateRoundForm = (event) => setRoundForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const createRound = async (event) => {
    event.preventDefault()
    setIsCreatingRound(true)
    setError('')
    try {
      const round = await apiRequest(`/api/workspaces/${id}/rounds`, { method: 'POST', body: JSON.stringify({ ...roundForm, durationMinutes: Number(roundForm.durationMinutes), scheduledAt: new Date(roundForm.scheduledAt).toISOString() }) })
      setRounds((items) => [...items, round].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)))
      const invitationSent = round.invitationStatus === 'sent'
      setInvitationNoticeType(invitationSent ? 'success' : 'error')
      setInvitationNotice(invitationSent ? `Invitation sent to ${workspace.recruiterEmail}.` : round.invitationError || 'Interview scheduled, but the invitation email could not be sent.')
      setRoundForm({ type: 'Technical', interviewerName: '', scheduledAt: '', durationMinutes: 60, instructions: '' })
    } catch (requestError) { setError(requestError.message) } finally { setIsCreatingRound(false) }
  }

  const updateRoundStatus = async (roundId, status) => {
    try {
      const updatedRound = await apiRequest(`/api/workspaces/${id}/rounds/${roundId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setRounds((items) => items.map((round) => round._id === updatedRound._id ? updatedRound : round))
    } catch (requestError) { setError(requestError.message) }
  }

  const updateFocusForm = (event) => setFocusForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const saveFocus = async (event) => {
    event.preventDefault()
    setIsSavingFocus(true)
    setError('')
    try {
      const focusTopics = focusForm.focusTopics.split(',').map((topic) => topic.trim()).filter(Boolean)
      await apiRequest(`/api/workspaces/${id}/rounds/${focusRoundId}/focus`, { method: 'PATCH', body: JSON.stringify({ focusTopics, difficulty: focusForm.difficulty, questionType: focusForm.questionType }) })
      const updatedRound = await apiRequest(`/api/workspaces/${id}/rounds/${focusRoundId}`, { method: 'PATCH', body: JSON.stringify({ durationMinutes: Number(focusForm.durationMinutes) }) })
      setRounds((items) => items.map((round) => round._id === updatedRound._id ? { ...round, ...updatedRound, focusTopics, difficulty: focusForm.difficulty, questionType: focusForm.questionType } : round))
    } catch (requestError) { setError(requestError.message) } finally { setIsSavingFocus(false) }
  }

  const generateQuestions = async () => {
    setIsGeneratingQuestions(true)
    setError('')
    try {
      const updatedRound = await apiRequest(`/api/workspaces/${id}/rounds/${focusRoundId}/generate-questions`, { method: 'POST', body: JSON.stringify({ resumeAnalysis: JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'), jdAnalysis: JSON.parse(localStorage.getItem('jdAnalysis') || '{}') }) })
      setRounds((items) => items.map((round) => round._id === updatedRound._id ? updatedRound : round))
    } catch (requestError) { setError(requestError.message) } finally { setIsGeneratingQuestions(false) }
  }

  const updateFeedbackRating = (key, value) => setFeedbackForm((current) => ({ ...current, [key]: value }))
  const updateFeedbackForm = (event) => setFeedbackForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const saveFeedback = async (event) => {
    event.preventDefault()
    setIsSavingFeedback(true)
    setError('')
    try {
      const feedback = await apiRequest(`/api/workspaces/${id}/rounds/${focusRoundId}/feedback`, { method: 'POST', body: JSON.stringify({ ratings: Object.fromEntries(feedbackFields.map(({ key }) => [key, Number(feedbackForm[key])])), comments: feedbackForm.comments, visibleToCandidate: feedbackForm.visibleToCandidate }) })
      setFeedbackByRound((current) => ({ ...current, [focusRoundId]: feedback }))
    } catch (requestError) { setError(requestError.message) } finally { setIsSavingFeedback(false) }
  }

  const generateImprovementPlan = async () => {
    setIsGeneratingPlan(true)
    setError('')
    try { setImprovementPlan(await apiRequest(`/api/workspaces/${id}/rounds/${focusRoundId}/improvement-plan`, { method: 'POST' })) } catch (requestError) { setError(requestError.message) } finally { setIsGeneratingPlan(false) }
  }

  const updateDocumentForm = (event) => setDocumentForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const readDocumentFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const fileText = await file.text()
      setDocumentForm((current) => ({ ...current, filename: file.name, fileText }))
    } catch { setError('This file could not be read as text.') }
  }

  const uploadDocument = async (event) => {
    event.preventDefault()
    setIsUploadingDocument(true)
    setError('')
    try {
      const document = await apiRequest(`/api/workspaces/${id}/documents`, { method: 'POST', body: JSON.stringify(documentForm) })
      setDocuments((items) => [document, ...items])
      setDocumentForm({ type: 'other', filename: '', fileText: '' })
    } catch (requestError) { setError(requestError.message) } finally { setIsUploadingDocument(false) }
  }

  const startNewNote = () => { setSelectedNoteId(''); setNoteForm({ title: '', contentMarkdown: '' }); setNoteActionResult('') }
  const updateNoteForm = (event) => setNoteForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const saveNote = async (event) => {
    event.preventDefault()
    setIsSavingNote(true)
    setError('')
    try {
      const endpoint = selectedNoteId ? `/api/workspaces/${id}/notes/${selectedNoteId}` : `/api/workspaces/${id}/notes`
      const note = await apiRequest(endpoint, { method: selectedNoteId ? 'PATCH' : 'POST', body: JSON.stringify(noteForm) })
      setNotes((items) => selectedNoteId ? items.map((item) => item._id === note._id ? note : item) : [note, ...items])
      setSelectedNoteId(note._id)
    } catch (requestError) { setError(requestError.message) } finally { setIsSavingNote(false) }
  }

  const runNoteAction = async (action) => {
    if (!selectedNoteId) return
    setNoteAction(action)
    setError('')
    try { const result = await apiRequest(`/api/workspaces/${id}/notes/${selectedNoteId}/${action}`, { method: 'POST' }); setNoteActionResult(result.content) } catch (requestError) { setError(requestError.message) } finally { setNoteAction('') }
  }

  const renderRating = (key, value, readOnly = false) => <div className="feedback-rating"><span>{feedbackFields.find((field) => field.key === key)?.label}</span><div>{[1, 2, 3, 4, 5].map((star) => readOnly ? <span className={star <= value ? 'feedback-star active' : 'feedback-star'} key={star}>★</span> : <button type="button" className={star <= value ? 'feedback-star active' : 'feedback-star'} onClick={() => updateFeedbackRating(key, star)} key={star} aria-label={`${star} out of 5`}>★</button>)}</div></div>

  const renderDocuments = () => {
    const grouped = documentTypes.map((type) => ({ type, items: documents.filter((document) => document.type === type) })).filter((group) => group.items.length)
    return <section className="panel-block workspace-documents"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Documents</p><h2>Workspace files</h2></div><span className="text-caption">{documents.length} document{documents.length === 1 ? '' : 's'}</span></div><form onSubmit={uploadDocument} className="form-stack document-upload-form"><div className="form-grid"><label className="field-label">Document type<select name="type" value={documentForm.type} onChange={updateDocumentForm}>{documentTypes.map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}</select></label><label className="field-label">Filename<input required name="filename" value={documentForm.filename} onChange={updateDocumentForm} placeholder="resume.txt" /></label></div><label className="upload-card upload-card--textarea"><strong>Upload a text file</strong><span className="file-hint">Text is stored in the workspace for participants and future AI features.</span><input type="file" accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.html,.css" onChange={readDocumentFile} /><span className="choose-file">Choose File</span></label><label className="field-label">Or paste file text<textarea name="fileText" rows="5" value={documentForm.fileText} onChange={updateDocumentForm} placeholder="Paste document or code text here..." /></label><button type="submit" className="button button-primary button-small" disabled={isUploadingDocument || (!documentForm.fileText.trim() && !documentForm.filename.trim())}>{isUploadingDocument ? 'Uploading...' : 'Add Document'}</button></form>{grouped.length ? <div className="document-groups">{grouped.map((group) => <div className="document-group" key={group.type}><p className="bento-label">{group.type}</p>{group.items.map((document) => <article className="document-item" key={document._id}><div><strong>{document.filename}</strong><small>{document.fileText ? `${document.fileText.length.toLocaleString()} characters` : 'External file'}</small></div><span className="text-caption">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(document.createdAt))}</span></article>)}</div>)}</div> : <p className="text-caption">No documents have been added yet.</p>}</section>
  }

  const renderNotes = () => {
    const selectedNote = notes.find((note) => note._id === selectedNoteId)
    return <section className="panel-block workspace-notes"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Notes</p><h2>Shared workspace notes</h2></div><button type="button" className="button button-ghost button-small" onClick={startNewNote}>+ New Note</button></div><div className="notes-layout"><div className="notes-list">{notes.length ? notes.map((note) => <button type="button" className={note._id === selectedNoteId ? 'note-list-item active' : 'note-list-item'} key={note._id} onClick={() => { setSelectedNoteId(note._id); setNoteActionResult('') }}><strong>{note.title}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(note.updatedAt))}</small></button>) : <p className="text-caption">No notes yet.</p>}</div><div className="note-editor"><form onSubmit={saveNote} className="form-stack"><label className="field-label">Title<input required name="title" value={noteForm.title} onChange={updateNoteForm} placeholder="Interview preparation notes" /></label><label className="field-label">Markdown<textarea required name="contentMarkdown" rows="12" value={noteForm.contentMarkdown} onChange={updateNoteForm} placeholder="# Key ideas\n\nWrite shared notes here..." /></label><button type="submit" className="button button-primary button-small" disabled={isSavingNote}>{isSavingNote ? 'Saving...' : selectedNote ? 'Save Note' : 'Create Note'}</button></form><div className="markdown-preview"><p className="bento-label">Preview</p><div dangerouslySetInnerHTML={{ __html: renderMarkdown(noteForm.contentMarkdown) }} /></div>{selectedNote && <div className="note-ai-actions"><p className="bento-label">AI actions</p><div>{noteActions.map((action) => <button type="button" className="button button-ghost button-small" key={action.key} onClick={() => runNoteAction(action.key)} disabled={Boolean(noteAction)}>{noteAction === action.key ? 'Working...' : action.label}</button>)}</div>{noteActionResult && <div className="feedback-card"><div className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(noteActionResult) }} /></div>}</div>}</div></div></section>
  }

  const renderActivity = () => <section className="panel-block workspace-activity"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Activity</p><h2>Workspace timeline</h2></div><span className="text-caption">Latest updates</span></div>{activity.length ? <div className="activity-list">{activity.map((item) => <article className="activity-item" key={item.id}><span className={`activity-marker activity-marker--${item.type}`} /><div><strong>{item.message}</strong><small>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</small></div></article>)}</div> : <p className="text-caption">No workspace activity yet.</p>}</section>

  const renderFeedback = () => {
    const selectedFeedback = feedbackByRound[focusRoundId]
    if (!isRecruiter) return <section className="panel-block workspace-rounds"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Feedback</p><h2>Recruiter feedback</h2></div><span className="text-caption">Read-only review</span></div>{rounds.length ? <><label className="field-label">Round<select value={focusRoundId} onChange={(event) => setFocusRoundId(event.target.value)}>{rounds.map((round) => <option key={round._id} value={round._id}>{round.type} · {round.interviewerName}</option>)}</select></label>{selectedFeedback ? <div className="feedback-card"><div className="feedback-rating-list">{feedbackFields.map(({ key }) => renderRating(key, selectedFeedback.ratings[key], true))}</div><p className="workspace-round__instructions">{selectedFeedback.comments || 'No additional comments were provided.'}</p></div> : <p className="text-caption">Feedback is not available for this round yet or is hidden from candidates.</p>}</> : <p className="text-caption">No interview rounds are available yet.</p>}</section>
    return <section className="panel-block workspace-rounds"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Feedback</p><h2>Review this round</h2></div><span className="text-caption">Share clear, actionable notes</span></div>{rounds.length ? <><label className="field-label">Round<select value={focusRoundId} onChange={(event) => setFocusRoundId(event.target.value)}>{rounds.map((round) => <option key={round._id} value={round._id}>{round.type} · {round.interviewerName}</option>)}</select></label><form onSubmit={saveFeedback} className="form-stack feedback-form"><div className="feedback-rating-list">{feedbackFields.map(({ key }) => renderRating(key, feedbackForm[key]))}</div><label className="field-label">Comments<textarea name="comments" rows="5" value={feedbackForm.comments} onChange={updateFeedbackForm} placeholder="Share strengths and specific next steps..." /></label><label className="feedback-visibility"><input type="checkbox" name="visibleToCandidate" checked={feedbackForm.visibleToCandidate} onChange={updateFeedbackForm} /> Visible to candidate</label><button type="submit" className="button button-primary button-small" disabled={isSavingFeedback}>{isSavingFeedback ? 'Saving...' : selectedFeedback ? 'Update Feedback' : 'Save Feedback'}</button></form><button type="button" className="button button-ghost button-small" onClick={generateImprovementPlan} disabled={isGeneratingPlan}>{isGeneratingPlan ? 'Building plan...' : 'Generate Improvement Plan'}</button>{improvementPlan && <div className="feedback-card improvement-plan"><p className="bento-label">Improvement plan</p><h3>{improvementPlan.recommendedDifficulty}</h3><p>{improvementPlan.reasoning}</p><div className="skill-tags">{improvementPlan.recommendedTopics?.map((topic) => <span key={topic}>{topic}</span>)}</div></div>}</> : <p className="text-caption">Create an interview round before adding feedback.</p>}</section>
  }

  const renderAiPreparation = () => {
    const selectedRound = rounds.find((round) => round._id === focusRoundId)
    if (!isRecruiter) return <section className="panel-block workspace-rounds"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">AI preparation</p><h2>Questions for your interview</h2></div><span className="text-caption">{rounds.reduce((total, round) => total + round.questions.length, 0)} generated</span></div>{rounds.some((round) => round.questions.length) ? <div className="workspace-question-list">{rounds.flatMap((round) => round.questions.map((question, index) => <article className="workspace-question" key={`${round._id}-${index}`}><p className="bento-label">{round.type} · {question.category || round.questionType}</p><h3>{question.question}</h3>{question.rationale && <p className="text-caption">{question.rationale}</p>}</article>))}</div> : <p className="text-caption">Your recruiter has not generated preparation questions yet.</p>}</section>
    return <section className="panel-block workspace-rounds"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">AI preparation</p><h2>Set the round focus</h2></div><span className="text-caption">Questions use the existing AI coach</span></div>{rounds.length ? <><label className="field-label">Round<select value={focusRoundId} onChange={(event) => setFocusRoundId(event.target.value)}>{rounds.map((round) => <option key={round._id} value={round._id}>{round.type} · {round.interviewerName}</option>)}</select></label><form onSubmit={saveFocus} className="form-stack workspace-round-form"><div className="form-grid"><label className="field-label">Focus topics<input name="focusTopics" value={focusForm.focusTopics} onChange={updateFocusForm} placeholder="React.js, JavaScript, DSA" /></label><label className="field-label">Difficulty<select name="difficulty" value={focusForm.difficulty} onChange={updateFocusForm}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label className="field-label">Question type<select name="questionType" value={focusForm.questionType} onChange={updateFocusForm}><option>Technical</option><option>HR</option><option>Coding</option><option>Behavioral</option><option>Mixed</option></select></label><label className="field-label">Duration (minutes)<input required type="number" min="1" name="durationMinutes" value={focusForm.durationMinutes} onChange={updateFocusForm} /></label></div><div className="workspace-ai-actions"><button type="submit" className="button button-ghost button-small" disabled={isSavingFocus}>{isSavingFocus ? 'Saving...' : 'Save Focus'}</button><button type="button" className="button button-primary button-small" onClick={generateQuestions} disabled={isGeneratingQuestions || !selectedRound}>{isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}</button></div></form>{selectedRound?.questions.length > 0 && <div className="workspace-question-list">{selectedRound.questions.map((question, index) => <article className="workspace-question" key={`${selectedRound._id}-${index}`}><p className="bento-label">{question.category || selectedRound.questionType}</p><h3>{question.question}</h3>{question.rationale && <p className="text-caption">{question.rationale}</p>}</article>)}</div>}</> : <p className="text-caption">Create an interview round before setting its AI preparation focus.</p>}</section>
  }

  const renderInterviewRounds = () => <section className="panel-block workspace-rounds"><div className="section-heading"><div><p className="eyebrow eyebrow--dark">Interview rounds</p><h2>{isRecruiter ? 'Plan the interview journey' : 'Your interview schedule'}</h2></div><span className="text-caption">{rounds.length} round{rounds.length === 1 ? '' : 's'}</span></div>{isRecruiter && <form onSubmit={createRound} className="form-stack workspace-round-form"><div className="form-grid"><label className="field-label">Round type<select name="type" value={roundForm.type} onChange={updateRoundForm}>{roundTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="field-label">Interviewer name<input required name="interviewerName" value={roundForm.interviewerName} onChange={updateRoundForm} placeholder="Interviewer name" /></label><label className="field-label">Date and time<input required type="datetime-local" name="scheduledAt" value={roundForm.scheduledAt} onChange={updateRoundForm} /></label><label className="field-label">Duration (minutes)<input required type="number" min="1" name="durationMinutes" value={roundForm.durationMinutes} onChange={updateRoundForm} /></label></div><label className="field-label">Instructions<textarea name="instructions" rows="4" value={roundForm.instructions} onChange={updateRoundForm} placeholder="Share preparation or meeting instructions..." /></label><button type="submit" className="button button-primary button-small" disabled={isCreatingRound}>{isCreatingRound ? 'Creating...' : 'Add Interview Round'}</button></form>}{rounds.length ? <div className="workspace-round-list">{rounds.map((round) => <article className="workspace-round" key={round._id}><div><p className="bento-label">{round.type}</p><h3>{round.interviewerName}</h3><p className="text-caption">{formatRoundDate(round.scheduledAt)} · {round.durationMinutes} minutes</p>{round.instructions && <p className="workspace-round__instructions">{round.instructions}</p>}</div><label className="round-status">Status{isRecruiter ? <select value={round.status} onChange={(event) => updateRoundStatus(round._id, event.target.value)}>{roundStatuses.map((status) => <option key={status}>{status}</option>)}</select> : <span className={`status-pill status-pill--${roundStatusTone[round.status]}`}>{round.status}</span>}</label></article>)}</div> : <p className="text-caption">No interview rounds have been scheduled yet.</p>}</section>

  if (error) return <DashboardLayout title="Workspace" subtitle="Interview workspace"><p className="form-error">{error}</p><Link to="/workspaces" className="button button-ghost">Back to Workspaces</Link></DashboardLayout>
  if (!workspace) return <DashboardLayout title="Workspace" subtitle="Interview workspace"><section className="panel-block">Loading workspace...</section></DashboardLayout>

  return (
    <DashboardLayout title={workspace.jobRole} subtitle={workspace.company}>
      <div className="section-heading"><div><Link to="/workspaces" className="inline-link">← Workspaces</Link><p className="text-caption">Recruiter: {workspace.recruiterEmail}</p></div><span className="status-pill status-pill--stable">{workspace.status.replace('_', ' ')}</span>{workspace.status === 'pending_invite' && <button type="button" className="button button-primary button-small" onClick={acceptInvite} disabled={isAccepting}>{isAccepting ? 'Accepting...' : 'Accept Invite'}</button>}</div>
      <div className="source-tabs workspace-tabs">{tabs.map((tab) => <button type="button" key={tab} className={activeTab === tab ? 'source-tab active' : 'source-tab'} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
      {invitationNotice && <p className={invitationNoticeType === 'success' ? 'form-success' : 'form-error'}>{invitationNotice}</p>}
      {activeTab === 'Overview' && <section className="panel-block"><p className="eyebrow eyebrow--dark">Workspace overview</p><h2>{workspace.company} · {workspace.jobRole}</h2><div className="stat-row"><div><span className="text-caption">Interview type</span><strong>{workspace.interviewType}</strong></div><div><span className="text-caption">Status</span><strong>{workspace.status.replace('_', ' ')}</strong></div><div><span className="text-caption">Recruiter</span><strong>{workspace.recruiterEmail}</strong></div></div><p className="text-caption">This workspace is ready for interview preparation and collaboration phases.</p>{!isRecruiter && renderPublicSharing()}</section>}
      {activeTab === 'Job Description' && <section className="panel-block"><p className="eyebrow eyebrow--dark">Job description</p><h2>{workspace.jobRole}</h2><p className="workspace-description">{workspace.jobDescription || 'No job description has been added yet.'}</p></section>}
      {activeTab === 'Interview Rounds' && renderInterviewRounds()}
      {activeTab === 'AI Preparation' && renderAiPreparation()}
      {activeTab === 'Feedback' && renderFeedback()}
      {activeTab === 'Documents' && renderDocuments()}
      {activeTab === 'Notes' && renderNotes()}
      {activeTab === 'Activity' && renderActivity()}
      {!['Overview', 'Job Description', 'Interview Rounds', 'AI Preparation', 'Feedback', 'Documents', 'Notes', 'Activity'].includes(activeTab) && <section className="panel-block empty-state"><div className="empty-state__icon">☆</div><h2>{activeTab} is coming in a later phase</h2><p className="text-caption">The workspace is ready for this feature when its next phase is implemented.</p></section>}
    </DashboardLayout>
  )
}