const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const MODEL = 'openai/gpt-oss-20b'
const MAX_INPUT_LENGTH = 60000

export class AiServiceError extends Error {
  constructor(message, status = 503) {
    super(message)
    this.status = status
  }
}

function extractJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new AiServiceError(
      'AI service returned an invalid response. Please try again.'
    )
  }
}

export async function generateJson(instruction, input) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new AiServiceError(
      'Groq API is not configured. Please check GROQ_API_KEY.',
      503
    )
  }

  const prompt = `${instruction}

Return only valid JSON.

INPUT:
${JSON.stringify(input).slice(0, MAX_INPUT_LENGTH)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model: MODEL,

        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],

        temperature: 0.3,
      }),

      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Groq API Error:', payload)

      if (response.status === 401 || response.status === 403) {
        throw new AiServiceError(
          'Groq API authentication failed. Please check your API key.',
          503
        )
      }

      if (response.status === 429) {
        throw new AiServiceError(
          'Groq API is busy. Please try again shortly.',
          429
        )
      }

      throw new AiServiceError(
        'Groq AI service is temporarily unavailable.',
        503
      )
    }

    const text =
      payload?.choices?.[0]?.message?.content

    if (!text) {
      throw new AiServiceError(
        'Groq returned an empty response. Please try again.'
      )
    }

    return extractJson(text)

  } catch (error) {

    if (error instanceof AiServiceError) {
      throw error
    }

    if (error.name === 'AbortError') {
      throw new AiServiceError(
        'Groq AI request took too long. Please try again.'
      )
    }

    console.error('Groq Error:', error)

    throw new AiServiceError(
      'Groq AI service is temporarily unavailable.'
    )

  } finally {
    clearTimeout(timeout)
  }
}


export async function generateChatReply(messages, context = {}) {

  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new AiServiceError(
      'Groq API is not configured. Please check GROQ_API_KEY.',
      503
    )
  }

  const safeContext = JSON.stringify(context).slice(0, 2000)

  const systemContext = `
You are the IntervueAI assistant.
Help the candidate with interview preparation.

Context:
${safeContext}
`

  const contents = [
    {
      role: 'system',
      content: systemContext,
    },

    ...messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || ''),
    })),
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {

    const response = await fetch(GROQ_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model: MODEL,
        messages: contents,
        temperature: 0.5,
      }),

      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {

      console.error('Groq API Error:', payload)

      if (response.status === 401 || response.status === 403) {
        throw new AiServiceError(
          'Groq API authentication failed.',
          503
        )
      }

      if (response.status === 429) {
        throw new AiServiceError(
          'Groq API is busy. Please try again shortly.',
          429
        )
      }

      throw new AiServiceError(
        'Groq AI service is temporarily unavailable.',
        503
      )
    }

    const text =
      payload?.choices?.[0]?.message?.content

    if (!text) {
      throw new AiServiceError(
        'Groq returned an empty response.'
      )
    }

    return text.trim()

  } catch (error) {

    if (error instanceof AiServiceError) {
      throw error
    }

    if (error.name === 'AbortError') {
      throw new AiServiceError(
        'Groq AI request took too long.'
      )
    }

    console.error('Groq Error:', error)

    throw new AiServiceError(
      'Groq AI service is temporarily unavailable.'
    )

  } finally {
    clearTimeout(timeout)
  }
}