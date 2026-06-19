import { useState, useEffect, useCallback } from 'react'

/* ============================================================
   LedControl.tsx — Panneau de contrôle des LEDs par groupe
   INSERT dans leds_g2c → le device du groupe poll et s'allume
   ============================================================ */

interface LedState {
  table: string
  groupe: string
  etat: number
  date_modification?: string
}

const GROUPS = ['g2a', 'g2b', 'g2c', 'g2d', 'g2e']

export function LedControl() {
  const [leds, setLeds] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [phpAvailable, setPhpAvailable] = useState<boolean | null>(null)

  const fetchLeds = useCallback(async () => {
    try {
      const res = await fetch(`/api/db_api.php?action=leds`)
      const json = await res.json()
      if (json.success && json.data) {
        setPhpAvailable(true)
        const states: Record<string, number> = {}
        for (const [, data] of Object.entries(json.data)) {
          const d = data as LedState
          if (d.groupe) states[d.groupe] = d.etat
        }
        setLeds(states)
      }
    } catch {
      setPhpAvailable(false)
      // Mode démo
      setLeds({ g2a: 0, g2b: 1, g2c: 0, g2d: 1, g2e: 0 })
    }
  }, [])

  useEffect(() => { fetchLeds() }, [fetchLeds])

  // Polling DB toutes les 2s pour avoir l'état réel des LEDs
  useEffect(() => {
    const interval = setInterval(fetchLeds, 2000)
    return () => clearInterval(interval)
  }, [fetchLeds])

  const toggleLed = async (groupe: string) => {
    const current = leds[groupe] ?? 0
    const newState = current === 1 ? 0 : 1
    setLoading(groupe)

    try {
      const res = await fetch(`/api/db_api.php?action=led&groupe=${groupe}&state=${newState}`)
      const json = await res.json()
      if (json.success) {
        setLeds(prev => ({ ...prev, [groupe]: newState }))
        setPhpAvailable(true)
        setFeedback(`✅ LED ${groupe} → ${newState === 1 ? 'ALLUMÉE' : 'ÉTEINTE'} — enregistré en base`)
      } else {
        setFeedback(`❌ ${json.error || 'Erreur API'}`)
      }
    } catch {
      setPhpAvailable(false)
      setLeds(prev => ({ ...prev, [groupe]: newState }))
      setFeedback(`⚠️ PHP offline — état local uniquement`)
    }

    setLoading(null)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live">
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse-dot ${phpAvailable ? 'bg-[#00ff41]' : 'bg-[#dc0000]'}`} />
          Contrôle LEDs {phpAvailable === false && '⚠️ PHP offline'}
        </span>
        <button onClick={fetchLeds} className="label-mono hover:text-white transition">
          🔄 Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {GROUPS.map((groupe) => {
          const state = leds[groupe] ?? 0
          const isOn = state === 1
          return (
            <button
              key={groupe}
              onClick={() => toggleLed(groupe)}
              disabled={loading === groupe}
              className={`panel p-4 flex flex-col items-center gap-2 transition-all ${
                isOn
                  ? 'border-[#00ff41] shadow-[0_0_14px_-3px_rgba(0,255,65,0.4)]'
                  : 'border-[#1f1f1f] hover:border-[#3a3a3a]'
              } disabled:opacity-50`}
            >
              <span className="text-2xl">{isOn ? '💡' : '⚫'}</span>
              <span className="title-display text-xs uppercase">{groupe}</span>
              <span
                className={`label-mono text-[10px] ${isOn ? 'text-[#00ff41]' : 'text-[#555]'}`}
              >
                {isOn ? 'ON' : 'OFF'}
              </span>
              {loading === groupe && (
                <span className="label-mono text-[10px] animate-pulse">...</span>
              )}
            </button>
          )
        })}
      </div>

      {feedback && (
        <div className={`px-4 py-3 text-sm ${feedback.startsWith('✅') ? 'bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]' : feedback.startsWith('❌') ? 'bg-[#dc0000]/10 border border-[#dc0000]/30 text-[#ff6a6a]' : 'bg-[#ffb800]/10 border border-[#ffb800]/30 text-[#ffb800]'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}
