import mongoose from 'mongoose'

const workspaceSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  company: { type: String, trim: true, required: true },
  jobRole: { type: String, trim: true, required: true },
  jobDescription: { type: String, trim: true, default: '' },
  resumeAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  jdAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  interviewType: { type: String, trim: true, default: 'Technical' },
  status: { type: String, enum: ['pending_invite', 'active', 'closed'], default: 'active' },
  recruiterEmail: { type: String, trim: true, lowercase: true, required: true },
  invitationStatus: { type: String, enum: ['pending', 'sent', 'failed', 'not_configured'], default: 'pending' },
  invitationError: { type: String, default: '' },
  invitationSentAt: { type: Date, default: null },
    publicSlug: { type: String, trim: true, unique: true, sparse: true },
  publicFields: {
    resume: { type: Boolean, default: false },
    achievements: { type: Boolean, default: false },
    skills: { type: Boolean, default: false },
    interviewSummary: { type: Boolean, default: false },
    status: { type: Boolean, default: false },
  },
}, { timestamps: true })

const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema)

export default Workspace