import { Router } from 'express'
import mongoose from 'mongoose'
import Workspace from '../models/Workspace.js'
import InterviewRound from '../models/InterviewRound.js'
import Feedback from '../models/Feedback.js'
import Interview from '../models/Interview.js'
import Document from '../models/Document.js'
import Note from '../models/Note.js'

const router = Router()
const User = () => mongoose.models.User

async function claimPendingWorkspaces(userId) {
  const recruiter = await User().findById(userId).select('email role')
  if (!recruiter || recruiter.role !== 'recruiter') return recruiter
  await Workspace.updateMany({ recruiterId: null, recruiterEmail: recruiter.email }, { $set: { recruiterId: recruiter._id, status: 'active' } })
  return recruiter
}

async function recruiterWorkspace(workspaceId, userId) {
  return Workspace.findOne({ _id: workspaceId, recruiterId: userId }).populate('candidateId', 'name email profileImage')
}

router.get('/', async (req, res) => {
  try {
    const recruiter = await claimPendingWorkspaces(req.userId)
    if (!recruiter || recruiter.role !== 'recruiter') return res.status(403).json({ success: false, message: 'Recruiter access required.' })
    const workspaces = await Workspace.find({ recruiterId: req.userId }).select('_id candidateId status')
    const workspaceIds = workspaces.map((workspace) => workspace._id)
    const rounds = await InterviewRound.find({ workspaceId: { $in: workspaceIds } }).select('workspaceId status scheduledAt')
    const completedRoundIds = rounds.filter((round) => round.status === 'Completed').map((round) => round._id)
    const feedback = await Feedback.find({ roundId: { $in: completedRoundIds } }).select('roundId')
    const feedbackRoundIds = new Set(feedback.map((item) => String(item.roundId)))
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    res.json({ success: true, data: {
      activeCandidates: new Set(workspaces.filter((workspace) => workspace.status === 'active').map((workspace) => String(workspace.candidateId))).size,
      interviewsToday: rounds.filter((round) => new Date(round.scheduledAt) >= start && new Date(round.scheduledAt) < end).length,
      pendingFeedback: completedRoundIds.filter((roundId) => !feedbackRoundIds.has(String(roundId))).length,
      completedInterviews: rounds.filter((round) => round.status === 'Completed').length,
    } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch recruiter analytics.' })
  }
})

router.get('/interviews', async (req, res) => {
  try {
    const recruiter = await claimPendingWorkspaces(req.userId)
    if (!recruiter || recruiter.role !== 'recruiter') return res.status(403).json({ success: false, message: 'Recruiter access required.' })
    const workspaces = await Workspace.find({ recruiterId: req.userId }).populate('candidateId', 'name email').lean()
    const workspaceIds = workspaces.map((workspace) => workspace._id)
    const rounds = await InterviewRound.find({ workspaceId: { $in: workspaceIds }, status: { $ne: 'Cancelled' } }).sort({ scheduledAt: 1 }).lean()
    const workspaceById = new Map(workspaces.map((workspace) => [String(workspace._id), workspace]))
    res.json({ success: true, data: rounds.map((round) => ({ ...round, workspace: workspaceById.get(String(round.workspaceId)) })) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch recruiter interviews.' })
  }
})

router.get('/interviews/:roundId', async (req, res) => {
  try {
    await claimPendingWorkspaces(req.userId)
    if (!mongoose.isValidObjectId(req.params.roundId)) return res.status(404).json({ success: false, message: 'Interview not found.' })
    const round = await InterviewRound.findById(req.params.roundId).lean()
    if (!round) return res.status(404).json({ success: false, message: 'Interview not found.' })
    const workspace = await recruiterWorkspace(round.workspaceId, req.userId)
    if (!workspace) return res.status(403).json({ success: false, message: 'Recruiter access required.' })
    const [feedback, documents, notes, aiReport] = await Promise.all([
      Feedback.findOne({ roundId: round._id }).lean(),
      Document.find({ workspaceId: workspace._id }).lean(),
      Note.find({ workspaceId: workspace._id }).sort({ updatedAt: -1 }).lean(),
      Interview.findOne({ userId: workspace.candidateId._id }).sort({ createdAt: -1 }).lean(),
    ])
    res.json({ success: true, data: { round, workspace, candidate: workspace.candidateId, feedback, documents, notes, aiReport } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview details.' })
  }
})

export default router