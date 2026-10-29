import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, required: true },
  contentMarkdown: { type: String, default: '' },
}, { timestamps: true })

const Note = mongoose.models.Note || mongoose.model('Note', noteSchema)

export default Note