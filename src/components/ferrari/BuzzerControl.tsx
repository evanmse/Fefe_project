import { useState, useCallback } from 'react'
import { StatusPill } from './atoms'

/* ============================================================
   BuzzerControl.tsx — Panneau de commande du buzzer g2e
   ============================================================ */

const BUZZER_COMMANDS = [
  { cmd: 'BUZZER_PIT_STOP', label: '🏁 PIT STOP', desc: 'Arrêt aux stands', color: '#ffb800' },
  { cmd: 'BUZZER_SAFETY_CAR', label: '🚨 SAFETY CAR', desc: 'Voiture de sécurité', color: '#ffb800' },
  { cmd: 'BUZZER_RELEASE', label: '🟢 RELEASE', desc: 'Libération piste', color: '#00ff41' },
  { cmd: 'BUZZER_HOLD', label: '🔴 HOLD', desc: 'Maintien position', color: '#dc0000' },
  { cmd: 'BUZZER_EMERGENCY', label: '⚠️ EMERGENCY', desc: 'Urgence piste', color: '#dc0000' },
  { cmd: 'BUZZER_TEST', label: '🔧 TEST', desc: 'Test sonnerie', color: '#3b82f6' },
  { cmd: 'BUZZER_OFF', label: '⏹️ OFF', desc: 'Arrêt buzzer', color: '#8a8a8a' },
]

const API_BASE = import.meta.env.VITE_API_URL || ''

export function BuzzerControl() {
  const [lastCmd, setLastCmd] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const sendCommand = useCallback(async (cmd: string) => {
    setLoading(cmd)
    setFeedback(null)
    try {
      const res = await fetch(`/api/db_api.php?action=buzzer&cmd=${encodeURIComponent(cmd)}&source=dashboard`)
      const json = await res.json()
      if (json.success) {
        setLastCmd(cmd)
        setFeedback({ ok: true, msg: json.message || `Commande ${cmd} envoyée` })
      } else {
        setFeedback({ ok: false, msg: json.error || 'Erreur' })
      }
    } catch (e) {
      setFeedback({ ok: false, msg: `PHP indisponible — lance php -S localhost:8080` })
    } finally {
      setLoading(null)
    }
  }, [])

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#ffb800]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot" />
          Contrôle Buzzer · G2E
        </span>
        {lastCmd && (
          <span className="label-mono text-[#00ff41]">
            Dernière : {lastCmd.replace('BUZZER_', '')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BUZZER_COMMANDS.map(({ cmd, label, desc, color }) => (
          <button
            key={cmd}
            onClick={() => sendCommand(cmd)}
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
