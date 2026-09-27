import { useEffect, useState } from 'react'

export default function InterviewMonitor({ onEvent }) {
  const [tabSwitches, setTabSwitches] = useState(0)
  const [warningVisible, setWarningVisible] = useState(false)

  useEffect(() => {
    const reportViolation = (type) => {
      if (window.location.pathname !== '/interview/session') return
      setTabSwitches((count) => count + 1)
      setWarningVisible(true)
      onEvent?.(type)
      window.dispatchEvent(new Event('interview-tab-switch'))
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') reportViolation('TAB_SWITCH')
    }

    const handleBlur = () => reportViolation('WINDOW_BLUR')

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [onEvent])

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

    </>
  )
}
