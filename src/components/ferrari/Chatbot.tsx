import { useEffect, useRef, useState } from 'react'
import { FerrariShield } from './FerrariShield'

/* ============================================================
   Chatbot.tsx — assistant ingénieur (réponses locales scriptées).
   Évolution vers un assistant vocal embarqué.
   ============================================================ */

interface Msg {
  from: 'eng' | 'user'
  text: string
}

const KNOWLEDGE: { match: RegExp; answer: string }[] = [
  {
    match: /garde au sol|ride height|hauteur/i,
    answer:
      "La garde au sol est mesurée au LiDAR à 100 Hz à l'avant et à l'arrière. On vise ~22 mm AV / ~38 mm AR pour maximiser l'effet de sol sans toucher la planche.",
  },
  {
    match: /downforce|appui|aero|aéro/i,
    answer:
      "L'appui dépend surtout de la garde au sol et du rake. Plus on plaque la voiture, plus l'effet de sol génère de downforce — jusqu'au décrochage si c'est trop bas.",
  },
  {
    match: /rake|assiette|pitch/i,
    answer:
      "Le rake (assiette) idéal est autour de +1°. Trop de rake augmente la traînée, trop peu réduit l'appui de plancher. Le statut passe SUBOPTIMAL au-delà de 2.6°.",
  },
  {
    match: /lidar|capteur|sensor/i,
    answer:
      "Deux LiDAR pointent le sol : un sous le nez, un sous le plancher arrière. Ils renvoient un nuage de points à 100 Hz pour reconstruire la hauteur réelle de la planche.",
  },
  {
    match: /hors piste|hors circuit|piste/i,
    answer:
      "Le LiDAR sous pneu détecte les défauts de garde au sol et les écarts de trajectoire. En F1, la moindre sortie de piste se retrouve immédiatement dans le statut piste.",
  },
  {
    match: /critique|critical|danger/i,
    answer:
      "Statut CRITICAL = garde au sol trop faible (AV < 12 mm ou AR < 18 mm). Risque d'usure de planche et de marsouinage. Remonter immédiatement le setup.",
  },
  {
    match: /login|connexion|mot de passe|identifiant/i,
    answer:
      "Le cockpit ingénieur se déverrouille avec l'écurie FERRARI et le numéro 16. Les identifiants sont stockés en local (localStorage).",
  },
]

const FALLBACK =
  "Je suis l'assistant ingénieur de piste. Demande-moi la garde au sol, l'appui aéro, le rake ou le fonctionnement des LiDAR."

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: 'eng',
      text: 'Box, box. Ici le mur des stands — pose ta question sur le setup ou les LiDAR.',
    },
  ])
  const [listening, setListening] = useState(false)
  const [supportsVoice, setSupportsVoice] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSupportsVoice(false)
      return
    }

    setSupportsVoice(true)

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setVoiceError('Reconnaissance vocale indisponible')
      setListening(false)
    }
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (!transcript) return
      setInput(transcript)
      send(transcript)
    }

    recognitionRef.current = recognition
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = (query?: string) => {
    const q = query?.trim() ?? input.trim()
    if (!q) return
    const hit = KNOWLEDGE.find((k) => k.match.test(q))
    setMessages((m) => [
      ...m,
      { from: 'user', text: q },
      { from: 'eng', text: hit ? hit.answer : FALLBACK },
    ])
    setInput('')
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
    })
  }

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      return
    }

    setVoiceError('')
    try {
      recognitionRef.current.start()
    } catch {
      setVoiceError('Microphone indisponible')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#dc0000] shadow-[0_0_24px_-4px_rgba(220,0,0,0.7)] transition hover:scale-105"
        aria-label="Assistant ingénieur"
      >
        <div className="assistant-avatar flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] text-white shadow-[0_0_18px_rgba(220,0,0,0.35)]">
          <FerrariShield size={20} />
        </div>
      </button>

      {open && (
        <div className="panel fixed bottom-24 right-6 z-50 flex h-[30rem] w-[24rem] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="assistant-avatar flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] text-white shadow-[0_0_18px_rgba(220,0,0,0.35)]">
                <FerrariShield size={18} />
              </div>
              <div>
                <div className="badge-live text-[#dc0000]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />
                  Assistant piste
                </div>
                <div className="label-mono text-[11px] text-[#9a9a9a]">
                  Demande au technicien IA
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="label-mono hover:text-white"
            >
              Fermer
            </button>
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
          </div>

          <div className="border-t border-[#1f1f1f] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleVoice}
                className="inline-flex items-center gap-2 rounded-full border border-[#dc0000] bg-[#121212] px-3 py-2 text-sm text-white transition hover:bg-[#dc0000]/10"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${listening ? 'bg-[#00ff41]' : 'bg-[#dc0000]'}`} />
                {listening ? 'Écoute…' : 'Parler'}
              </button>
              <span className="label-mono text-[11px] text-[#9a9a9a]">
                {supportsVoice ? 'Commande vocale prête' : 'Vocale non supportée'}
              </span>
            </div>
            {voiceError && (
              <div className="mb-3 rounded-sm bg-[#dc0000]/10 px-3 py-2 text-sm text-[#ff9a9a]">
                {voiceError}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Pose ta question setup…"
                className="flex-1 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none placeholder:text-[#555] focus:ring-1 focus:ring-[#dc0000]"
              />
              <button
                onClick={() => send()}
                className="bg-[#dc0000] px-3 py-2 label-mono text-white hover:bg-[#ff1e00]"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
