import { Router } from 'express'
import mongoose from 'mongoose'
import Document from '../models/Document.js'
import Workspace from '../models/Workspace.js'

const router = Router({ mergeParams: true })
const documentTypes = ['resume', 'jd', 'portfolio', 'certificate', 'code', 'other']

async function getWorkspace(workspaceId) {
  if (!mongoose.isValidObjectId(workspaceId)) return null
  return Workspace.findById(workspaceId)
}

function isParticipant(workspace, userId) {
  return workspace && (String(workspace.candidateId) === String(userId) || String(workspace.recruiterId) === String(userId))
}

router.get('/', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const documents = await Document.find({ workspaceId: workspace._id }).sort({ createdAt: -1 })
    res.json({ success: true, data: documents })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch documents.' })
  }
})

router.post('/', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const { type, filename, fileUrl = '', fileText = '' } = req.body
    if (!documentTypes.includes(type) || !filename?.trim() || (!fileUrl && !fileText)) return res.status(400).json({ success: false, message: 'Document type, filename, and file content are required.' })
    const document = await Document.create({ workspaceId: workspace._id, uploadedBy: req.userId, type, filename, fileUrl, fileText })
    res.status(201).json({ success: true, data: document })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to upload document.' })
  }
})

export default router