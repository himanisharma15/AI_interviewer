import { AiServiceError, generateChatReply, generateJson } from '../services/geminiService.js'

const send = (res, data) => res.json({ success: true, data })
const requiredText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new AiServiceError(`${label} is required.`, 400)
  return value.trim()
}
const handler = (work) => async (req, res) => {
  try { send(res, await work(req.body)) } catch (error) {
    res.status(error.status || 503).json({ success: false, message: error.message || 'AI service is temporarily unavailable. Please try again.' })
  }
}

export const analyzeResume = handler(({ resumeText }) => generateJson(
  'You are an expert resume analyst. Analyze the resume. Return an object with: name (string), skills (string array), technicalSkills (string array), experience (string array), projects (array of {name, description, technologies}), education (string array), technologies (string array), strengths (string array), recommendedSkills (string array), summary (string). Do not invent details.',
  { resumeText: requiredText(resumeText, 'Resume text') },
))

export const analyzeJobDescription = handler(({ jobDescription }) => generateJson(
  'You are a recruiting analyst. Analyze this job description. Return an object with: jobRole (string), requiredSkills (string array), preferredSkills (string array), responsibilities (string array), experienceRequirements (string array), technologies (string array), keywords (string array), summary (string). Do not invent requirements.',
  { jobDescription: requiredText(jobDescription, 'Job description') },
))

export const generateQuestion = handler(({ resumeAnalysis = {}, jdAnalysis = {}, difficulty = 'Intermediate', interviewType = 'Mixed', previousQuestions = [] }) => generateJson(
  'You are an interview coach. Generate exactly one personalized interview question. Return {question, category, rationale}. category must be one of Technical, Resume-based, Project-based, Behavioral, HR, Problem-solving. Match the requested difficulty and interview type. Avoid repeating previous questions. For Project-based questions, select exactly one project from resumeAnalysis.projects and include its exact name in the question. Never say vague phrases such as “the project most relevant to this role”. If no named project is available, ask the candidate to first name the project they want to discuss.',
  { resumeAnalysis, jdAnalysis, difficulty, interviewType, previousQuestions },
))

export const evaluateAnswer = handler(({ question, answer, resumeAnalysis = {}, jdAnalysis = {} }) => generateJson(
  'You are a fair interview evaluator. Return {score, technicalAccuracy, relevance, completeness, communication, strengths, weaknesses, missingPoints, improvementSuggestions, improvedAnswer}. score is an integer from 0 to 10. All other score categories are concise strings; list fields are string arrays. Give constructive, specific feedback.',
  { question: requiredText(question, 'Question'), answer: requiredText(answer, 'Answer'), resumeAnalysis, jdAnalysis },
))

export const followUp = handler(({ resumeAnalysis = {}, jdAnalysis = {}, previousQuestions = [], previousAnswers = [], previousFeedback = [] }) => generateJson(
  'You are an interviewer. Generate one specific follow-up based on the latest answer and its feedback. Return {question, rationale}. Do not repeat prior questions. If discussing a project, repeat that project’s exact name from the previous question or answer so the candidate always knows which project you mean.',
  { resumeAnalysis, jdAnalysis, previousQuestions, previousAnswers, previousFeedback },
))

export const generateReport = handler(({ interview = {}, resumeAnalysis = {}, jdAnalysis = {} }) => generateJson(
  'You are an interview coach creating a final report. Return {overallScore, technicalScore, communicationScore, problemSolvingScore, jdRelevanceScore, summary, strongAreas, weakAreas, recommendedTopics, improvementPlan}. Scores are integers 0 through 100. Arrays contain concise strings. Base every conclusion on supplied interview data only.',
  { interview, resumeAnalysis, jdAnalysis },
))

export const summarizeInterview = handler(({ transcript }) => generateJson(
  'You are an interview coach. Summarize this interview transcript in plain language. Return {summary, keyMoments, overallImpression}. keyMoments is a string array of the 3-5 most important exchanges.',
  { transcript: requiredText(transcript, 'Transcript') },
))

export const recommendPractice = handler(({ pastReports = [], resumeAnalysis = {} }) => generateJson(
  'You are a career coach. Based on this history of interview reports and resume, recommend what the candidate should practice next. Return {recommendedTopics, recommendedDifficulty, recommendedInterviewType, reasoning}.',
  { pastReports, resumeAnalysis },
))

export const scoreJobMatch = handler(({ resumeAnalysis = {}, jdAnalysis = {} }) => generateJson(
  "You are a recruiting analyst. Compare this candidate's resume analysis against this job description analysis. Return {matchScore, matchingSkills, missingSkills, summary}. matchScore is an integer 0-100 based on real overlap between the candidate's skills/experience and the job's required/preferred skills. Do not inflate the score - base it strictly on the supplied data.",
  { resumeAnalysis, jdAnalysis },
))

export const parseSearchQuery = handler(({ query }) => generateJson(
  'Convert this natural language search into a structured filter. Return {role, dateFrom, dateTo, minScore, maxScore, interviewType}. Omit fields not mentioned. Do not guess values.',
  { query: requiredText(query, 'Search query') },
))

export const chatWithAssistant = handler(({ messages, context = {} }) => {
  if (!Array.isArray(messages) || messages.length === 0) throw new AiServiceError('Messages are required.', 400)
  return generateChatReply(messages, context).then((reply) => ({ reply }))
})
