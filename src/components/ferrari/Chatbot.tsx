import { useRef, useState, useCallback, useEffect } from 'react'
import { FerrariShield } from './FerrariShield'
import { VoiceAssistant, speakText } from './VoiceAssistant'

interface Msg { from: 'eng' | 'user'; text: string }

const WELCOME = 'Box, box. Ici le mur des stands — pose ta question !'
const FALLBACK = `Voici ce que je peux t'expliquer :
• Garde au sol idéale : 20-40 mm
• Rake optimal : +1.0°
• Photosensible scanne à 100 Hz (résolution 0.1 mm)
• Capteurs IoT : température, humidité, luminosité
• Buzzer G2E : PIT_STOP, SAFETY_CAR, RELEASE, HOLD, EMERGENCY`

/** Rendu Markdown léger sans dépendances */
function renderMarkdown(text: string): string {
  let html = text
    // Échapper HTML d'abord
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Liens [texte](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#ffb800] underline hover:text-[#ffd700]">$1</a>')

  // Gras **texte** ou __texte__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong class="text-white font-semibold">$1</strong>')

  // Italique *texte* ou _texte_ (après le gras)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Code inline `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-[#1f1f1f] px-1 py-0.5 text-[#00ff41] font-mono text-[11px]">$1</code>')

  // Listes à puces • ou - ou *
  html = html.replace(/^[•\-*]\s+(.+)$/gm, '<li class="ml-4 list-disc text-[#cfcfcf] leading-relaxed">$1</li>')
  // Fusionner <li> consécutifs dans un <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul class="space-y-0.5 my-1">$1</ul>')

  // Sauts de ligne
  html = html.replace(/\n{2,}/g, '<br/><br/>')
  html = html.replace(/\n/g, '<br/>')

  // Nettoyer les <br/> dans les <ul>/<li>
  html = html.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, content) =>
    `<ul class="space-y-0.5 my-1">${content.replace(/<br\s*\/?>/gi, '')}</ul>`
  )

  return html
}

