import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import InterviewMonitor from '../components/InterviewMonitor'
import { buildFollowUpQuestion, formatTimer, speakQuestion } from '../lib/interview'
import { interviewSessionKey } from '../lib/report'
import BackHomeButton from '../components/BackHomeButton'
import { formatCurrentDate } from '../lib/date'
import AIAssistant from '../components/AIAssistant'
import { apiRequest } from '../lib/api'

export default function InterviewSessionPage() {
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

  const selectedDuration = duration === 'Custom' ? `${customDuration} minutes` : duration
  const initialQuestion = `Based on your resume (${resume?.name}), tell me about a project where you made a difficult technical decision for a ${role} role. Your ${selectedDuration} session starts now.`
  const question = activeQuestion || initialQuestion

  const replay = () => speakQuestion(question)

  useEffect(() => {
    setLastFeedback(null)
  }, [activeQuestion])

  useEffect(() => {
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      setVoiceMessage('Interview stopped because a tab switch was detected.')
    }

    window.addEventListener('interview-duration-change', updateDuration)
    window.addEventListener('interview-tab-switch', stopInterview)

    return () => {
      window.removeEventListener('interview-duration-change', updateDuration)
      window.removeEventListener('interview-tab-switch', stopInterview)
    }
  }, [])

  useEffect(() => {
    setRemainingSeconds(Number.parseInt(selectedDuration, 10) * 60)
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [selectedDuration])

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

      <div className="session-layout">
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
        </aside>
      </div>

      <InterviewMonitor />
      <AIAssistant context={{ role, difficulty, currentQuestion: question, questionIndex: currentQuestionIndex }} />
    </div>
  )
}
