import { useState, useCallback, useRef, useEffect } from 'react'

/* ============================================================
   BuzzerControl.tsx — Panneau de commande du buzzer g2e
   Mode hybride : API PHP (si dispo) + fallback local audio
   ============================================================ */

const BUZZER_COMMANDS = [
  { cmd: 'BUZZER_PIT_STOP', label: '🏁 PIT STOP', desc: 'Arrêt stands', color: '#ffb800', hz: 600 },
  { cmd: 'BUZZER_SAFETY_CAR', label: '🚨 SAFETY CAR', desc: 'Safety Car', color: '#ffb800', hz: 400 },
  { cmd: 'BUZZER_RELEASE', label: '🟢 RELEASE', desc: 'Libération', color: '#00ff41', hz: 800 },
  { cmd: 'BUZZER_HOLD', label: '🔴 HOLD', desc: 'Maintien', color: '#dc0000', hz: 300 },
  { cmd: 'BUZZER_EMERGENCY', label: '⚠️ EMERGENCY', desc: 'Urgence', color: '#dc0000', hz: 200 },
  { cmd: 'BUZZER_TEST', label: '🔧 TEST', desc: 'Test buzz', color: '#3b82f6', hz: 1000 },
  { cmd: 'BUZZER_OFF', label: '⏹️ OFF', desc: 'Arrêt', color: '#8a8a8a', hz: 0 },
]

export function BuzzerControl() {
  const [lastCmd, setLastCmd] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [phpAvailable, setPhpAvailable] = useState<boolean | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Vérifier si l'API PHP est accessible au montage
  useEffect(() => {
    fetch('/api/db_api.php?action=buzzer_status')
      .then(r => r.json())
      .then(d => setPhpAvailable(d.success === true))
      .catch(() => setPhpAvailable(false))
  }, [])

  // Jouer un son local (Web Audio API) comme retour immédiat
  const playLocalBeep = useCallback((hz: number, duration = 300) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(hz, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration / 1000)
    } catch {}
  }, [])

  const sendCommand = useCallback(async (cmd: string, hz: number) => {
    setLoading(cmd)
    setFeedback(null)

    // Toujours jouer le son local immédiatement (feedback instantané)
    if (hz > 0) playLocalBeep(hz, 400)

    // Essayer l'API PHP
    try {
      const res = await fetch(`/api/db_api.php?action=buzzer&cmd=${encodeURIComponent(cmd)}&source=dashboard`)
      const json = await res.json()
      if (json.success) {
        setLastCmd(cmd)
        setPhpAvailable(true)
        setFeedback({ ok: true, msg: `✅ ${json.message || cmd} — enregistré en base` })
      } else {
        setFeedback({ ok: true, msg: `⚠️ ${json.error || 'Erreur API'} — mais le son local a été joué` })
      }
    } catch {
      // Mode offline : le son a déjà été joué, on confirme juste
      setPhpAvailable(false)
      setLastCmd(cmd)
      setFeedback({ ok: true, msg: `🔊 ${cmd.replace('BUZZER_', '')} joué en local (PHP hors-ligne)` })
    } finally {
      setLoading(null)
      setTimeout(() => setFeedback(null), 3000)
    }
  }, [playLocalBeep])

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#ffb800]">
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse-dot ${phpAvailable ? 'bg-[#ffb800]' : 'bg-[#8a8a8a]'}`} />
          Contrôle Buzzer · G2E {phpAvailable === false && '(mode local)'}
        </span>
        {lastCmd && (
          <span className="label-mono text-[#00ff41]">
            Dernière : {lastCmd.replace('BUZZER_', '')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BUZZER_COMMANDS.map(({ cmd, label, desc, color, hz }) => (
          <button
            key={cmd}
            onClick={() => sendCommand(cmd, hz)}
            disabled={loading !== null}
            className="panel p-3 flex flex-col items-center gap-1.5 text-center transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: loading === cmd ? color : lastCmd === cmd ? color : '#1f1f1f',
              boxShadow: lastCmd === cmd ? `0 0 10px -2px ${color}40` : undefined,
            }}
          >
            <span className="text-xl">{label.split(' ')[0]}</span>
            <span className="title-display text-[11px]" style={{ color }}>
              {label.split(' ').slice(1).join(' ')}
            </span>
            <span className="label-mono text-[9px]">{desc}</span>
            {loading === cmd && (
              <span className="h-1 w-full bg-[#1f1f1f] rounded-sm overflow-hidden mt-1">
                <span className="block h-full bg-[#dc0000] animate-pulse w-full" />
              </span>
            )}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`px-4 py-3 text-sm ${feedback.ok ? 'bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]' : 'bg-[#dc0000]/10 border border-[#dc0000]/30 text-[#ff6a6a]'}`}>
          {feedback.msg}
        </div>
      )}
    </div>
  )
}
