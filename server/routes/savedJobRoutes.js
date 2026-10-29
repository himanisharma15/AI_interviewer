import { Router } from 'express'
import SavedJob from '../models/SavedJob.js'
import { generateJson } from '../services/geminiService.js'

const router = Router()
const sourceTypes = ['paste', 'upload', 'browse', 'manual', 'url']
const statuses = ['Saved', 'Preparing', 'Applied', 'Interview Scheduled', 'Interviewed', 'Rejected', 'Offer']

const isCandidate = (req, res) => {
  if (req.userRole === 'recruiter') {
    res.status(403).json({ success: false, message: 'Only candidate accounts can manage saved jobs.' })
    return false
  }
  return true
}

const normalizeJob = (body = {}) => {
  const title = String(body.title || body.roleTitle || '').trim()
  const jobDescription = String(body.jobDescription || body.jdText || '').trim()
  return {
    jobId: body.jobId || null,
    title,
    roleTitle: title,
    company: String(body.company || '').trim(),
    location: String(body.location || '').trim(),
    employmentType: String(body.employmentType || '').trim(),
    experience: String(body.experience || body.seniority || '').trim(),
    jobDescription,
    jdText: jobDescription,
    jdSourceType: body.jdSourceType === 'pasted' ? 'paste' : body.jdSourceType === 'file' ? 'upload' : body.jdSourceType,
    matchScore: Number(body.matchScore) || 0,
    requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills.map(String) : [],
    seniority: String(body.seniority || '').trim(),
    sourceUrl: String(body.sourceUrl || '').trim(),
    notes: String(body.notes || '').trim(),
    status: body.status || 'Saved',
  }
}

const htmlToText = (html) => String(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

router.post('/import-url', async (req, res) => {
  try {
    if (!isCandidate(req, res)) return
    const sourceUrl = String(req.body.url || '').trim()
    if (!/^https?:\/\//i.test(sourceUrl)) return res.status(400).json({ success: false, message: 'Enter a valid job URL starting with http:// or https://.' })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    let response
    try {
      response = await fetch(sourceUrl, { headers: { 'User-Agent': 'IntervueAI job importer/1.0' }, signal: controller.signal })
    } finally { clearTimeout(timeout) }
    if (!response.ok) return res.status(422).json({ success: false, message: 'This job page could not be fetched. Please paste the job description instead.' })
    const rawText = htmlToText(await response.text()).slice(0, 60000)
    if (rawText.length < 80) return res.status(422).json({ success: false, message: 'No usable job description was found at this URL. Please paste the job description instead.' })
    const extracted = await generateJson(
      'Extract structured job information from this webpage text. Return {title, company, location, employmentType, experience, skills, jobDescription}. Use empty strings or arrays when information is unavailable. Do not invent details.',
      { sourceUrl, webpageText: rawText },
    )
    res.json({ success: true, data: { ...extracted, sourceUrl, jdSourceType: 'url', jobDescription: extracted.jobDescription || rawText } })
  } catch (error) {
    res.status(error.status || 422).json({ success: false, message: error.name === 'AbortError' ? 'The job URL took too long to respond. Please paste the job description instead.' : error.message || 'Unable to import this job URL. Please paste the job description instead.' })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!isCandidate(req, res)) return
    const data = normalizeJob(req.body)
    if (!data.title) return res.status(400).json({ success: false, message: 'Job title is required.' })
    if (!data.jdText) return res.status(400).json({ success: false, message: 'Job description is required.' })
    if (!sourceTypes.includes(data.jdSourceType)) return res.status(400).json({ success: false, message: `Invalid job description source. Use one of: ${sourceTypes.join(', ')}.` })
    if (!statuses.includes(data.status)) return res.status(400).json({ success: false, message: 'Invalid saved job status.' })

    const duplicateFilter = data.jobId
      ? { userId: req.userId, jobId: data.jobId }
      : { userId: req.userId, title: data.title, company: data.company, jdText: data.jdText }
    const existing = await SavedJob.findOne(duplicateFilter)
    if (existing) return res.status(409).json({ success: false, message: 'Job already saved.', data: existing })

    const savedJob = await SavedJob.create({ ...data, userId: req.userId })
    res.status(201).json({ success: true, data: savedJob })
  } catch (error) {
    const message = error.name === 'ValidationError' ? 'Please check the saved job details and try again.' : 'Unable to save this job. Please try again.'
    res.status(400).json({ success: false, message })
  }
})

router.get('/', async (req, res) => {
  try {
    if (!isCandidate(req, res)) return
    const filter = { userId: req.userId }
    if (req.query.role) filter.roleTitle = { $regex: String(req.query.role), $options: 'i' }
    if (req.query.search) {
      const search = { $regex: String(req.query.search), $options: 'i' }
      filter.$or = [{ title: search }, { roleTitle: search }, { company: search }, { location: search }, { requiredSkills: search }]
    }
    if (req.query.status) filter.status = String(req.query.status)
    if (req.query.source) filter.jdSourceType = String(req.query.source)
    if (req.query.location) filter.location = { $regex: String(req.query.location), $options: 'i' }
    const sort = req.query.sort === 'oldest' ? { savedAt: 1 } : req.query.sort === 'title' ? { title: 1 } : req.query.sort === 'matchScore' ? { matchScore: -1, savedAt: -1 } : { savedAt: -1 }
    const jobs = await SavedJob.find(filter).sort(sort)
    res.json({ success: true, data: jobs })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load saved jobs.' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    if (!isCandidate(req, res)) return
    const updates = {}
    if (req.body.status !== undefined) {
      if (!statuses.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid saved job status.' })
      updates.status = req.body.status
    }
    if (req.body.notes !== undefined) updates.notes = String(req.body.notes).trim()
    const savedJob = await SavedJob.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $set: updates }, { new: true, runValidators: true })
    if (!savedJob) return res.status(404).json({ success: false, message: 'Saved job not found.' })
    res.json({ success: true, data: savedJob })
  } catch {
    res.status(400).json({ success: false, message: 'Unable to update this saved job.' })
  }
})

router.post('/:id/prepare', async (req, res) => {
  try {
    if (!isCandidate(req, res)) return
    const savedJob = await SavedJob.findOne({ _id: req.params.id, userId: req.userId })
    if (!savedJob) return res.status(404).json({ success: false, message: 'Saved job not found.' })
    const preparation = await generateJson(
      'You are an interview preparation coach. Analyze the supplied job description. Return JSON with importantSkills (string array), technicalTopics (string array), likelyInterviewQuestions (string array), hrQuestions (string array), codingTopics (string array), resumeKeywords (string array), weakAreas (string array), and preparationPlan (string array). Use only information supported by the job description.',
      { jobTitle: savedJob.title || savedJob.roleTitle, company: savedJob.company, jobDescription: savedJob.jobDescription || savedJob.jdText },
    )
    savedJob.aiPreparation = preparation
    await savedJob.save()
    res.json({ success: true, data: savedJob })
  } catch (error) {
    res.status(error.status || 503).json({ success: false, message: error.message || 'Unable to prepare this job with AI.' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!isCandidate(req, res)) return
    const deleted = await SavedJob.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) return res.status(404).json({ success: false, message: 'Saved job not found.' })
    res.json({ success: true, data: deleted })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to remove saved job.' })
  }
})

export default router
