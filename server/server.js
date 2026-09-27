import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import aiRoutes from './routes/aiRoutes.js'
import interviewRoutes from './routes/interviewRoutes.js'
import savedJobRoutes from './routes/savedJobRoutes.js'
import workspaceRoutes from './routes/workspaceRoutes.js'
import roundRoutes from './routes/roundRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import noteRoutes from './routes/noteRoutes.js'
import recruiterAnalyticsRoutes from './routes/recruiterAnalyticsRoutes.js'
import publicWorkspaceRoutes from './routes/publicWorkspaceRoutes.js'
import jobPostingRoutes from './routes/jobPostingRoutes.js'
import { sendPasswordResetCode } from './services/emailService.js'

const app = express()
const port = process.env.PORT || 5002
const mongoUri = process.env.MONGO_URI
const jwtSecret = process.env.JWT_SECRET
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const rateLimitMap = new Map()

app.use(cors({ origin: clientUrl }))
app.use(express.json({ limit: '1mb' }))

const emailRegex = /^\S+@\S+\.\S+$/

const normalizeEmail = (value = '') => String(value).trim().toLowerCase()

const checkRateLimit = (key, limit = 5, windowMs = 60 * 1000) => {
  const now = Date.now()
  const timestamps = rateLimitMap.get(key) || []
  const validTimestamps = timestamps.filter((timestamp) => now - timestamp < windowMs)
  if (validTimestamps.length >= limit) return false
  validTimestamps.push(now)
  rateLimitMap.set(key, validTimestamps)
  return true
}

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  profileImage: { type: String, default: '' },
  role: { type: String, enum: ['candidate', 'recruiter'], default: 'candidate' },
  resetOtpHash: { type: String, default: '' },
  resetOtpExpiresAt: { type: Date, default: null },
  resetOtpAttempts: { type: Number, default: 0 },
  resetOtpLastRequestedAt: { type: Date, default: null },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function ensureWorkspaceIndexes() {
  const collection = mongoose.connection.collection('workspaces')
  let indexes = []
  try {
    indexes = await collection.listIndexes().toArray()
  } catch (error) {
    if (error.code !== 26) throw error
  }
  const publicSlugIndex = indexes.find((index) => index.name === 'publicSlug_1')
  if (publicSlugIndex) await collection.dropIndex('publicSlug_1')
  await collection.updateMany({ publicSlug: null }, { $unset: { publicSlug: 1 } })
  await collection.createIndex({ publicSlug: 1 }, { unique: true, sparse: true, name: 'publicSlug_1' })
}

