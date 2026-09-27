import { Router } from 'express'
import mongoose from 'mongoose'
import InterviewRound from '../models/InterviewRound.js'
import Workspace from '../models/Workspace.js'
import Interview from '../models/Interview.js'
import Feedback from '../models/Feedback.js'
import { generateQuestion } from '../controllers/aiController.js'
import { generateJson } from '../services/geminiService.js'
import { sendInterviewInvitation } from '../services/emailService.js'

const router = Router({ mergeParams: true })
const roundStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled']

async function getWorkspace(workspaceId) {
  if (!mongoose.isValidObjectId(workspaceId)) return null
  return Workspace.findById(workspaceId)
}

function isParticipant(workspace, userId) {
  return workspace && (String(workspace.candidateId) === String(userId) || String(workspace.recruiterId) === String(userId))
}

function isRecruiter(workspace, userId) {
  return workspace && String(workspace.recruiterId) === String(userId)
}

function runGenerateQuestion(input) {
  return new Promise((resolve, reject) => {
    let statusCode = 200
    const response = {
      status(code) { statusCode = code; return response },
      json(payload) {
        if (statusCode >= 400 || !payload?.success) return reject(Object.assign(new Error(payload?.message || 'Failed to generate question.'), { status: statusCode }))
        resolve(payload.data)
      },
    }
    generateQuestion({ body: input }, response)
  })
}

router.post('/', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'Only a workspace participant can schedule interview rounds.' })
    const { type, interviewerName, scheduledAt, durationMinutes, instructions = '' } = req.body
    const round = await InterviewRound.create({ workspaceId: workspace._id, type, interviewerName, scheduledAt, durationMinutes, instructions })
    const candidate = await mongoose.models.User.findById(workspace.candidateId).select('name email').lean()
    let invitation
    try {
      invitation = await sendInterviewInvitation({ recipient: workspace.recruiterEmail, company: workspace.company, jobRole: workspace.jobRole, candidateName: candidate?.name || candidate?.email || 'Candidate', round })
    } catch (error) {
      invitation = { sent: false, configured: true, error: error.message || 'Email delivery failed.' }
    }
    round.invitationStatus = invitation.sent ? 'sent' : invitation.configured ? 'failed' : 'not_configured'
    round.invitationError = invitation.error || ''
    round.invitationSentAt = invitation.sent ? new Date() : null
    await round.save()
    res.status(201).json({ success: true, data: round, invitation: { sent: invitation.sent, status: round.invitationStatus, message: invitation.sent ? `Invitation sent to ${workspace.recruiterEmail}.` : invitation.error } })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create interview round.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const rounds = await InterviewRound.find({ workspaceId: workspace._id }).sort({ scheduledAt: 1 })
    res.json({ success: true, data: rounds })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview rounds.' })
  }
})

router.patch('/:roundId', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isRecruiter(workspace, req.userId)) return res.status(403).json({ success: false, message: 'Only the workspace recruiter can update interview rounds.' })
    if (!mongoose.isValidObjectId(req.params.roundId)) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const updates = {}
    for (const field of ['status', 'scheduledAt', 'durationMinutes', 'instructions']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }
    if (updates.status && !roundStatuses.includes(updates.status)) return res.status(400).json({ success: false, message: 'Invalid interview round status.' })
    const round = await InterviewRound.findOneAndUpdate({ _id: req.params.roundId, workspaceId: workspace._id }, updates, { new: true, runValidators: true })
    if (!round) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    res.json({ success: true, data: round })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update interview round.' })
  }
})

router.patch('/:roundId/focus', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isRecruiter(workspace, req.userId)) return res.status(403).json({ success: false, message: 'Only the workspace recruiter can set interview focus.' })
    if (!mongoose.isValidObjectId(req.params.roundId)) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const focusTopics = Array.isArray(req.body.focusTopics) ? [...new Set(req.body.focusTopics.map((topic) => String(topic).trim()).filter(Boolean))] : []
    const difficulty = req.body.difficulty || 'Intermediate'
    const questionType = req.body.questionType || 'Technical'
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)) return res.status(400).json({ success: false, message: 'Invalid difficulty.' })
    const round = await InterviewRound.findOneAndUpdate({ _id: req.params.roundId, workspaceId: workspace._id }, { focusTopics, difficulty, questionType }, { new: true, runValidators: true })
    if (!round) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    res.json({ success: true, data: round })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to save interview focus.' })
  }
})

