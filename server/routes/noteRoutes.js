import { Router } from 'express'
import mongoose from 'mongoose'
import Note from '../models/Note.js'
import Workspace from '../models/Workspace.js'
import { generateChatReply } from '../services/geminiService.js'

const router = Router({ mergeParams: true })
const actions = {
  explain: 'Explain these notes clearly, preserving important technical details and using concise markdown.',
  improve: 'Improve these notes for clarity, structure, grammar, and usefulness. Return polished markdown.',
  'generate-readme': 'Turn these notes into a professional project README in markdown with sections for overview, setup, usage, and key decisions.',
  'explain-code': 'Explain the code in these notes step by step, including its purpose, flow, and important edge cases. Return markdown.',
}

async function getWorkspace(workspaceId) {
  if (!mongoose.isValidObjectId(workspaceId)) return null
  return Workspace.findById(workspaceId)
}

function isParticipant(workspace, userId) {
  return workspace && (String(workspace.candidateId) === String(userId) || String(workspace.recruiterId) === String(userId))
}

async function getNote(req) {
  if (!mongoose.isValidObjectId(req.params.workspaceId) || !mongoose.isValidObjectId(req.params.noteId)) return null
  return Note.findOne({ _id: req.params.noteId, workspaceId: req.params.workspaceId })
}

router.get('/', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const notes = await Note.find({ workspaceId: workspace._id }).sort({ updatedAt: -1 })
    res.json({ success: true, data: notes })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch notes.' })
  }
})

router.post('/', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const note = await Note.create({ workspaceId: workspace._id, authorId: req.userId, title: req.body.title, contentMarkdown: req.body.contentMarkdown || '' })
    res.status(201).json({ success: true, data: note })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create note.' })
  }
})

router.patch('/:noteId', async (req, res) => {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const note = await getNote(req)
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' })
    if (req.body.title !== undefined) note.title = req.body.title
    if (req.body.contentMarkdown !== undefined) note.contentMarkdown = req.body.contentMarkdown
    await note.save()
    res.json({ success: true, data: note })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update note.' })
  }
})

async function runAction(req, res, action) {
  try {
    const workspace = await getWorkspace(req.params.workspaceId)
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' })
    if (!isParticipant(workspace, req.userId)) return res.status(403).json({ success: false, message: 'You do not have access to this workspace.' })
    const note = await getNote(req)
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' })
    const content = await generateChatReply([{ role: 'user', content: `${actions[action]}\n\nTitle: ${note.title}\n\nNotes:\n${note.contentMarkdown}` }], { workspaceId: workspace._id.toString(), action })
    res.json({ success: true, data: { content } })
  } catch (error) {
    res.status(error.status || 503).json({ success: false, message: error.message || 'AI note action failed.' })
  }
}

router.post('/:noteId/explain', (req, res) => runAction(req, res, 'explain'))
router.post('/:noteId/improve', (req, res) => runAction(req, res, 'improve'))
router.post('/:noteId/generate-readme', (req, res) => runAction(req, res, 'generate-readme'))
router.post('/:noteId/explain-code', (req, res) => runAction(req, res, 'explain-code'))

export default router