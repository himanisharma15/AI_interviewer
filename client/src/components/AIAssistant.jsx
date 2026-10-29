import { useState } from 'react'

export default function AIAssistant({ context = {} }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help with interview prep, scoring, and role-specific practice.' },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    const content = input.trim()
    if (!content || isTyping) return

    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setIsTyping(true)

    try {
      const token = localStorage.getItem('token') || ''
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            ...context,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to reach the AI assistant right now.')
      }

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: payload.data.reply },
      ])
    } catch (error) {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: error.message || 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="ai-assistant">
      {isOpen ? (
        <div className="ai-assistant__panel">
          <div className="ai-assistant__header">
            <strong>AI Assistant</strong>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant">×</button>
          </div>

          <div className="ai-assistant__messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`ai-message ai-message--${message.role}`}>
                {message.content}
              </div>
            ))}
            {isTyping && <div className="ai-message ai-message--assistant ai-message--typing">Typing…</div>}
          </div>

          <form onSubmit={onSubmit} className="ai-assistant__composer">
            <textarea
              rows="2"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your interview prep..."
            />
            <button type="submit" className="button button-primary button-small" disabled={!input.trim() || isTyping}>
              Send
            </button>
          </form>
        </div>
      ) : (
        <button type="button" className="ai-assistant__bubble" onClick={() => setIsOpen(true)} aria-label="Open AI assistant">
          AI
        </button>
      )}
    </div>
  )
}
