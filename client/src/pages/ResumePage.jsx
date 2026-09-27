import { useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'

const stopWords = new Set(['about', 'after', 'again', 'also', 'been', 'could', 'from', 'have', 'into', 'more', 'over', 'that', 'their', 'there', 'these', 'this', 'using', 'with', 'your'])
const actionWords = /\b(achieved|built|created|delivered|designed|developed|improved|increased|led|launched|managed|optimized|reduced|resolved)\b/gi
const sectionPatterns = {
  summary: /\b(summary|profile|objective)\b/i,
  experience: /\b(experience|employment|work history)\b/i,
  skills: /\b(skills|technologies|technical skills)\b/i,
  education: /\b(education|certifications?|coursework)\b/i,
  projects: /\b(projects?|portfolio)\b/i,
}

function getKeywords(text) {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || []).filter((word) => !stopWords.has(word)))]
}

function scoreResume(resumeText, jobDescription) {
  const text = resumeText.trim()
  const words = text.split(/\s+/).filter(Boolean)
  const sections = Object.entries(sectionPatterns).filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
  const resumeKeywords = new Set(getKeywords(text))
  const jobKeywords = getKeywords(jobDescription)
  const matchedKeywords = [...new Set(jobKeywords.filter((keyword) => resumeKeywords.has(keyword)))]
  const missingKeywords = [...new Set(jobKeywords.filter((keyword) => !resumeKeywords.has(keyword)))].slice(0, 12)
  const contactSignals = [/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text), /(?:\+?\d[\d ()-]{8,}\d)/.test(text), /linkedin\.com|github\.com/i.test(text)].filter(Boolean).length
  const actionCount = (text.match(actionWords) || []).length
  const quantifiedResults = (text.match(/\b\d+(?:\.\d+)?\s?(?:%|x|k|m|ms|seconds?|minutes?|users?|clients?|projects?|years?)\b/gi) || []).length

  const formatScore = Math.min(20, contactSignals * 5 + (words.length >= 250 ? 5 : 0))
  const sectionScore = Math.round((sections.length / Object.keys(sectionPatterns).length) * 30)
  const keywordScore = jobKeywords.length ? Math.round((matchedKeywords.length / jobKeywords.length) * 30) : Math.min(30, resumeKeywords.size >= 20 ? 24 : resumeKeywords.size)
  const evidenceScore = Math.min(20, Math.min(10, actionCount * 2) + Math.min(10, quantifiedResults * 3))
  const score = Math.min(100, formatScore + sectionScore + keywordScore + evidenceScore)

  return {
    score,
    verdict: score >= 70 ? 'Interview-ready' : score >= 50 ? 'Needs improvement' : 'Needs more work',
    sections,
    matchedKeywords,
    missingKeywords,
    checks: [
      { label: 'Contact details', value: `${contactSignals}/3 signals found`, good: contactSignals >= 2 },
      { label: 'Resume sections', value: `${sections.length}/5 core sections found`, good: sections.length >= 4 },
      { label: 'Role keywords', value: jobKeywords.length ? `${matchedKeywords.length}/${jobKeywords.length} matched` : 'Add a job description to compare', good: !jobKeywords.length || matchedKeywords.length >= Math.ceil(jobKeywords.length * 0.5) },
      { label: 'Evidence of impact', value: `${quantifiedResults} quantified result${quantifiedResults === 1 ? '' : 's'} found`, good: quantifiedResults > 0 },
    ],
  }
}

export default function ResumePage() {
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      setResumeText(await file.text())
      return
    }
    setResumeText((value) => value || `File selected: ${file.name}\n\nPaste the resume text here for an accurate ATS check. PDF and DOC files are not parsed in the browser.`)
  }

  const analyze = (event) => {
    event.preventDefault()
    if (!resumeText.trim()) return
    setResult(scoreResume(resumeText, jobDescription))
  }

  return (
    <DashboardLayout title="My Resume" subtitle="Check your resume before your next interview">
      <div className="resume-layout">
        <form className="panel-block resume-form" onSubmit={analyze}>
          <div className="panel-header">
            <div>
              <h3>ATS Resume Check</h3>
              <p className="text-caption">We score the text you provide against common ATS signals and your target job.</p>
            </div>
          </div>
          <label className="upload-card resume-upload">
            <strong>{fileName || 'Upload a resume text file'}</strong>
            <span className="file-hint">PDF/DOC files can be selected, but paste their text below for browser-based checking.</span>
            <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFile} />
            <span className="choose-file">Choose File</span>
          </label>
          <label className="field-label">
            Resume text
            <textarea required rows="13" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste your resume text here..." />
          </label>
          <label className="field-label">
            Job description (recommended)
            <textarea rows="7" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the target job description to check keyword matching..." />
          </label>
          <button type="submit" className="button button-primary">Check ATS score</button>
        </form>

        <section className="panel-block resume-result" aria-live="polite">
          {result ? (
            <>
              <div className="resume-score-head">
                <div className={`resume-score resume-score--${result.score >= 70 ? 'good' : result.score >= 50 ? 'amber' : 'danger'}`}>{result.score}%</div>
                <div><p className="eyebrow eyebrow--dark">ATS estimate</p><h2>{result.verdict}</h2></div>
              </div>
              <p className="resume-disclaimer">This is an evidence-based screening estimate, not a guarantee of passing a specific company&apos;s ATS.</p>
              <div className="resume-checks">{result.checks.map((check) => <div className="resume-check" key={check.label}><span className={check.good ? 'check-icon check-icon--good' : 'check-icon'}>{check.good ? '✓' : '!'}</span><div><strong>{check.label}</strong><small>{check.value}</small></div></div>)}</div>
              {result.matchedKeywords.length > 0 && <div className="keyword-group"><strong>Matched keywords</strong><div>{result.matchedKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div>}
              {result.missingKeywords.length > 0 && <div className="keyword-group keyword-group--missing"><strong>Consider adding if truthful</strong><div>{result.missingKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div>}
            </>
          ) : (
            <div className="resume-result-empty"><span className="resume-result-mark">%</span><h2>Your ATS result will appear here</h2><p>Paste your resume and a target job description to get a transparent score with specific checks.</p></div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
