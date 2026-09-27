import { Router } from 'express'
import mongoose from 'mongoose'
import Workspace from '../models/Workspace.js'
import InterviewRound from '../models/InterviewRound.js'
import Feedback from '../models/Feedback.js'
import Interview from '../models/Interview.js'
import SavedJob from '../models/SavedJob.js'
import Document from '../models/Document.js'
import Note from '../models/Note.js'
import crypto from 'node:crypto'
import { sendWorkspaceInvitation } from '../services/emailService.js'

const router = Router()
const getUserModel = () => mongoose.models.User

const isParticipant = (workspace, userId) => workspace && (String(workspace.candidateId) === String(userId) || String(workspace.recruiterId) === String(userId))
const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length) : 0
const publicFieldNames = ['resume', 'achievements', 'skills', 'interviewSummary', 'status']
const createSlug = async () => {
  let slug
  do { slug = crypto.randomBytes(7).toString('hex') } while (await Workspace.exists({ publicSlug: slug }))
  return slug
}

export async function createWorkspaceRecord({ candidateId, recruiterId = null, company, jobRole, jobDescription = '', interviewType = 'Technical', recruiterEmail, status = 'pending_invite' }) {
  const normalizedRecruiterEmail = recruiterEmail?.trim().toLowerCase()
  if (!company?.trim() || !jobRole?.trim() || !normalizedRecruiterEmail) throw new Error('Company, job role, and recruiter email are required.')
  return Workspace.create({ candidateId, recruiterId, company, jobRole, jobDescription, interviewType, recruiterEmail: normalizedRecruiterEmail, status })
}

router.post('/', async (req, res) => {
  try {
    const { company, jobRole, jobDescription = '', interviewType = 'Technical', recruiterEmail } = req.body
    const workspace = await createWorkspaceRecord({ candidateId: req.userId, company, jobRole, jobDescription, interviewType, recruiterEmail })
    const candidate = await getUserModel().findById(req.userId).select('name email').lean()
    let invitation
    try {
      invitation = await sendWorkspaceInvitation({ recipient: workspace.recruiterEmail, company, jobRole, candidateName: candidate?.name || candidate?.email || 'Candidate', interviewType })
    } catch (error) {
      invitation = { sent: false, configured: true, error: error.message || 'Email delivery failed.' }
    }
    workspace.invitationStatus = invitation.sent ? 'sent' : invitation.configured ? 'failed' : 'not_configured'
    workspace.invitationError = invitation.error || ''
    workspace.invitationSentAt = invitation.sent ? new Date() : null
    await workspace.save()
    res.status(201).json({ success: true, data: workspace })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create workspace.' })
  }
})

router.post('/:id/resend-invitation', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const workspace = await Workspace.findOne({ _id: req.params.id, candidateId: req.userId })
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const candidate = await getUserModel().findById(req.userId).select('name email').lean()
    let invitation
    try {
      invitation = await sendWorkspaceInvitation({ recipient: workspace.recruiterEmail, company: workspace.company, jobRole: workspace.jobRole, candidateName: candidate?.name || candidate?.email || 'Candidate', interviewType: workspace.interviewType })
    } catch (error) {
      invitation = { sent: false, configured: true, error: error.message || 'Email delivery failed.' }
    }
    workspace.invitationStatus = invitation.sent ? 'sent' : invitation.configured ? 'failed' : 'not_configured'
    workspace.invitationError = invitation.error || ''
    workspace.invitationSentAt = invitation.sent ? new Date() : null
    await workspace.save()
    res.json({ success: true, data: workspace })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to resend workspace invitation.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({ $or: [{ candidateId: req.userId }, { recruiterId: req.userId }] }).sort({ updatedAt: -1 })
    res.json({ success: true, data: workspaces })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch workspaces.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const workspace = await Workspace.findById(req.params.id)
    if (!isParticipant(workspace, req.userId)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    res.json({ success: true, data: workspace })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch workspace.' })
  }
})

