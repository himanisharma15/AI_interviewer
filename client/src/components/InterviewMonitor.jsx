import { useEffect, useRef, useState } from 'react'

export default function InterviewMonitor() {
  const [tabSwitches, setTabSwitches] = useState(0)
  const [warningVisible, setWarningVisible] = useState(false)
  const violationReportedRef = useRef(false)

  useEffect(() => {
    const reportViolation = () => {
      const interviewIsActive = window.location.pathname === '/interview/session'
      if (interviewIsActive && !violationReportedRef.current) {
        violationReportedRef.current = true
        setTabSwitches((count) => count + 1)
        setWarningVisible(true)
        window.dispatchEvent(new Event('interview-tab-switch'))
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportViolation()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <>
      <div className={tabSwitches > 0 ? 'cheat-counter flagged' : 'cheat-counter'} aria-live="polite">
        Tab switches: <strong>{tabSwitches}</strong>
      </div>

      {warningVisible && (
        <div className="cheat-warning" role="alert">
          <strong>⚠ Tab switch detected</strong>
          <span>This activity is being recorded for your interview report.</span>
          <button type="button" onClick={() => setWarningVisible(false)} aria-label="Dismiss tab switch warning">
            ×
          </button>
        </div>
      )}

      {tabSwitches > 0 && (
        <div className="cheat-termination" role="alert">
          <div className="termination-card">
            <span className="termination-icon">!</span>
            <span className="section-kicker">Interview terminated</span>
            <h2>Cheating detected.</h2>
            <p>You switched tabs during the interview. This attempt has been stopped and marked for review.</p>
            <strong>Tab switches recorded: {tabSwitches}</strong>
            <button className="button button-primary" type="button" onClick={() => window.location.assign('/dashboard')}>
              Return to dashboard
            </button>
          </div>
        </div>
      )}
    </>
  )
}
