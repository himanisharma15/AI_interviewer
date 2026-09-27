import { Router } from 'express'
import mongoose from 'mongoose'
import JobPosting from '../models/JobPosting.js'
import Application from '../models/Application.js'
import Workspace from '../models/Workspace.js'
import { createWorkspaceRecord } from './workspaceRoutes.js'

const router = Router()
const getUserModel = () => mongoose.models.User
const isRecruiter = async (userId) => (await getUserModel().findById(userId).select('role'))?.role === 'recruiter'

router.post('/', async (req, res) => {
  try {
    if (!(await isRecruiter(req.userId))) return res.status(403).json({ success: false, message: 'Recruiter access required.' })
    const posting = await JobPosting.create({ ...req.body, recruiterId: req.userId })
    res.status(201).json({ success: true, data: posting })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create job posting.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const recruiter = await isRecruiter(req.userId)
    const filter = recruiter ? { recruiterId: req.userId } : { status: 'published' }
    const postings = await JobPosting.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, data: postings })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch job postings.' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    if (!(await isRecruiter(req.userId))) return res.status(403).json({ success: false, message: 'Recruiter access required.' })
    const posting = await JobPosting.findOne({ _id: req.params.id, recruiterId: req.userId })
    if (!posting) return res.status(404).json({ success: false, message: 'Job posting not found.' })
    for (const field of ['title', 'company', 'jobDescription', 'skills', 'status']) if (req.body[field] !== undefined) posting[field] = req.body[field]
    await posting.save()
    res.json({ success: true, data: posting })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update job posting.' })
  }
})

router.patch('/:id/publish', async (req, res) => {
  try {
    if (!(await isRecruiter(req.userId))) return res.status(403).json({ success: false, message: 'Recruiter access required.' })
    const posting = await JobPosting.findOneAndUpdate({ _id: req.params.id, recruiterId: req.userId }, { status: 'published' }, { new: true, runValidators: true })
    if (!posting) return res.status(404).json({ success: false, message: 'Job posting not found.' })
    res.json({ success: true, data: posting })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to publish job posting.' })
  }
})

router.post('/:id/apply', async (req, res) => {
  try {
    if (await isRecruiter(req.userId)) return res.status(403).json({ success: false, message: 'Recruiters cannot apply to job postings.' })
    const posting = await JobPosting.findOne({ _id: req.params.id, status: 'published' })
    if (!posting) return res.status(404).json({ success: false, message: 'Published job posting not found.' })
    const application = await Application.create({ jobPostingId: posting._id, candidateId: req.userId })
    res.status(201).json({ success: true, data: application })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'You have already applied to this job.' })
    res.status(400).json({ success: false, message: error.message || 'Failed to apply to job.' })
  }
})

router.get('/:id/applications', async (req, res) => {
  try {
    const posting = await JobPosting.findOne({ _id: req.params.id, recruiterId: req.userId })
    if (!posting) return res.status(404).json({ success: false, message: 'Job posting not found.' })
    const applications = await Application.find({ jobPostingId: posting._id }).populate('candidateId', 'name email').sort({ appliedAt: -1 })
    res.json({ success: true, data: applications })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch applications.' })
  }
})

async function selectApplication(req, res) {
  try {
    const posting = await JobPosting.findOne({ _id: req.params.id, recruiterId: req.userId })
    if (!posting) return res.status(404).json({ success: false, message: 'Job posting not found.' })
    if (!mongoose.isValidObjectId(req.body.applicationId)) return res.status(400).json({ success: false, message: 'Application is required.' })
    const application = await Application.findOne({ _id: req.body.applicationId, jobPostingId: posting._id })
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' })
    application.status = 'selected'
    await application.save()
    const recruiter = await getUserModel().findById(req.userId).select('email')
    let workspace = await Workspace.findOne({ candidateId: application.candidateId, recruiterId: req.userId, company: posting.company, jobRole: posting.title })
    if (!workspace) workspace = await createWorkspaceRecord({ candidateId: application.candidateId, recruiterId: req.userId, company: posting.company, jobRole: posting.title, jobDescription: posting.jobDescription, recruiterEmail: recruiter.email, status: 'active' })
    res.json({ success: true, data: { application, workspace } })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to select candidate.' })
  }
}

router.post('/:id/applications/:applicationId/select', async (req, res) => {
  req.body.applicationId = req.params.applicationId
  return selectApplication(req, res)
})

router.post('/:id/select', async (req, res) => selectApplication(req, res))

export default router