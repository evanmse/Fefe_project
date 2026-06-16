import { useEffect, useRef, useState, useCallback } from 'react'
import { FerrariShield } from './FerrariShield'

/* ============================================================
   Chatbot.tsx — assistant ingénieur IA powered by Mistral AI.
   ============================================================ */

interface Msg {
  from: 'eng' | 'user'
  text: string
}

const GREETING: Msg = {
  from: 'eng',
  text: 'Box, box. Ici le mur des stands — je suis ton assistant IA. Pose ta question sur le setup, la télémétrie ou les LiDAR.',
}

const SUGGESTIONS = [
  { label: 'Garde au sol', q: 'Quelle est la garde au sol idéale ?' },
  { label: 'Downforce', q: 'Comment maximiser le downforce ?' },
  { label: 'Rake optimal', q: 'Quel est le rake optimal ?' },
  { label: 'Statut CRITICAL', q: 'Que signifie le statut CRITICAL ?' },
  { label: 'LiDAR', q: 'Comment fonctionnent les capteurs LiDAR ?' },
]

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [supportsVoice, setSupportsVoice] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupportsVoice(false); return }
    setSupportsVoice(true)
    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setVoiceError('Micro indisponible'); setListening(false) }
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (!transcript) return
      setInput(transcript)
      send(transcript)
    }
    recognitionRef.current = recognition
    return () => { recognitionRef.current?.stop(); recognitionRef.current = null }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (query?: string) => {
    const q = query?.trim() ?? input.trim()
    if (!q || loading) return

    const userMsg: Msg = { from: 'user', text: q }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-8).map(m => ({
        role: m.from === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')

      setMessages(prev => [...prev, { from: 'eng', text: data.reply }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { from: 'eng', text: `⚠️ ${err instanceof Error ? err.message : 'Erreur de connexion'}` },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages])

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (listening) { recognitionRef.current.stop(); return }
    setVoiceError('')
    try { recognitionRef.current.start() } catch { setVoiceError('Micro indisponible') }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#dc0000] shadow-[0_0_24px_-4px_rgba(220,0,0,0.7)] transition hover:scale-105"
        aria-label="Assistant ingénieur"
      >
        <div className="assistant-avatar flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] text-white shadow-[0_0_18px_rgba(220,0,0,0.35)]">
          <FerrariShield size={20} />
        </div>
      </button>

      {/* Panel */}
      {open && (
        <div className="panel fixed bottom-24 right-6 z-50 flex h-[32rem] w-[26rem] flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="assistant-avatar flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] text-white shadow-[0_0_18px_rgba(220,0,0,0.35)]">
                <FerrariShield size={18} />
              </div>
              <div>
                <div className="badge-live text-[#dc0000]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />
                  Assistant IA
                </div>
                <div className="label-mono text-[11px] text-[#9a9a9a]">Mistral AI · expert F1</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="label-mono hover:text-white">Fermer</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 text-[13px] leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-[#dc0000] text-white'
                    : 'border border-[#1f1f1f] bg-[#0d0d0d] text-[#cfcfcf]'
                }`}>
                  {m.from === 'eng' && i > 0 && (
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#dc0000]">GABY IA</span>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2 text-[13px] text-[#9a9a9a]">
                  <span className="animate-pulse">●●●</span> Réflexion en cours...
                </div>
              </div>
            )}
          </div>

          {/* Suggestions (only when few messages) */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s.q)} className="rounded-full border border-[#2a2a2a] bg-[#121212] px-2.5 py-1 text-[11px] text-[#9a9a9a] transition hover:border-[#dc0000] hover:text-white">
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[#1f1f1f] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleVoice}
                className="inline-flex items-center gap-2 rounded-full border border-[#dc0000] bg-[#121212] px-3 py-1.5 text-sm text-white transition hover:bg-[#dc0000]/10"
              >
                <span className={`h-2 w-2 rounded-full ${listening ? 'bg-[#00ff41]' : 'bg-[#dc0000]'}`} />
                {listening ? 'Écoute…' : 'Parler'}
              </button>
              <span className="label-mono text-[11px] text-[#9a9a9a]">
                {supportsVoice ? 'Vocal prêt' : 'Vocal non supporté'}
              </span>
            </div>
            {voiceError && (
              <div className="mb-2 rounded-sm bg-[#dc0000]/10 px-3 py-1.5 text-sm text-[#ff9a9a]">{voiceError}</div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Pose ta question setup…"
                className="flex-1 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none placeholder:text-[#555] focus:ring-1 focus:ring-[#dc0000]"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="bg-[#dc0000] px-3 py-2 label-mono text-white transition hover:bg-[#ff1e00] disabled:opacity-40"
              >
                {loading ? '…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
