export const roles = ['Frontend', 'Backend', 'Full stack', 'MERN stack', 'Data analyst']
export const difficulties = ['Beginner', 'Intermediate', 'Advanced']
export const durations = ['30 minutes', '60 minutes', 'Custom']

export function speakQuestion(question) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(question))
}

export function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

export function buildFollowUpQuestion(answer, role, resumeName) {
  const normalizedAnswer = answer.replace(/\s+/g, ' ').trim()
  const problemStatement = normalizedAnswer.split(/[.!?]/)[0].slice(0, 140)
  const context = problemStatement || `your work as a ${role} candidate`
  const lowerAnswer = normalizedAnswer.toLowerCase()
  let focus = 'how you evaluated the trade-offs and measured the result'

  if (/bug|error|issue|fail|problem|incident/.test(lowerAnswer)) {
    focus = 'how you isolated the root cause and prevented the problem from happening again'
  }
  if (/performance|slow|latency|scale|load/.test(lowerAnswer)) {
    focus = 'which performance signal you used and what change made the biggest difference'
  }
  if (/team|collaborat|stakeholder|communicat/.test(lowerAnswer)) {
    focus = 'how you aligned the team and handled a different point of view'
  }
  if (/database|api|backend|frontend|react|javascript|python|deploy/.test(lowerAnswer)) {
    focus = 'the technical reasoning behind your approach and what you would improve now'
  }

  return `You mentioned ${context}. Thinking about your ${resumeName} experience, ${focus}?`
}
