import { useCallback, useEffect, useRef, useState } from 'react'

/* ============================================================
   useRaceControl — orchestre la course à partir des données
   RÉELLES du capteur photosensible G2D (table G2D_LIDAR).

   Source de vérité : le pont scripts/lidar_ingest.py détecte le
   passage de la ligne blanche (pic de luminosité). Ce hook lit la
   dernière mesure et reconstruit l'état de course côté cockpit.

   Logique de tour (plage de validation) :
   - 1er passage devant la ligne → tour 1 lancé, chrono démarre.
   - passage suivant AVANT MIN_LAP_MS → encore dans le tour :
       simple franchissement de ligne (flash), AUCUN tour compté.
   - passage suivant DANS la plage [MIN_LAP_MS … ] → tour bouclé :
       on enregistre le temps, on relance le chrono et on BUZZ.
   ============================================================ */

/** Temps de référence d'un tour du circuit (ms). */
export const TEMPS_REF_MS = 8000

/** Durée minimale d'un tour valide (ms). En-dessous, un nouveau
 *  passage est considéré comme un simple franchissement de ligne
 *  (le pilote est « encore dans le tour »), pas comme un tour bouclé.
 *  Calé sur 40 % du temps de référence : reste cohérent si on change
 *  TEMPS_REF_MS, et laisse une marge anti-rebond réaliste. */
export const MIN_LAP_MS = Math.round(TEMPS_REF_MS * 0.4)

export interface LapRecord {
  lap: number
  ms: number
}

export interface SensorReading {
  luminosite: number
  reflectivite: number | null
  status: string
}

export interface RaceState {
  /** null = test en cours, true/false = capteur joignable */
  connected: boolean | null
  /** dernière lecture réelle du capteur */
  sensor: SensorReading | null
  /** le capteur est actuellement sur la ligne blanche */
  onLine: boolean
  /** numéro du tour en cours (0 = pas encore lancé) */
  currentLap: number
  /** historique des tours bouclés */
  laps: LapRecord[]
  /** meilleur tour (ms) */
  bestMs: number | null
  /** horloge client au démarrage du tour courant (pour le chrono live) */
  lapStartTs: number | null
  /** horloge client du dernier franchissement (pour l'animation flash) */
  lastCrossingTs: number | null
}

interface RawRow {
  luminosite: number | string
  reflectivite: number | string | null
  status: string
  ligne?: number | string
  tour?: number | string
  lap_ms?: number | string
}

const POLL_MS = 500

/** Déclenche un bip court sur le buzzer physique à chaque tour bouclé. */
function buzzLap() {
  window
    .fetch('/api/db_api.php?action=buzzer&cmd=BUZZER_TEST&source=race_control')
    .catch(() => {
      /* buzzer injoignable : on ignore, la course continue */
    })
}

export function useRaceControl(): RaceState {
  const initial: RaceState = {
    connected: null,
    sensor: null,
    onLine: false,
    currentLap: 0,
    laps: [],
    bestMs: null,
    lapStartTs: null,
    lastCrossingTs: null,
  }

  const [state, setState] = useState<RaceState>(initial)
  const stateRef = useRef<RaceState>(initial)
  const prevTour = useRef(0)

  const commit = useCallback((next: RaceState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const poll = useCallback(async () => {
    let rows: RawRow[] | null = null
    try {
      const r = await window.fetch('/api/db_api.php?action=lidar_g2d&limit=5')
      const j = await r.json()
      if (j.success && Array.isArray(j.data) && j.data.length) rows = j.data as RawRow[]
    } catch {
      /* réseau indisponible */
    }

    if (!rows) {
      commit({ ...stateRef.current, connected: false })
      return
    }

    const latest = rows[0]
    const tour = Number(latest.tour ?? 0)
    const onLine = Number(latest.ligne ?? 0) === 1
    const sensor: SensorReading = {
      luminosite: Number(latest.luminosite) || 0,
      reflectivite: latest.reflectivite != null ? Number(latest.reflectivite) : null,
      status: latest.status || 'OK',
    }

    const prev = stateRef.current
    let { laps, bestMs, lapStartTs, lastCrossingTs, currentLap } = prev
    let shouldBuzz = false

    // Le pont a redémarré (le compteur de passages repart à 0) → reset course.
    if (tour < prevTour.current) {
      laps = []
      bestMs = null
      lapStartTs = null
      lastCrossingTs = null
      currentLap = 0
    }

    // Nouveau passage physique devant la ligne (le pont a incrémenté `tour`).
    if (tour > prevTour.current) {
      const now = Date.now()
      lastCrossingTs = now // flash visuel à chaque passage, valide ou non

      if (lapStartTs == null) {
        // Tout premier passage → on lance le tour 1, le chrono démarre.
        currentLap = 1
        lapStartTs = now
      } else {
        const elapsed = now - lapStartTs
        if (elapsed >= MIN_LAP_MS) {
          // Passage dans la plage valide → tour bouclé.
          laps = [{ lap: currentLap, ms: elapsed }, ...laps].slice(0, 30)
          bestMs = bestMs == null ? elapsed : Math.min(bestMs, elapsed)
          currentLap += 1
          lapStartTs = now
          shouldBuzz = true
        }
        // Sinon (elapsed < MIN_LAP_MS) : encore dans le tour → simple
        // franchissement de ligne, on ne compte PAS de tour supplémentaire.
      }
    }

    prevTour.current = tour

    commit({
      connected: true,
      sensor,
      onLine,
      currentLap,
      laps,
      bestMs,
      lapStartTs,
      lastCrossingTs,
    })

    if (shouldBuzz) buzzLap()
  }, [commit])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  return state
}
