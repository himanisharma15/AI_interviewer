import { Router } from 'express'
import mongoose from 'mongoose'
import Workspace from '../models/Workspace.js'
import Document from '../models/Document.js'
import Interview from '../models/Interview.js'

const router = Router()
const User = () => mongoose.models.User

router.get('/workspace/:slug', async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ publicSlug: req.params.slug })
    if (!workspace) return res.status(404).json({ success: false, message: 'Public workspace not found.' })
    const candidate = await User().findById(workspace.candidateId).select('name email')
    const fields = workspace.publicFields || {}
    const data = { candidateName: candidate?.name || candidate?.email?.split('@')[0] || 'Candidate', company: workspace.company, jobRole: workspace.jobRole }

    if (fields.resume) {
      const resume = await Document.findOne({ workspaceId: workspace._id, type: 'resume' }).sort({ createdAt: -1 }).select('filename fileText')
      data.resume = resume ? { filename: resume.filename, fileText: resume.fileText || '' } : null
    }
    if (fields.skills) data.skills = [...new Set([...(workspace.resumeAnalysis?.skills || []), ...(workspace.resumeAnalysis?.technicalSkills || [])])]
    if (fields.achievements) data.achievements = workspace.resumeAnalysis?.achievements || workspace.resumeAnalysis?.strengths || []
    if (fields.interviewSummary) {
      const interview = await Interview.findOne({ userId: workspace.candidateId }).sort({ createdAt: -1 }).select('summary')
      data.interviewSummary = interview?.summary || ''
    }
    if (fields.status) data.status = workspace.status
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load public workspace.' })
  }
})

export default router