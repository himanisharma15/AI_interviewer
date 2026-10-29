import { Router } from 'express'
import Interview from '../models/Interview.js'
import Workspace from '../models/Workspace.js'
import InterviewRound from '../models/InterviewRound.js'
import Feedback from '../models/Feedback.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const interview = await Interview.create({
      ...req.body,
      userId: req.userId,
    })
    res.status(201).json({ success: true, data: interview })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to save interview.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.userId }
    const { role, dateFrom, dateTo, minScore, maxScore, interviewType } = req.query

    if (role) filter.role = { $regex: String(role), $options: 'i' }
    if (interviewType) filter.interviewType = { $regex: String(interviewType), $options: 'i' }
    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(String(dateFrom))
      if (dateTo) filter.createdAt.$lte = new Date(String(dateTo))
    }
    if (minScore || maxScore) {
      filter.overallScore = {}
      if (minScore !== undefined) filter.overallScore.$gte = Number(minScore)
      if (maxScore !== undefined) filter.overallScore.$lte = Number(maxScore)
    }

    const interviews = await Interview.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, data: interviews })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch interviews.' })
  }
})

router.get('/history', async (req, res) => {
  try {
    const [interviews, workspaces] = await Promise.all([
      Interview.find({ userId: req.userId }).sort({ createdAt: -1 }).lean(),
      Workspace.find({ candidateId: req.userId }).select('_id company jobRole').lean(),
    ])
    const workspaceIds = workspaces.map((workspace) => workspace._id)
    const rounds = await InterviewRound.find({ workspaceId: { $in: workspaceIds } }).sort({ scheduledAt: -1 }).lean()
    const feedback = await Feedback.find({ workspaceId: { $in: workspaceIds }, visibleToCandidate: true }).sort({ updatedAt: -1 }).lean()
    const workspaceById = new Map(workspaces.map((workspace) => [String(workspace._id), workspace]))
    const roundById = new Map(rounds.map((round) => [String(round._id), round]))
    const recruiterFeedback = feedback.map((item) => ({ ...item, round: roundById.get(String(item.roundId)), workspace: workspaceById.get(String(item.workspaceId)) }))
    const history = interviews.map((interview) => ({ ...interview, recruiterFeedback: recruiterFeedback.find((item) => item.workspace?.jobRole?.toLowerCase() === interview.role?.toLowerCase()) || null }))
    res.json({ success: true, data: { interviews: history, recruiterFeedback } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview history.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.userId })
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' })
    res.json({ success: true, data: interview })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview.' })
  }
})

export default router
