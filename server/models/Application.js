import mongoose from 'mongoose'

const applicationSchema = new mongoose.Schema({
  jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['applied', 'reviewing', 'selected', 'rejected'], default: 'applied' },
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true })

applicationSchema.index({ jobPostingId: 1, candidateId: 1 }, { unique: true })

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema)

export default Application