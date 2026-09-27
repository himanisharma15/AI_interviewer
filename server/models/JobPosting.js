import mongoose from 'mongoose'

const jobPostingSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, required: true },
  company: { type: String, trim: true, required: true },
  jobDescription: { type: String, trim: true, required: true },
  skills: { type: [String], default: [] },
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
}, { timestamps: true })

const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema)

export default JobPosting