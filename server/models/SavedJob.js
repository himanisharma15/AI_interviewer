import mongoose from 'mongoose'

const savedJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', default: null, index: true },
  title: { type: String, trim: true, default: '' },
  company: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  employmentType: { type: String, trim: true, default: '' },
  experience: { type: String, trim: true, default: '' },
  roleTitle: { type: String, trim: true, default: '' },
  jobDescription: { type: String, trim: true, default: '' },
  jdText: { type: String, required: true },
  jdSourceType: { type: String, enum: ['paste', 'upload', 'browse', 'manual', 'url'], required: true },
  matchScore: { type: Number, min: 0, max: 100, default: 0 },
  requiredSkills: { type: [String], default: [] },
  seniority: { type: String, trim: true, default: '' },
  sourceUrl: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Saved', 'Preparing', 'Applied', 'Interview Scheduled', 'Interviewed', 'Rejected', 'Offer'], default: 'Saved' },
  aiPreparation: { type: mongoose.Schema.Types.Mixed, default: null },
  savedAt: { type: Date, default: Date.now },
})

const SavedJob = mongoose.models.SavedJob || mongoose.model('SavedJob', savedJobSchema)

export default SavedJob
