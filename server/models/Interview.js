import mongoose from 'mongoose'

const questionEntrySchema = new mongoose.Schema({
  question: { type: String, default: '' },
  answer: { type: String, default: '' },
  feedback: { type: String, default: '' },
}, { _id: false })

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  role: { type: String, trim: true },
  interviewType: { type: String, trim: true },
  difficulty: { type: String, trim: true },
  questions: [questionEntrySchema],
  overallScore: Number,
  technicalScore: Number,
  communicationScore: Number,
  problemSolvingScore: Number,
  jdRelevanceScore: Number,
  summary: String,
  strongAreas: [String],
  weakAreas: [String],
  recommendedTopics: [String],
  proctoring: {
    enabled: { type: Boolean, default: false },
    events: [{
      type: { type: String, enum: ['TAB_SWITCH', 'WINDOW_BLUR', 'FACE_NOT_DETECTED', 'MULTIPLE_FACES', 'CAMERA_DISABLED', 'CAMERA_DISCONNECTED'] },
      timestamp: { type: Date, default: Date.now },
      duration: { type: Number, default: 0 },
    }],
  },
  createdAt: { type: Date, default: Date.now },
})

const Interview = mongoose.models.Interview || mongoose.model('Interview', interviewSchema)

export default Interview
