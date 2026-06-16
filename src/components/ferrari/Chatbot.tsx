import { useRef, useState, useEffect } from 'react'
import { FerrariShield } from './FerrariShield'

/* ============================================================ */
/*   Chatbot.tsx — Mistral AI-powered assistant ingénieur.     */
/* ============================================================ */

interface Msg {
  from: 'eng' | 'user'
  text: string
}

interface ChatApiError {
  error: string
}

interface ChatApiSuccess {
  reply: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const FALLBACK = "Je suis l'assistant ingénieur de piste. Demande-moi la garde au sol, l'appui aéro, le rake ou le fonctionnement des LiDAR."

// Quick suggestion chips
const SUGGESTIONS = [
  "Setup optimal pour Spa?",
  "Comment régler les LiDAR?",
  "Garde au sol recommandée",
  "Appui aéro rear",
  "Balance du carrosserie",
  "TQW setup",
]

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: 'eng',
      text: 'Box, box. Ici le mur des stands — pose ta question sur le setup ou les LiDAR.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Speech recognition setup
  const speechRecognitionRef = useRef<any>(null)

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      speechRecognitionRef.current = new SpeechRecognition()
      speechRecognitionRef.current.lang = 'fr-FR'
      speechRecognitionRef.current.continuous = false
      speechRecognitionRef.current.interimResults = false

      speechRecognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setVoiceListening(false)
      }

      speechRecognitionRef.current.onerror = () => {
        setVoiceListening(false)
      }

      speechRecognitionRef.current.onend = () => {
        if (voiceListening) {
          setVoiceListening(false)
        }
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
    }
  }, [voiceListening])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const startVoiceInput = () => {
    if (!speechRecognitionRef.current) return
    setVoiceListening(true)
    speechRecognitionRef.current.start()
  }

  const send = async (message?: string) => {
    const q = (message || input).trim()
    if (!q) return

    setMessages((m) => [...m, { from: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: q,
          history: messages.slice(-6).map((m) => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      })

      if (!response.ok) {
        const err = (await response.json()) as ChatApiError
        throw new Error(err.error || 'API error')
      }

      const data = (await response.json()) as ChatApiSuccess
      const answer = data.reply || FALLBACK

      setMessages((m) => [...m, { from: 'eng', text: answer }])
    } catch (error) {
      console.error('Chat API error:', error)
      setMessages((m) => [...m, { from: 'eng', text: FALLBACK }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      send()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        from: 'eng',
        text: 'Box, box. Ici le mur des stands — pose ta question sur le setup ou les LiDAR.',
      },
    ])
    setInput('')
  }

  const handleSuggestionClick = (suggestion: string) => {
    send(suggestion)
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#dc0000] shadow-[0_0_24px_-4px_rgba(220,0,0,0.7)] transition hover:scale-105"
        aria-label="Assistant ingénieur Mistral AI"
      >
        <FerrariShield size={26} />
      </button>

      {open && (
        <div className="panel fixed bottom-24 right-6 z-50 flex h-[26rem] w-[22rem] flex-col overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] shadow-2xl">
          {/* Improved Header with AI Badge */}
          <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <FerrariShield size={28} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#dc0000] text-[8px] text-white font-bold">AI</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Mistral AI Assistant</span>
                <span className="label-mono text-xs text-[#888]">Ingénieur • FR</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="label-mono text-xs text-[#888] hover:text-white px-2 py-1 hover:bg-[#1f1f1f] rounded transition"
                title="Effacer le chat"
              >
                Effacer
              </button>
              <button
                onClick={() => setOpen(false)}
                className="label-mono hover:text-white text-[#888] hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 text-[13px] leading-relaxed ${
                    m.from === 'user'
                      ? 'bg-[#dc0000] text-white'
                      : 'border border-[#1f1f1f] bg-[#0d0d0d] text-[#cfcfcf]'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2 text-[13px]">
                  <span className="animate-pulse">L&apos;assistant réfléchit…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5 border-t border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={loading}
                className="label-mono text-xs rounded-full border border-[#333] bg-[#0d0d0d] px-3 py-1 text-[#888] transition hover:border-[#dc0000] hover:text-white disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex gap-2 border-t border-[#1f1f1f] p-3">
            <button
              onClick={startVoiceInput}
              disabled={loading || !open}
              className={`flex h-10 w-10 items-center justify-center rounded-md border border-[#333] transition ${
                voiceListening
                  ? 'bg-red-500/20 border-red-500 animate-pulse'
                  : 'bg-[#0a0a0a] hover:bg-[#1f1f1f]'
              }`}
              title={voiceListening ? 'Écoute en cours...' : 'Voice input'}
            >
              {voiceListening ? (
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
              )}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question setup…"
              disabled={loading}
              className="flex-1 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none placeholder:text-[#555] focus:ring-1 focus:ring-[#dc0000] disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="bg-[#dc0000] px-3 py-2 label-mono text-white hover:bg-[#ff1e00] disabled:opacity-50"
            >
              {loading ? '...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
