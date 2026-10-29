import mongoose from 'mongoose'

const ratingSchema = new mongoose.Schema({
  technicalSkills: { type: Number, min: 1, max: 5, required: true },
  communication: { type: Number, min: 1, max: 5, required: true },
  problemSolving: { type: Number, min: 1, max: 5, required: true },
  confidence: { type: Number, min: 1, max: 5, required: true },
  overall: { type: Number, min: 1, max: 5, required: true },
}, { _id: false })

const feedbackSchema = new mongoose.Schema({
  roundId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewRound', required: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratings: { type: ratingSchema, required: true },
  comments: { type: String, trim: true, default: '' },
  visibleToCandidate: { type: Boolean, default: true },
}, { timestamps: true })

feedbackSchema.index({ roundId: 1 }, { unique: true })

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema)

export default Feedback