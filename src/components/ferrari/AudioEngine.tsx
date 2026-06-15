import { useEffect, useRef } from 'react'

/* ============================================================
   AudioEngine.tsx — Moteur audio WebAudio lié au régime moteur
   Composant invisible (ne rend aucun DOM) qui génère un son
   synthétique de moteur dont la hauteur suit le RPM.
   - 80 Hz à bas régime (≈idle 2000 tr/min)
   - 320 Hz à haut régime (≈max 18000 tr/min)
   - Filtre passe-bas à 1200 Hz pour un timbre plus doux
   ============================================================ */

interface AudioEngineProps {
  /** Régime moteur courant (tr/min) */
  rpm: number
  /** Active / désactive le son */
  active: boolean
}

/**
 * Hook invisible qui pilote un oscillateur WebAudio en fonction du RPM.
 * La fréquence de l'oscillateur est interpolée linéairement entre
 * 80 Hz (rpm min ~2000) et 320 Hz (rpm max ~18000).
 */
export default function AudioEngine({ rpm, active }: AudioEngineProps) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    // Création paresseuse du contexte audio (doit suivre un geste utilisateur)
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext()
      } catch {
        console.warn('[AudioEngine] WebAudio non supporté')
        return
      }
    }

    const ctx = audioCtxRef.current

    if (active) {
      // Reprendre le contexte si suspendu (autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      // Créer la chaîne audio : oscillateur → filtre → gain → destination
      if (!oscRef.current) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 1200
        filter.Q.value = 1

        const gain = ctx.createGain()
        gain.gain.value = 0.08 // Volume modéré pour ne pas satur er

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        osc.start()

        oscRef.current = osc
        filterRef.current = filter
        gainRef.current = gain
      }
    } else {
      // Arrêter et nettoyer l'oscillateur
      if (oscRef.current) {
        try {
          oscRef.current.stop()
        } catch { /* déjà arrêté */ }
        oscRef.current.disconnect()
        oscRef.current = null
      }
      if (filterRef.current) {
        filterRef.current.disconnect()
        filterRef.current = null
      }
      if (gainRef.current) {
        gainRef.current.disconnect()
        gainRef.current = null
      }
    }

    return () => {
      // Nettoyage complet au démontage
      if (oscRef.current) {
        try {
          oscRef.current.stop()
        } catch { /* déjà arrêté */ }
        oscRef.current.disconnect()
        oscRef.current = null
      }
      if (filterRef.current) {
        filterRef.current.disconnect()
        filterRef.current = null
      }
      if (gainRef.current) {
        gainRef.current.disconnect()
        gainRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [active])

  // Mettre à jour la fréquence en continu quand le RPM change
  useEffect(() => {
    if (!oscRef.current || !active) return

    // Interpolation linéaire : idle ~2000 tr/min → 80 Hz, max ~18000 tr/min → 320 Hz
    const minRpm = 2000
    const maxRpm = 18000
    const minFreq = 80
    const maxFreq = 320

    const t = Math.max(0, Math.min(1, (rpm - minRpm) / (maxRpm - minRpm)))
    const freq = minFreq + t * (maxFreq - minFreq)

    oscRef.current.frequency.setTargetAtTime(freq, oscRef.current.context.currentTime, 0.05)
  }, [rpm, active])

  // Composant invisible : aucun élément DOM rendu
  return null
}
