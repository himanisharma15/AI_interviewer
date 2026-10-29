export const interviewSessionKey = 'intervueai-interview-session'

function scoreAnswer(answer) {
  const normalized = answer.trim().toLowerCase()
  let score = 4

  if (normalized.length >= 80) score += 1
  if (normalized.length >= 180) score += 1
  if (/because|therefore|trade[- ]?off|reason|decided|measured|result|impact/.test(normalized)) score += 1
  if (/implemented|built|led|improved|resolved|reduced|increased|deployed|designed/.test(normalized)) score += 1
  if (/\d+\s?(%|ms|seconds?|minutes?|users?|hours?|days?)/.test(normalized)) score += 1

  return Math.min(score, 10)
}

export function buildLocalReport(session) {
  const answers = Array.isArray(session?.answers) ? session.answers.filter((item) => item.answer?.trim()) : []
  if (!answers.length) return null

  const scores = answers.map((item) => scoreAnswer(item.answer))
  const average = Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10)
  const detailedAnswers = answers.map((item, index) => ({ ...item, score: scores[index] }))
  const hasEvidence = answers.some((item) => /\d+\s?(%|ms|seconds?|minutes?|users?|hours?|days?)/i.test(item.answer))
  const hasStructure = answers.some((item) => /because|therefore|trade[- ]?off|reason|decided/i.test(item.answer))

  return {
    overallScore: average,
    technicalScore: average,
    communicationScore: Math.min(100, average + (hasStructure ? 4 : 0)),
    problemSolvingScore: Math.min(100, average + (hasEvidence ? 3 : 0)),
    jdRelevanceScore: average,
    summary: `Based on ${answers.length} submitted answer${answers.length === 1 ? '' : 's'}, your current practice score is ${average}/100. This is a practice estimate from the evidence in your answers, not a comparison with other candidates.`,
    strongAreas: [
      answers.length >= 3 ? 'You completed multiple practice answers.' : 'You started building an interview answer record.',
      hasStructure ? 'Some answers explain decisions and reasoning.' : 'Keep making the reasoning behind each decision explicit.',
      hasEvidence ? 'At least one answer includes measurable evidence.' : 'Add measurable outcomes when they are available.',
    ],
    weakAreas: [
      !hasStructure ? 'Explain the reasoning and trade-offs behind your decisions.' : 'Keep tightening the reasoning in longer answers.',
      !hasEvidence ? 'Include metrics, scope, or observable outcomes where truthful.' : 'Connect metrics directly to your actions and impact.',
      answers.some((item) => item.answer.trim().length < 80) ? 'Expand short answers with context, action, and result.' : 'Remove details that do not support the main point.',
    ],
    recommendedTopics: ['Answer structure: context, action, result', 'Explaining technical trade-offs', 'Using specific evidence and outcomes'],
    improvementPlan: 'For your next answer, state the situation briefly, explain the decision you made, and finish with the measurable result or lesson. Do not invent metrics; say when you do not have one.',
    answers: detailedAnswers,
  }
}