router.get('/:id/analytics', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const workspace = await Workspace.findById(req.params.id)
    if (!isParticipant(workspace, req.userId)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const [rounds, feedback, interviews, savedJobs] = await Promise.all([
      InterviewRound.find({ workspaceId: workspace._id }),
      Feedback.find({ workspaceId: workspace._id }),
      Interview.find({ userId: workspace.candidateId }),
      SavedJob.find({ userId: workspace.candidateId }).sort({ savedAt: -1 }),
    ])
    const matchingJob = savedJobs.find((job) => job.company?.toLowerCase() === workspace.company.toLowerCase() || job.roleTitle?.toLowerCase() === workspace.jobRole.toLowerCase()) || savedJobs[0]
    res.json({ success: true, data: {
      interviewsCompleted: rounds.filter((round) => round.status === 'Completed').length,
      averageAiScore: average(interviews.map((interview) => interview.overallScore)),
      averageRecruiterScore: average(feedback.map((item) => (Number(item.ratings?.overall) || 0) * 20)),
      jdMatchScore: Number(matchingJob?.matchScore) || 0,
      technicalScore: average(interviews.map((interview) => interview.technicalScore)),
      communicationScore: average(interviews.map((interview) => interview.communicationScore)),
    } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch workspace analytics.' })
  }
})

router.get('/:id/activity', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const workspace = await Workspace.findById(req.params.id)
    if (!isParticipant(workspace, req.userId)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const [rounds, feedback, documents, notes] = await Promise.all([
      InterviewRound.find({ workspaceId: workspace._id }).lean(),
      Feedback.find({ workspaceId: workspace._id }).lean(),
      Document.find({ workspaceId: workspace._id }).lean(),
      Note.find({ workspaceId: workspace._id }).lean(),
    ])
    const userIds = [...new Set([...rounds.map((round) => workspace.recruiterId), ...feedback.map((item) => item.recruiterId), ...documents.map((document) => document.uploadedBy), ...notes.map((note) => note.authorId)].filter(Boolean).map(String))]
    const users = await getUserModel().find({ _id: { $in: userIds } }).select('name email').lean()
    const names = new Map(users.map((user) => [String(user._id), user.name || user.email.split('@')[0]]))
    const actorName = (id, fallback) => names.get(String(id)) || fallback
    const activity = [
      ...rounds.map((round) => ({ id: `round-${round._id}`, createdAt: round.createdAt, message: `${actorName(workspace.recruiterId, 'Recruiter')} added ${round.type} Round`, type: 'round' })),
      ...feedback.map((item) => ({ id: `feedback-${item._id}`, createdAt: item.createdAt, message: `${actorName(item.recruiterId, 'Recruiter')} shared feedback`, type: 'feedback' })),
      ...documents.map((document) => ({ id: `document-${document._id}`, createdAt: document.createdAt, message: `${actorName(document.uploadedBy, 'A participant')} uploaded ${document.type}`, type: 'document' })),
      ...notes.map((note) => ({ id: `note-${note._id}`, createdAt: note.updatedAt, message: `${actorName(note.authorId, 'A participant')} updated note "${note.title}"`, type: 'note' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json({ success: true, data: activity })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch workspace activity.' })
  }
})

router.patch('/:id/public-settings', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const workspace = await Workspace.findOne({ _id: req.params.id, candidateId: req.userId })
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const nextFields = {}
    for (const field of publicFieldNames) nextFields[field] = Boolean(req.body.publicFields?.[field])
    workspace.publicFields = nextFields
    if (req.body.rotateSlug || !workspace.publicSlug) workspace.publicSlug = await createSlug()
    await workspace.save()
    res.json({ success: true, data: { publicSlug: workspace.publicSlug, publicFields: workspace.publicFields } })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update public settings.' })
  }
})

router.post('/:id/accept', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    const recruiter = await getUserModel().findById(req.userId)
    const workspace = await Workspace.findById(req.params.id)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!recruiter || recruiter.email !== workspace.recruiterEmail) return res.status(403).json({ success: false, message: 'This invite is not addressed to your account.' })
    if (workspace.status !== 'pending_invite') return res.status(400).json({ success: false, message: 'This workspace is no longer pending.' })
    workspace.recruiterId = recruiter._id
    workspace.status = 'active'
    await workspace.save()
    res.json({ success: true, data: workspace })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to accept workspace invite.' })
  }
})

export default router