const publicUser = (user) => ({ id: user._id.toString(), name: user.name || user.email.split('@')[0], email: user.email, profileImage: user.profileImage || '', role: user.role || 'candidate' })
const createToken = (user) => jwt.sign({ userId: user._id.toString(), role: user.role || 'candidate' }, jwtSecret, { expiresIn: '30d' })
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' })
  try {
    const payload = jwt.verify(token, jwtSecret)
    req.userId = payload.userId
    req.userRole = payload.role
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' })
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { name = '', email, password, role = 'candidate' } = req.body
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
  if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' })
  if (!['candidate', 'recruiter'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid account role.' })

  const existingUser = await User.findOne({ email: normalizedEmail })
  if (existingUser) return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' })

  const user = await User.create({
    name: String(name || '').trim().slice(0, 80),
    email: normalizedEmail,
    role,
    password: await bcrypt.hash(password, 12),
  })

  res.status(201).json({ success: true, token: createToken(user), user: publicUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = normalizeEmail(email)
  const loginKey = `login:${normalizedEmail || 'unknown'}`

  if (!checkRateLimit(loginKey, 5, 60 * 1000)) {
    return res.status(429).json({ success: false, message: 'Too many login attempts. Please wait a moment and try again.' })
  }

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
  if (!password || String(password).length < 8) return res.status(401).json({ success: false, message: 'Incorrect email or password.' })

  const user = await User.findOne({ email: normalizedEmail }).select('+password')
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: 'Incorrect email or password.' })

  const token = createToken(user)
  res.json({ success: true, token, user: publicUser(user) })
})

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const normalizedEmail = normalizeEmail(email)
    const resetKey = `reset:${normalizedEmail || 'unknown'}`

    if (!checkRateLimit(resetKey, 3, 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Too many reset requests. Please wait a moment and try again.' })
    }

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' })

    const user = await User.findOne({ email: normalizedEmail })
    if (user) {
      const otp = String(Math.floor(100000 + Math.random() * 900000))
      user.resetOtpHash = await bcrypt.hash(otp, 10)
      user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
      user.resetOtpAttempts = 0
      user.resetOtpLastRequestedAt = new Date()
      await user.save()

      const delivery = await sendPasswordResetCode({ recipient: user.email, name: user.name || 'User', otp })
      if (!delivery.sent) return res.status(503).json({ success: false, message: delivery.error || 'Password reset email could not be sent.' })
    }

    return res.json({
      success: true,
      message: 'If an account exists for this email, a reset code has been sent.',
    })
  } catch (error) {
    console.error('Password reset request failed:', error.message)
    return res.status(503).json({ success: false, message: 'Password reset is temporarily unavailable. Please try again after the server reconnects to the database.' })
  }
})

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
  if (!otp || String(otp).trim().length !== 6) return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP.' })

  const user = await User.findOne({ email: normalizedEmail })
  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
    return res.status(400).json({ success: false, message: 'No active reset request found. Please request a new code.' })
  }

  if (new Date(user.resetOtpExpiresAt).getTime() < Date.now()) {
    user.resetOtpHash = ''
    user.resetOtpExpiresAt = null
    user.resetOtpAttempts = 0
    await user.save()
    return res.status(400).json({ success: false, message: 'Your reset code has expired. Please request a new one.' })
  }

  if (user.resetOtpAttempts >= 5) {
    user.resetOtpHash = ''
    user.resetOtpExpiresAt = null
    user.resetOtpAttempts = 0
    await user.save()
    return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please request a new reset code.' })
  }

  const isValidOtp = await bcrypt.compare(String(otp).trim(), user.resetOtpHash)
  if (!isValidOtp) {
    user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1
    await user.save()
    return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' })
  }

  user.resetOtpAttempts = 0
  await user.save()
  res.json({ success: true, message: 'OTP verified successfully.' })
})

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, password } = req.body
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
  if (!otp || String(otp).trim().length !== 6) return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP.' })
  if (!password || String(password).length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' })

  const user = await User.findOne({ email: normalizedEmail }).select('+password')
  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
    return res.status(400).json({ success: false, message: 'No active reset request found. Please request a new code.' })
  }

  if (new Date(user.resetOtpExpiresAt).getTime() < Date.now()) {
    user.resetOtpHash = ''
    user.resetOtpExpiresAt = null
    user.resetOtpAttempts = 0
    await user.save()
    return res.status(400).json({ success: false, message: 'Your reset code has expired. Please request a new one.' })
  }

  const isValidOtp = await bcrypt.compare(String(otp).trim(), user.resetOtpHash)
  if (!isValidOtp) {
    user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1
    await user.save()
    return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' })
  }

  user.password = await bcrypt.hash(password, 12)
  user.resetOtpHash = ''
  user.resetOtpExpiresAt = null
  user.resetOtpAttempts = 0
  await user.save()

  res.json({ success: true, message: 'Password updated. You can now log in.' })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(401).json({ success: false, message: 'Account not found.' })
  res.json({ success: true, user: publicUser(user) })
})

app.use('/api/public', publicWorkspaceRoutes)
app.use('/api/job-postings', requireAuth, jobPostingRoutes)
app.use('/api/ai', requireAuth, aiRoutes)
app.use('/api/interviews', requireAuth, interviewRoutes)
app.use('/api/saved-jobs', requireAuth, savedJobRoutes)
app.use('/api/workspaces', requireAuth, workspaceRoutes)
app.use('/api/workspaces/:workspaceId/rounds', requireAuth, roundRoutes)
app.use('/api/workspaces/:workspaceId/documents', requireAuth, documentRoutes)
app.use('/api/workspaces/:workspaceId/notes', requireAuth, noteRoutes)
app.use('/api/recruiter/analytics', requireAuth, recruiterAnalyticsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'AI Interviewer API is ready',
    data: { version: '1.0.0', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
  })
})

async function startServer() {
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Add it to server/.env.')
  }
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to a secure value of at least 32 characters.')
  }

  await mongoose.connect(mongoUri)
  await ensureWorkspaceIndexes()
  console.log('MongoDB connected')

  app.listen(port, () => {
    console.log(`AI Interviewer API listening on port ${port}`)
  })
}

startServer().catch((error) => {
  console.error('MongoDB connection failed:', error.message)
  process.exit(1)
})


