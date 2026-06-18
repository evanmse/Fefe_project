import { useRef, useState, useCallback, useEffect } from 'react'
import { FerrariShield } from './FerrariShield'
import { VoiceAssistant, speakText } from './VoiceAssistant'

interface Msg { from: 'eng' | 'user'; text: string }

const FALLBACK = "Je suis l'assistant ingénieur de piste. Demande-moi la garde au sol, l'appui aéro, le rake ou le fonctionnement des LiDAR."
const WELCOME = 'Box, box. Ici le mur des stands — pose ta question setup ou LiDAR. Micro 🎤 disponible !'

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([{ from: 'eng' as const, text: WELCOME }])
  const [loading, setLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }) })
  }, [])

  useEffect(() => { scrollBottom() }, [messages, scrollBottom])

  const sendMessage = useCallback(async (q: string) => {
    if (!q.trim()) return
    setMessages((m) => [...m, { from: 'user', text: q.trim() }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q.trim(),
          history: messages.slice(-6).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'API error' })); throw new Error(e.error || `HTTP ${res.status}`) }
      interface ApiOk { reply: string }
      const data = await res.json() as ApiOk
      const answer = data.reply || FALLBACK
      setMessages((m) => [...m, { from: 'eng', text: answer }])
      if (voiceEnabled) speakText(answer)
    } catch (err) {
      console.error('Chat error:', err)
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setMessages((m) => [...m, { from: 'eng', text: `⚠️ ${msg}. ${FALLBACK}` }])
    } finally { setLoading(false) }
  }, [messages, voiceEnabled])

  const handleSend = useCallback(() => { if (input.trim() && !loading) sendMessage(input) }, [input, loading, sendMessage])
  const handleVoiceTranscript = useCallback((text: string) => { sendMessage(text) }, [sendMessage])

  return (
    <>
      <button onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#dc0000] shadow-[0_0_24px_-4px_rgba(220,0,0,0.7)] transition hover:scale-105"
        aria-label="Assistant IA"><FerrariShield size={26} /></button>

      {open && (
        <div className="panel fixed bottom-24 right-6 z-50 flex h-[30rem] w-[24rem] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3">
            <span className="badge-live text-[#dc0000]"><span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />Mistral AI · Assistant</span>
            <div className="flex items-center gap-2">
              <VoiceAssistant onTranscript={handleVoiceTranscript} onSpeak={() => {}} enabled={voiceEnabled} />
              <button onClick={() => setVoiceEnabled((v) => !v)} className={`label-mono text-[10px] ${voiceEnabled ? 'text-[#00ff41]' : 'text-[#555]'}`} title={voiceEnabled ? 'Voix ON' : 'Voix OFF'}>{voiceEnabled ? '🔊' : '🔇'}</button>
              <button onClick={() => setOpen(false)} className="label-mono hover:text-white">✕</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 text-[13px] leading-relaxed ${m.from === 'user' ? 'bg-[#dc0000] text-white' : 'border border-[#1f1f1f] bg-[#0d0d0d] text-[#cfcfcf]'}`}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start"><div className="border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2 text-[13px]"><span className="animate-pulse">{voiceEnabled ? '🎤 L\'assistant répond…' : 'Réflexion…'}</span></div></div>
            )}
          </div>

          <div className="flex gap-2 border-t border-[#1f1f1f] p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder={voiceEnabled ? 'Écris ou parle 🎤…' : 'Pose ta question setup…'} disabled={loading}
              className="flex-1 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none placeholder:text-[#555] focus:ring-1 focus:ring-[#dc0000] disabled:opacity-50" />
            <button onClick={handleSend} disabled={loading || !input.trim()} className="bg-[#dc0000] px-3 py-2 label-mono text-white hover:bg-[#ff1e00] disabled:opacity-50">{loading ? '...' : 'Envoyer'}</button>
          </div>
        </div>
      )}
    </>
  )
}
