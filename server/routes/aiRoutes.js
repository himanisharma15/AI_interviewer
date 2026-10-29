import { Router } from 'express'
import { analyzeJobDescription, analyzeResume, chatWithAssistant, evaluateAnswer, followUp, generateQuestion, generateReport, parseSearchQuery, recommendPractice, scoreJobMatch, summarizeInterview } from '../controllers/aiController.js'

const router = Router()
router.post('/analyze-resume', analyzeResume)
router.post('/analyze-jd', analyzeJobDescription)
router.post('/generate-question', generateQuestion)
router.post('/evaluate-answer', evaluateAnswer)
router.post('/follow-up', followUp)
router.post('/generate-report', generateReport)
router.post('/summarize-interview', summarizeInterview)
router.post('/recommend-practice', recommendPractice)
router.post('/score-job-match', scoreJobMatch)
router.post('/parse-search', parseSearchQuery)
router.post('/chat', chatWithAssistant)

export default router