function localAnswer(q: string): string {
  const ql = q.toLowerCase()
  if (ql.includes('lidar') || ql.includes('capteur')) return '🔬 Le Photosensible G2D mesure la luminosité (0-2150 lux) et la distance. Calibration : ADC 123→6lx, 854→121lx, 1007→2150lx. La détection hors-piste se fait par réflectivité > 80% (bande blanche).'
  if (ql.includes('buzzer') || ql.includes('sonner')) return '🔊 Le buzzer G2E accepte 7 commandes : BUZZER_PIT_STOP, BUZZER_SAFETY_CAR, BUZZER_RELEASE, BUZZER_HOLD, BUZZER_EMERGENCY, BUZZER_TEST, BUZZER_OFF. Pour le déclencher, crée une entrée dans commande_buzzer_g2e.'
  if (ql.includes('led') || ql.includes('lumière')) return '💡 Les LEDs sont contrôlées via la table leds_g2c. Change l\'état (0=OFF, 1=ON) pour allumer/éteindre.'
  if (ql.includes('temperature') || ql.includes('température') || ql.includes('chaud')) return '🌡️ Les capteurs de température sont dans la table Mesure (groupes g2c, g2e) et G2B. Actuellement : g2c=30°C, g2e=57°C, g2b=22°C.'
  if (ql.includes('humidité') || ql.includes('humidite')) return '💧 Les capteurs d\'humidité sont dans Mesure et G2B. Actuellement : g2c=47%, g2b=38%.'
  if (ql.includes('garde au sol') || ql.includes('ride height')) return '🏎️ La garde au sol (ride height) idéale se situe entre 20-40 mm. Trop bas → décrochage de plancher (CRITICAL). Le Photosensible mesure la hauteur en continu à 100 Hz.'
  if (ql.includes('rake') || ql.includes('assiette')) return '📐 Le rake (assiette) est la différence de hauteur AV/AR. Optimal ≈ +1.0°. Un mauvais rake dégrade l\'appui aéro.'
  if (ql.includes('downforce') || ql.includes('appui')) return '🪽 L\'appui aéro (downforce) dépend de l\'effet de sol et du rake. Maximum ~1100 kg. La balance avant idéale est ~50%.'
  return ''
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([{ from: 'eng' as const, text: WELCOME }])
  const [loading, setLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceMode, setVoiceMode] = useState<'manual' | 'wake'>('manual')
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }) })
  }, [])

  useEffect(() => { scrollBottom() }, [messages, scrollBottom])

  const sendMessage = useCallback(async (q: string) => {
    if (!q.trim()) return
    const query = q.trim()
    setMessages((m) => [...m, { from: 'user', text: query }])
    setInput('')
    setLoading(true)

    let answer = ''

    // 1. IA Ferrari (Groq → Mistral → FAQ BDD)
    try {
      const res = await fetch('/api/chat_ai.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history: messages.slice(-6).map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })) }),
      })
      if (res.ok) { const d = await res.json(); if (d.reply) answer = d.reply }
    } catch {}

    // 2. Fallback: FAQ BDD directe
    if (!answer) {
      try {
        const faqRes = await fetch(`/api/db_api.php?action=faq&q=${encodeURIComponent(query)}`)
        if (faqRes.ok) { const d = await faqRes.json(); if (d.success && d.data?.length) { answer = d.data.map((r:any,i:number) => `📌 **${r.question}**\n${r.answer}`).join('\n\n---\n\n') } }
      } catch {}
    }

    // 3. Fallback ultime: réponse locale
    if (!answer) {
      answer = localAnswer(query)
      if (!answer) answer = `🤖 ${FALLBACK}`
    }

    setMessages((m) => [...m, { from: 'eng', text: answer }])
    if (voiceEnabled) speakText(answer)
    setLoading(false)
  }, [messages, voiceEnabled])

  const handleSend = useCallback(() => { if (input.trim() && !loading) sendMessage(input) }, [input, loading, sendMessage])
  const handleVoiceTranscript = useCallback((text: string) => { sendMessage(text) }, [sendMessage])

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode((m) => (m === 'manual' ? 'wake' : 'manual'))
  }, [])

  return (
    <>
      <button onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#dc0000] shadow-[0_0_24px_-4px_rgba(220,0,0,0.7)] transition hover:scale-105"
        aria-label="Assistant IA"><FerrariShield size={26} /></button>

      {open && (
        <div className="panel fixed bottom-24 right-6 z-50 flex h-[30rem] w-[24rem] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3">
            <span className="badge-live text-[#dc0000]"><span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />Ferrari IA · Groq + Mistral</span>
            <div className="flex items-center gap-2">
              <VoiceAssistant onTranscript={handleVoiceTranscript} onSpeak={() => {}} enabled={voiceEnabled} mode={voiceMode} />
              <button onClick={() => setVoiceEnabled((v) => !v)} className={`label-mono text-[10px] ${voiceEnabled ? 'text-[#00ff41]' : 'text-[#555]'}`} title={voiceEnabled ? 'Voix ON' : 'Voix OFF'}>{voiceEnabled ? '🔊' : '🔇'}</button>
              <button
                onClick={toggleVoiceMode}
                className={`label-mono text-[10px] ${voiceMode === 'wake' ? 'text-[#ffb800]' : 'text-[#555]'}`}
                title={voiceMode === 'wake' ? 'Mode mains-libres — Dis « Ferrari »' : 'Mode manuel — Clique sur 🎤'}
              >
                {voiceMode === 'wake' ? '🙌' : '👆'}
              </button>
              <button onClick={() => setOpen(false)} className="label-mono hover:text-white">✕</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'user' ? (
                  <div className="max-w-[80%] px-3 py-2 text-[13px] leading-relaxed bg-[#dc0000] text-white">{m.text}</div>
                ) : (
                  <div className="max-w-[80%] px-3 py-2 text-[13px] leading-relaxed border border-[#1f1f1f] bg-[#0d0d0d] text-[#cfcfcf] chat-msg" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start"><div className="border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2 text-[13px]"><span className="animate-pulse">{voiceEnabled ? '🎤 L\'assistant répond…' : 'Réflexion…'}</span></div></div>
            )}
          </div>

          <div className="flex gap-2 border-t border-[#1f1f1f] p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder={voiceMode === 'wake' ? 'Dis « Ferrari » ou écris… 🎤' : voiceEnabled ? 'Écris ou parle 🎤…' : 'Pose ta question setup…'} disabled={loading}
              className="flex-1 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none placeholder:text-[#555] focus:ring-1 focus:ring-[#dc0000] disabled:opacity-50" />
            <button onClick={handleSend} disabled={loading || !input.trim()} className="bg-[#dc0000] px-3 py-2 label-mono text-white hover:bg-[#ff1e00] disabled:opacity-50">{loading ? '...' : 'Envoyer'}</button>
          </div>
        </div>
      )}
    </>
  )
}
