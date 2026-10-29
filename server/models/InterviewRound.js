import mongoose from 'mongoose'

const interviewRoundSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  type: { type: String, enum: ['HR', 'Technical', 'Coding', 'Managerial', 'Final'], required: true },
  interviewerName: { type: String, trim: true, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, min: 1, required: true },
  instructions: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'], default: 'Scheduled' },
  focusTopics: { type: [String], default: [] },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
  questionType: { type: String, default: 'Technical' },
  questions: [{
    question: { type: String, required: true },
    category: { type: String, default: '' },
    rationale: { type: String, default: '' },
  }],
  questionsGeneratedAt: { type: Date, default: null },
  invitationStatus: { type: String, enum: ['pending', 'sent', 'failed', 'not_configured'], default: 'pending' },
  invitationError: { type: String, default: '' },
  invitationSentAt: { type: Date, default: null },
}, { timestamps: true })

const InterviewRound = mongoose.models.InterviewRound || mongoose.model('InterviewRound', interviewRoundSchema)

export default InterviewRound