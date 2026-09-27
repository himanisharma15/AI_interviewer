import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['resume', 'jd', 'portfolio', 'certificate', 'code', 'other'], required: true },
  fileUrl: { type: String, trim: true, default: '' },
  fileText: { type: String, default: '' },
  filename: { type: String, trim: true, required: true },
}, { timestamps: true })

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema)

export default Document