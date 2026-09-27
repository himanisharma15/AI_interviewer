import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { scoreTone } from '../lib/score'
import { buildLocalReport, interviewSessionKey } from '../lib/report'
import BackHomeButton from '../components/BackHomeButton'
import { formatCurrentDate } from '../lib/date'
import AIAssistant from '../components/AIAssistant'

const fallbackMessage = 'Complete at least one interview answer to receive grounded feedback.'

export default function InterviewReportPage() {
  const [report, setReport] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedSession = JSON.parse(sessionStorage.getItem(interviewSessionKey) || 'null')
    const localReport = buildLocalReport(storedSession)
    setReport(localReport)

    const token = localStorage.getItem('token')
    if (!token || !storedSession?.answers?.length) {
      setIsLoading(false)
      return
    }

    const transcript = storedSession.answers
      .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
      .join('\n\n')

    fetch('/api/ai/summarize-interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transcript }),
    })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (response.ok && payload.success) setAiSummary(payload.data)
      })
      .catch(() => {})

    fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ interview: storedSession }),
    })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (response.ok && payload.success) setReport({ ...localReport, ...payload.data })
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const categoryScores = report ? [
    { label: 'Technical Knowledge', value: report.technicalScore },
    { label: 'Communication', value: report.communicationScore },
    { label: 'Problem Solving', value: report.problemSolvingScore },
    { label: 'Job Relevance', value: report.jdRelevanceScore },
  ] : []
  const integrity = JSON.parse(sessionStorage.getItem(interviewSessionKey) || 'null')?.proctoring
  const integrityEvents = integrity?.events || []
  const eventCount = (type) => integrityEvents.filter((event) => event.type === type).length

  const downloadPdf = () => {
    document.title = 'IntervueAI Interview Report'
    window.print()
  }

  return (
    <div className="page-shell report-page">
      <header className="report-header">
        <div>
          <p className="eyebrow eyebrow--dark">Interview Report</p>
          <h1>Review your performance and see what needs to be improved</h1>
        </div>

        <div className="report-actions">
          <span className="current-date">{formatCurrentDate()}</span>
          <BackHomeButton />
          <Link to="/interview/session" className="button button-ghost">Retake Interview</Link>
          <button type="button" className="button button-primary" onClick={downloadPdf}>Print / Save PDF</button>
        </div>
      </header>

      {isLoading && <p className="report-status">Preparing feedback from your submitted answers...</p>}
      {!isLoading && !report && <section className="panel-block report-empty"><h2>No report yet</h2><p>{fallbackMessage}</p><Link to="/interview/session" className="button button-primary">Start an interview</Link></section>}

      {report && <>
      <div className="report-grid">
        <section className="panel-block report-overview">
          <div className={`score-ring score-ring--large ${scoreTone(report.overallScore)}`}>{report.overallScore}%</div>
          <div>
            <h2>Practice feedback</h2>
            <p>{report.summary}</p>
          </div>
        </section>

        <section className="panel-block report-scores">
          <h3>Category Scores</h3>
          {categoryScores.map((item) => (
            <div key={item.label} className="score-row score-row--report">
              <span>{item.label}</span>
              <div className="progress-bar"><span style={{ width: `${item.value}%` }} /></div>
              <b className={scoreTone(item.value)}>{item.value}</b>
            </div>
          ))}
        </section>
      </div>

      {aiSummary && <section className="panel-block report-block report-block--info ai-summary">
        <h3>AI Summary</h3>
        {aiSummary.summary && <p>{aiSummary.summary}</p>}
        {aiSummary.keyMoments?.length > 0 && <ul>{aiSummary.keyMoments.map((moment) => <li key={moment}>{moment}</li>)}</ul>}
      </section>}

      <div className="report-bottom-grid">
        <section className="panel-block report-block report-block--success">
          <h3>Strong Areas</h3>
          <ul>{report.strongAreas?.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="panel-block report-block report-block--danger">
          <h3>Needs Improvement</h3>
          <ul>{report.weakAreas?.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="panel-block report-block report-block--info">
          <h3>Recommended Topics</h3>
          <ul>{report.recommendedTopics?.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>
      {integrity && <section className="panel-block report-block report-integrity"><h3>Interview Integrity</h3><div className="integrity-summary"><span>Camera monitoring <strong>{eventCount('CAMERA_DISABLED') || eventCount('CAMERA_DISCONNECTED') ? 'Interrupted' : 'Active'}</strong></span><span>Tab switches <strong>{eventCount('TAB_SWITCH') + eventCount('WINDOW_BLUR')}</strong></span><span>Face events <strong>{eventCount('FACE_NOT_DETECTED')}</strong></span><span>Multiple-person events <strong>{eventCount('MULTIPLE_FACES')}</strong></span></div>{integrityEvents.length ? <p className="text-caption">Integrity events detected. Review recommended; this does not change the AI score.</p> : <p className="text-caption">No integrity events were recorded.</p>} {integrityEvents.length > 0 && <ul>{integrityEvents.map((event, index) => <li key={`${event.type}-${event.timestamp}-${index}`}>{new Date(event.timestamp).toLocaleTimeString()} — {event.type.replaceAll('_', ' ').toLowerCase()}</li>)}</ul>}</section>}
      </>}
      <AIAssistant context={{ overallScore: report?.overallScore, weakAreas: report?.weakAreas, recommendedTopics: report?.recommendedTopics }} />
    </div>
  )
}
