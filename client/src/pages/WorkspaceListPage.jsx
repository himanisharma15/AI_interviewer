import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { apiRequest } from '../lib/api'

const formatDate = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))

export default function WorkspaceListPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ company: '', jobRole: '', jobDescription: '', interviewType: 'Technical', recruiterEmail: '' })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadWorkspaces = async () => {
    try { setWorkspaces(await apiRequest('/api/workspaces')) } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { loadWorkspaces() }, []) // eslint-disable-line react-hooks/exhaustive-deps, react/set-state-in-effect

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const createWorkspace = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const workspace = await apiRequest('/api/workspaces', { method: 'POST', body: JSON.stringify(form) })
      setWorkspaces((items) => [workspace, ...items])
      setForm({ company: '', jobRole: '', jobDescription: '', interviewType: 'Technical', recruiterEmail: '' })
      setIsOpen(false)
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  const resendInvitation = async (workspaceId) => {
    try {
      const workspace = await apiRequest(`/api/workspaces/${workspaceId}/resend-invitation`, { method: 'POST' })
      setWorkspaces((items) => items.map((item) => item._id === workspace._id ? workspace : item))
    } catch (requestError) { setError(requestError.message) }
  }

  return (
    <DashboardLayout title="Workspaces" subtitle="Prepare with your interview team" action={<button type="button" className="button button-primary" onClick={() => setIsOpen(true)}>+ New Workspace</button>}>
      {error && <p className="form-error">{error}</p>}
      {!workspaces.length ? <section className="panel-block empty-state"><div className="empty-state__icon">↗</div><h2>Create a workspace to organize an interview with a recruiter</h2><button type="button" className="button button-primary" onClick={() => setIsOpen(true)}>+ New Workspace</button></section> : <div className="saved-job-grid">{workspaces.map((workspace) => <article className="panel-block saved-job-card" key={workspace._id}><div className="saved-job-card__top"><div><h2>{workspace.company}</h2><h3>{workspace.jobRole}</h3></div><span className="status-pill status-pill--stable">{workspace.status.replace('_', ' ')}</span></div><p className="text-caption">{workspace.interviewType} · Created {formatDate(workspace.createdAt)}</p><p className="text-caption">Recruiter: {workspace.recruiterEmail}</p>{workspace.invitationStatus && <p className={workspace.invitationStatus === 'sent' ? 'form-success' : 'form-error'}>{workspace.invitationStatus === 'sent' ? 'Invitation sent' : workspace.invitationError || 'Invitation not sent'}</p>}<div className="saved-job-card__actions"><button type="button" className="button button-primary button-small" onClick={() => navigate(`/workspaces/${workspace._id}`)}>Open Workspace</button>{workspace.invitationStatus !== 'sent' && <button type="button" className="button button-ghost button-small" onClick={() => resendInvitation(workspace._id)}>Resend Invite</button>}</div></article>)}</div>}

      {isOpen && <div className="modal-backdrop" role="presentation"><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="workspace-title"><div className="modal-header"><div><p className="eyebrow eyebrow--dark">Interview workspace</p><h2 id="workspace-title">New Workspace</h2></div><button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Close">×</button></div><form onSubmit={createWorkspace} className="form-stack"><label className="field-label">Company<input required name="company" value={form.company} onChange={updateForm} placeholder="Company name" /></label><label className="field-label">Job role<input required name="jobRole" value={form.jobRole} onChange={updateForm} placeholder="e.g. Frontend Engineer" /></label><label className="field-label">Recruiter email<input required type="email" name="recruiterEmail" value={form.recruiterEmail} onChange={updateForm} placeholder="recruiter@company.com" /></label><label className="field-label">Interview type<select name="interviewType" value={form.interviewType} onChange={updateForm}><option>Technical</option><option>Behavioral</option><option>Panel</option><option>Mixed</option></select></label><label className="field-label">Job description<textarea name="jobDescription" rows="6" value={form.jobDescription} onChange={updateForm} placeholder="Paste the role description..." /></label><button type="submit" className="button button-primary" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Workspace'}</button></form></section></div>}
    </DashboardLayout>
  )
}