router.post('/:roundId/generate-questions', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isRecruiter(workspace, req.userId)) return res.status(403).json({ success: false, message: 'Only the workspace recruiter can generate questions.' })
    if (!mongoose.isValidObjectId(req.params.roundId)) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const round = await InterviewRound.findOne({ _id: req.params.roundId, workspaceId: workspace._id })
    if (!round) return res.status(404).json({ success: false, message: 'Interview round not found.' })

    const resumeAnalysis = workspace.resumeAnalysis && Object.keys(workspace.resumeAnalysis).length ? workspace.resumeAnalysis : req.body.resumeAnalysis || {}
    const jdAnalysis = workspace.jdAnalysis && Object.keys(workspace.jdAnalysis).length ? workspace.jdAnalysis : req.body.jdAnalysis || (workspace.jobDescription ? { summary: workspace.jobDescription } : {})
    if ((!Object.keys(workspace.resumeAnalysis || {}).length && req.body.resumeAnalysis) || (!Object.keys(workspace.jdAnalysis || {}).length && req.body.jdAnalysis)) {
      workspace.resumeAnalysis = resumeAnalysis
      workspace.jdAnalysis = jdAnalysis
      await workspace.save()
    }

    const questionCount = Math.min(10, Math.max(1, Number(req.body.questionCount) || 5))
    const previousQuestions = []
    const questions = []
    for (let index = 0; index < questionCount; index += 1) {
      const generated = await runGenerateQuestion({ resumeAnalysis, jdAnalysis: { ...jdAnalysis, focusTopics: round.focusTopics }, difficulty: round.difficulty, interviewType: round.questionType, previousQuestions: [...previousQuestions, ...(round.focusTopics.length ? [`Focus on: ${round.focusTopics.join(', ')}`] : [])] })
      questions.push(generated)
      previousQuestions.push(generated.question)
    }
    round.questions = questions
    round.questionsGeneratedAt = new Date()
    await round.save()
    res.json({ success: true, data: round })
  } catch (error) {
    res.status(error.status || 503).json({ success: false, message: error.message || 'Failed to generate interview questions.' })
  }
})

router.post('/:roundId/feedback', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isRecruiter(workspace, req.userId)) return res.status(403).json({ success: false, message: 'Only the workspace recruiter can submit feedback.' })
    if (!mongoose.isValidObjectId(req.params.roundId)) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const round = await InterviewRound.findOne({ _id: req.params.roundId, workspaceId: workspace._id })
    if (!round) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const feedback = await Feedback.findOneAndUpdate(
      { roundId: round._id },
      { roundId: round._id, workspaceId: workspace._id, recruiterId: req.userId, ratings: req.body.ratings, comments: req.body.comments || '', visibleToCandidate: req.body.visibleToCandidate !== false },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )
    res.status(201).json({ success: true, data: feedback })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to save feedback.' })
  }
})

router.get('/:roundId/feedback', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const feedback = await Feedback.findOne({ roundId: req.params.roundId, workspaceId: workspace._id })
    if (!feedback || (!isRecruiter(workspace, req.userId) && !feedback.visibleToCandidate)) return res.json({ success: true, data: null })
    res.json({ success: true, data: feedback })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch feedback.' })
  }
})

router.post('/:roundId/improvement-plan', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    if (!mongoose.isValidObjectId(req.params.roundId)) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const round = await InterviewRound.findOne({ _id: req.params.roundId, workspaceId: workspace._id })
    if (!round) return res.status(404).json({ success: false, message: 'Interview round not found.' })
    const storedFeedback = await Feedback.findOne({ roundId: round._id, workspaceId: workspace._id })
    const feedback = isRecruiter(workspace, req.userId) || storedFeedback?.visibleToCandidate ? storedFeedback : null
    const report = await Interview.findOne({ userId: workspace.candidateId }).sort({ createdAt: -1 })
    const resumeAnalysis = workspace.resumeAnalysis || {}
    const jdAnalysis = workspace.jdAnalysis && Object.keys(workspace.jdAnalysis).length ? workspace.jdAnalysis : { summary: workspace.jobDescription }
    const improvementPlan = await generateJson(
      'You are an interview coach creating a personalized improvement plan. Return exactly {recommendedTopics, recommendedDifficulty, reasoning}. recommendedTopics must be a concise string array, recommendedDifficulty must be Beginner, Intermediate, or Advanced, and reasoning must be a concise actionable string. Base the plan only on the supplied feedback, AI report, resume analysis, and job description analysis.',
      { feedback: feedback || {}, aiReport: report || {}, resumeAnalysis, jdAnalysis, round: { type: round.type, focusTopics: round.focusTopics, difficulty: round.difficulty, questionType: round.questionType } },
    )
    res.json({ success: true, data: improvementPlan })
  } catch (error) {
    res.status(error.status || 503).json({ success: false, message: error.message || 'Failed to create an improvement plan.' })
  }
})

export default router