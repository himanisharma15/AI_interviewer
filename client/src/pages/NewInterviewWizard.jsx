import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import StepIndicator from '../components/ui/StepIndicator'
import { roles, difficulties } from '../lib/interview'
import { apiRequest } from '../lib/api'

const wizardSteps = [{ label: 'Upload' }, { label: 'Preferences' }, { label: 'Ready' }]

export default function NewInterviewWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(1)
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState(location.state?.jobDescription || '')
  const [selectedType, setSelectedType] = useState('Technical')
  const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate')
  const [selectedRole, setSelectedRole] = useState(location.state?.role || 'Frontend')
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const canGoNext = useMemo(() => {
    if (currentStep === 1) return Boolean(resumeFile)
    if (currentStep === 2) return true
    return true
  }, [currentStep, resumeFile])

  const nextStep = () => setCurrentStep((step) => Math.min(step + 1, 3))
  const prevStep = () => setCurrentStep((step) => Math.max(step - 1, 1))

  const startInterview = () => {
    navigate('/interview/session')
  }

  const saveJobDescription = async () => {
    if (!jobDescription.trim()) return
    try {
      await apiRequest('/api/saved-jobs', { method: 'POST', body: JSON.stringify({ title: selectedRole, jobDescription, jdSourceType: 'manual' }) })
      setIsSaved(true); setSaveMessage('Job description saved.')
    } catch (error) { setSaveMessage(error.message === 'Job already saved.' ? error.message : 'Unable to save this job. Please try again.') }
  }

  return (
    <DashboardLayout
      title="Create Your AI Interview"
      subtitle="Upload your resume and job description to get started"
      action={<StepIndicator steps={wizardSteps} currentStep={currentStep} />}
    >
      <div className="wizard-panel">
        {currentStep === 1 && (
          <>
            <div className="upload-grid">
              <label className="upload-card">
                <div className="upload-card__icon">⬆</div>
                <h3>Upload Resume</h3>
                <p>Drag &amp; drop or click to upload</p>
                <span className="file-hint">PDF, DOC, DOCX accepted</span>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} />
                <span className="choose-file">Choose File</span>
              </label>

              <label className="upload-card upload-card--textarea">
                <div className="upload-card__icon">✍</div>
                <h3>Upload Job Description (Optional)</h3>
                <p>Paste the job description or upload a file.</p>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste job description here…"
                />
                <input type="file" accept=".pdf,.doc,.docx,.txt" />
                <span className="choose-file">Choose File</span>
                {jobDescription.trim() && <button type="button" className="button button-ghost button-small" onClick={saveJobDescription} disabled={isSaved}>{isSaved ? 'Saved' : 'Save Job Description'}</button>}
                {saveMessage && <span className="text-caption">{saveMessage}</span>}
              </label>
            </div>

            <div className="wizard-actions wizard-actions--right">
              <button type="button" className="button button-primary" disabled={!canGoNext} onClick={nextStep}>
                Next <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="preferences-stack">
              <section className="pref-section">
                <h3>Interview Type</h3>
                <div className="choice-grid">
                  {['Technical', 'HR/Behavioral', 'Mixed', 'Panel/Board'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={selectedType === type ? 'choice-card active' : 'choice-card'}
                      onClick={() => setSelectedType(type)}
                    >
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="pref-section">
                <h3>Difficulty Level</h3>
                <div className="difficulty-row">
                  {difficulties.map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={selectedDifficulty === level ? `difficulty-pill difficulty-pill--${level.toLowerCase()} active` : `difficulty-pill difficulty-pill--${level.toLowerCase()}`}
                      onClick={() => setSelectedDifficulty(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </section>

              <section className="pref-section pref-section--row">
                <label className="field-label">
                  Preferred Role (Optional)
                  <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </section>
            </div>

            <div className="wizard-actions">
              <button type="button" className="button button-ghost" onClick={prevStep}>← Back</button>
              <button type="button" className="button button-primary" onClick={nextStep}>Next <span aria-hidden="true">→</span></button>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="ready-summary">
              <h3>Session summary</h3>
              <ul>
                <li><strong>Resume:</strong> {resumeFile?.name || 'Uploaded'}</li>
                <li><strong>Interview type:</strong> {selectedType}</li>
                <li><strong>Difficulty:</strong> {selectedDifficulty}</li>
                <li><strong>Role:</strong> {selectedRole}</li>
                <li><strong>Job description:</strong> {jobDescription ? 'Included' : 'Optional / not provided'}</li>
              </ul>
            </div>

            <div className="wizard-actions">
              <button type="button" className="button button-ghost" onClick={prevStep}>← Back</button>
              <button type="button" className="button button-primary" onClick={startInterview}>Start Interview <span aria-hidden="true">→</span></button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
