import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import InterviewMonitor from '../components/InterviewMonitor'
import { buildFollowUpQuestion, formatTimer, speakQuestion } from '../lib/interview'
import { interviewSessionKey } from '../lib/report'
import BackHomeButton from '../components/BackHomeButton'
import { formatCurrentDate } from '../lib/date'
import { apiRequest } from '../lib/api'

export default function InterviewSessionPage() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const faceTimerRef = useRef(null)
  const noFaceStartedRef = useRef(null)
  const lastFaceEventRef = useRef({})
  const [isReady, setIsReady] = useState(false)
  const [cameraStatus, setCameraStatus] = useState('checking')
  const [cameraMessage, setCameraMessage] = useState('Requesting camera permission...')
  const [faceStatus, setFaceStatus] = useState('checking')
  const [proctoringEvents, setProctoringEvents] = useState([])
  const [showIntegrityWarning, setShowIntegrityWarning] = useState('')
  const [interviewStopped, setInterviewStopped] = useState(false)
  const [role, setRole] = useState('Frontend')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [duration, setDuration] = useState('30 minutes')
  const [customDuration, setCustomDuration] = useState('45')
  const [resume, setResume] = useState({ name: 'resume.pdf' })
  const [jobDescription, setJobDescription] = useState({ name: 'job-description.pdf' })
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60)
  const [answer, setAnswer] = useState('')
  const [activeQuestion, setActiveQuestion] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('Use your voice or type your answer below.')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1)
  const [submittedAnswers, setSubmittedAnswers] = useState([])
  const [lastFeedback, setLastFeedback] = useState(null)
  const recognitionRef = useRef(null)
  const [isInterviewActive, setIsInterviewActive] = useState(false)

  const selectedDuration = duration === 'Custom' ? `${customDuration} minutes` : duration
  const initialQuestion = `Based on your resume (${resume?.name}), tell me about a project where you made a difficult technical decision for a ${role} role. Your ${selectedDuration} session starts now.`
  const question = activeQuestion || initialQuestion

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported')
      setCameraMessage('This browser does not support camera access.')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraStatus('active')
      setCameraMessage('Camera active')
      return true
    } catch {
      setCameraStatus('denied')
      setCameraMessage('Camera access is required for interview integrity monitoring.')
      recordProctoringEvent('CAMERA_DISABLED')
      return false
    }
  }, [])

  const recordProctoringEvent = useCallback((type, duration = 0) => {
    if ((type === 'MULTIPLE_FACES' || type === 'FACE_NOT_DETECTED') && Date.now() - (lastFaceEventRef.current[type] || 0) < 5000) return
    lastFaceEventRef.current[type] = Date.now()
    const event = { type, timestamp: new Date().toISOString(), duration }
    setProctoringEvents((events) => [...events, event])
    if (type === 'TAB_SWITCH' || type === 'WINDOW_BLUR') setShowIntegrityWarning('Please stay on the interview tab. This activity has been recorded.')
  }, [])

  useEffect(() => {
    let mounted = true
    requestCamera().then((started) => { if (!mounted && started) streamRef.current?.getTracks().forEach((track) => track.stop()) })
    return () => {
      mounted = false
      if (faceTimerRef.current) window.clearInterval(faceTimerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [requestCamera])

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [cameraStatus, isInterviewActive])

  useEffect(() => {
    if (!isInterviewActive || cameraStatus !== 'active' || !videoRef.current) return undefined
    const FaceDetectorApi = window.FaceDetector
    if (!FaceDetectorApi) {
      setFaceStatus('unsupported')
      return undefined
    }
    const detector = new FaceDetectorApi({ fastMode: true, maxDetectedFaces: 2 })
    const checkFaces = async () => {
      try {
        const faces = await detector.detect(videoRef.current)
        if (faces.length > 1) {
          setFaceStatus('multiple')
          recordProctoringEvent('MULTIPLE_FACES')
          return
        }
        if (!faces.length) {
          setFaceStatus('missing')
          if (!noFaceStartedRef.current) noFaceStartedRef.current = Date.now()
          if (Date.now() - noFaceStartedRef.current > 5000) {
            recordProctoringEvent('FACE_NOT_DETECTED', 5)
            noFaceStartedRef.current = Date.now()
          }
          return
        }
        noFaceStartedRef.current = null
        setFaceStatus('present')
      } catch {
        setFaceStatus('unavailable')
      }
    }
    faceTimerRef.current = window.setInterval(checkFaces, 1500)
    checkFaces()
    return () => window.clearInterval(faceTimerRef.current)
  }, [cameraStatus, isInterviewActive, recordProctoringEvent])

  useEffect(() => {
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track) return undefined
    const handleEnded = () => {
      setCameraStatus('disconnected')
      setCameraMessage('Camera disconnected.')
      recordProctoringEvent('CAMERA_DISCONNECTED')
    }
    track.addEventListener('ended', handleEnded)
    return () => track.removeEventListener('ended', handleEnded)
  }, [cameraStatus, recordProctoringEvent])

  const replay = () => speakQuestion(question)

  useEffect(() => {
    setLastFeedback(null)
  }, [activeQuestion])

  useEffect(() => {
    if (!isInterviewActive) return undefined
    apiRequest('/api/ai/generate-question', {
      method: 'POST',
      body: JSON.stringify({
        resumeAnalysis: JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'),
        jdAnalysis: JSON.parse(localStorage.getItem('jdAnalysis') || '{}'),
        difficulty,
        interviewType: role,
        previousQuestions: [],
      }),
    }).then((result) => {
      if (result?.question) setActiveQuestion(result.question)
    }).catch(() => {})
  }, [isInterviewActive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const updateDuration = (event) => {
      const value = event.detail
      if (value === 'Custom') {
        setDuration('Custom')
        return
      }
      if (value.endsWith(' minutes')) {
        setDuration('Custom')
        setCustomDuration(value.replace(' minutes', ''))
        return
      }
      setDuration(value)
    }

    const stopInterview = () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
      setIsListening(false)
      setIsInterviewActive(false)
      setInterviewStopped(true)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraStatus('disconnected')
      setVoiceMessage('Interview stopped because you left the interview tab.')
    }

    window.addEventListener('interview-duration-change', updateDuration)
    window.addEventListener('interview-tab-switch', stopInterview)

    return () => {
      window.removeEventListener('interview-duration-change', updateDuration)
      window.removeEventListener('interview-tab-switch', stopInterview)
    }
  }, [])

  useEffect(() => {
    if (!isInterviewActive) return undefined
    setRemainingSeconds(Number.parseInt(selectedDuration, 10) * 60)
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isInterviewActive, selectedDuration])

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => {
      setIsListening(true)
      setVoiceMessage('Listening... speak naturally.')
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ')
      setAnswer(transcript)
    }
    recognition.onerror = () => {
      setIsListening(false)
      setVoiceMessage('Microphone access failed. You can type your answer instead.')
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
  }, [])

  const toggleListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceMessage('Speech recognition is not supported here. Type your answer instead.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      setVoiceMessage('Recording paused. Review your answer before submitting.')
      return
    }

    recognitionRef.current?.start()
  }

  const submitAnswer = useCallback(async () => {
    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer) return

    const nextAnswers = [...submittedAnswers, { question, answer: trimmedAnswer }]
    setSubmittedAnswers(nextAnswers)
    sessionStorage.setItem(interviewSessionKey, JSON.stringify({
      role,
      difficulty,
      duration: selectedDuration,
      answers: nextAnswers,
      proctoring: { enabled: true, events: proctoringEvents },
    }))
    apiRequest('/api/ai/evaluate-answer', {
      method: 'POST',
      body: JSON.stringify({
        question,
        answer: trimmedAnswer,
        resumeAnalysis: JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'),
        jdAnalysis: JSON.parse(localStorage.getItem('jdAnalysis') || '{}'),
      }),
    }).then((feedback) => setLastFeedback(feedback)).catch(() => {})
    setVoiceMessage('Answer received. Preparing a follow-up...')
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    try {
      const result = await apiRequest('/api/ai/follow-up', {
        method: 'POST',
        body: JSON.stringify({
          resumeAnalysis: JSON.parse(localStorage.getItem('resumeAnalysis') || '{}'),
          jdAnalysis: JSON.parse(localStorage.getItem('jdAnalysis') || '{}'),
          previousQuestions: submittedAnswers.map((item) => item.question).concat(question),
          previousAnswers: submittedAnswers.map((item) => item.answer).concat(trimmedAnswer),
          previousFeedback: [],
        }),
      })
      setActiveQuestion(result?.question || buildFollowUpQuestion(trimmedAnswer, role, resume.name))
    } catch {
      setActiveQuestion(buildFollowUpQuestion(trimmedAnswer, role, resume.name))
    }
    setAnswer('')
    setCurrentQuestionIndex((index) => index + 1)
    setVoiceMessage('Your follow-up is ready. Answer the next question when you are ready.')
  }, [answer, difficulty, question, resume, role, selectedDuration, submittedAnswers])

  return (
    <div className="page-shell interview-page-shell">
      <header className="session-header">
        <div>
          <p className="eyebrow eyebrow--dark">Live Interview</p>
          <h1>Interview Session</h1>
        </div>
        <div className="session-header-actions"><span className="current-date">{formatCurrentDate()}</span><BackHomeButton /><span className="live-badge">● In Progress</span></div>
      </header>

      {interviewStopped ? <section className="panel-block interview-stopped"><span className="termination-icon">!</span><p className="eyebrow eyebrow--dark">Interview stopped</p><h2>Interview tab changed</h2><p>This activity was recorded as an integrity event. Your interview has been paused and the camera has been disconnected.</p><div className="saved-job-card__actions"><button type="button" className="button button-primary" onClick={() => window.location.assign('/dashboard')}>Return to dashboard</button><button type="button" className="button button-ghost" onClick={() => window.location.reload()}>Start again</button></div></section> : !isInterviewActive ? <section className="panel-block interview-readiness">
        <div><p className="eyebrow eyebrow--dark">Interview Readiness</p><h2>Prepare your interview environment</h2><p>Your camera is used during the interview to verify face presence and interview integrity. No video is recorded or uploaded.</p></div>
        <div className="readiness-camera"><video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" /><div className={`camera-status camera-status--${cameraStatus}`}><span />{cameraMessage}</div></div>
        <div className="readiness-checks"><span>✓ Microphone</span><span className={cameraStatus === 'active' ? 'ready' : 'warning'}>{cameraStatus === 'active' ? '✓ Camera' : '⚠ Camera'}</span><span>✓ Browser</span><span>✓ Interview environment</span></div>
        <button type="button" className="button button-primary" disabled={cameraStatus !== 'active'} onClick={() => setIsInterviewActive(true)}>Start Interview</button>
      </section> : <div className="session-layout">
        <aside className="session-aside">
          <div className="interview-avatar">ai</div>
          <span className="ai-label">AI Interviewer</span>
          <p>Answer the questions clearly. Take your time.</p>
        </aside>

        <section className="session-main">
          <div className="session-meta-row">
            <span className="question-counter">Question {currentQuestionIndex}/10</span>
            <strong>{formatTimer(remainingSeconds)}</strong>
          </div>

          <div className="question-card">
            <h2>{question}</h2>
          </div>

          {lastFeedback && <section className="panel-block interview-feedback-card">
            <div className="panel-header">
              <h3>Answer Feedback</h3>
              <button type="button" className="icon-button" onClick={() => setLastFeedback(null)} aria-label="Dismiss feedback">×</button>
            </div>
            <p><span className="score-pill score-amber">Score: {lastFeedback.score}/10</span></p>
            {lastFeedback.strengths?.length > 0 && <div className="feedback-list"><strong>Strengths</strong><ul>{lastFeedback.strengths.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {(lastFeedback.weaknesses?.length > 0 || lastFeedback.improvementSuggestions?.length > 0) && <div className="feedback-list"><strong>Improve next</strong><ul>{[...(lastFeedback.weaknesses || []), ...(lastFeedback.improvementSuggestions || [])].slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </section>}

          <div className="voice-panel">
            <button type="button" className={isListening ? 'mic-button listening' : 'mic-button'} onClick={toggleListening} aria-label={isListening ? 'Stop speaking' : 'Start speaking'}>
              <span>{isListening ? '■' : '⌁'}</span>
            </button>
            <div className="voice-panel__content">
              <strong>{isListening ? 'Listening...' : 'Click to start recording'}</strong>
              <small>{voiceMessage}</small>
            </div>
          </div>

          <label className="answer-label answer-label--session">
            Your answer
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Your live transcript will appear here..." />
          </label>

          <div className="room-actions">
            <button type="button" className="button button-ghost" onClick={() => setAnswer('')}>Clear answer</button>
            <button type="button" className="button button-primary" disabled={!answer.trim()} onClick={submitAnswer}>Submit answer <span aria-hidden="true">↗</span></button>
          </div>
          <div className="session-finish-row">
            <a className="inline-link" href="/interview/report">Finish and review feedback ({submittedAnswers.length} submitted)</a>
          </div>
        </section>

        <aside className="session-progress-panel">
          <h3>Interview Progress</h3>
          <div className="progress-detail">
            <span>{currentQuestionIndex}/10</span>
            <div className="progress-bar progress-bar--small"><span style={{ width: `${(currentQuestionIndex / 10) * 100}%` }} /></div>
          </div>
          <ul className="tips-list">
            <li>Speak clearly</li>
            <li>Take your time</li>
            <li>Answer based on your experience</li>
          </ul>
          <div className="proctoring-card"><video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" /><div className={`camera-status camera-status--${cameraStatus}`}><span />{cameraStatus === 'active' ? 'Camera active' : cameraMessage}</div>{cameraStatus === 'disconnected' && <button type="button" className="button button-ghost button-small" onClick={requestCamera}>Reconnect camera</button>}{faceStatus === 'missing' && <small>Face not detected. Please remain visible in the camera.</small>}{faceStatus === 'multiple' && <small>Multiple faces detected. Please ensure you are the only person visible.</small>}</div>
        </aside>
      </div>
      }

      {isInterviewActive && showIntegrityWarning && <div className="proctoring-warning" role="alert"><strong>⚠ Interview tab changed</strong><span>{showIntegrityWarning}</span><button type="button" onClick={() => setShowIntegrityWarning('')} aria-label="Dismiss warning">×</button></div>}
      {isInterviewActive && <InterviewMonitor onEvent={recordProctoringEvent} />}
    </div>
  )
}
