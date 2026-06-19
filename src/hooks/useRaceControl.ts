import { useCallback, useEffect, useRef, useState } from 'react'

/* ============================================================
   useRaceControl — orchestre la course à partir des données
   RÉELLES du capteur photosensible G2D (table G2D_LIDAR).

   Source de vérité : le pont scripts/lidar_ingest.py détecte le
   passage de la ligne blanche (pic de luminosité). Ce hook lit la
   dernière mesure et reconstruit l'état de course côté cockpit.

   Logique de tour :
   - 1er passage devant la ligne → tour 1 lancé, chrono démarre.
   - chaque passage suivant → tour bouclé : on enregistre le temps,
       on relance le chrono et on BUZZ.

   La détection d'un passage (et son anti-rebond réel) est faite en
   amont par le pont scripts/lidar_ingest.py : hystérésis sur la
   réflectivité + délai anti-rebond (~0,8 s). Deux incréments de `tour`
   sont donc toujours espacés d'un vrai passage distinct. Le hook se
   contente de chronométrer ; il n'a pas à re-valider une durée mini
   « réaliste » (c'était la cause des tours non comptés en démo).
   ============================================================ */

/** Temps de référence d'un tour du circuit (ms), pour colorer l'écart. */
export const TEMPS_REF_MS = 8000

/** Garde-fou anti-doublon (ms). L'anti-rebond métier est dans le pont
 *  capteur ; cette valeur ne sert qu'à absorber un éventuel jitter de
 *  polling et reste bien sous l'anti-rebond du pont, pour ne JAMAIS
 *  rejeter un passage réellement détecté. */
export const MIN_LAP_MS = 250

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
  /** course armée : on ne compte les tours que pendant une session active */
  active: boolean
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
  id?: number | string
  luminosite: number | string
  reflectivite: number | string | null
  status: string
  ligne?: number | string
  tour?: number | string
  lap_ms?: number | string
}

const POLL_MS = 500

/** Au-delà de ce délai sans NOUVELLE mesure (id figé), on considère le
 *  capteur déconnecté : le pont scripts/lidar_ingest.py n'écrit plus.
 *  La base garde les anciennes lignes, donc une réponse 200 ne suffit PAS
 *  à prouver que le capteur est branché : seule l'arrivée de lignes
 *  fraîches le prouve. On compare l'horloge CLIENT (pas date_mesure côté
 *  serveur) pour rester insensible au fuseau horaire. */
export const STALE_MS = 2500

/** Contrôles de session retournés en plus de l'état de course. */
export interface RaceControl extends RaceState {
  /** démarre une nouvelle course (remet les compteurs à zéro et arme) */
  start: () => void
  /** arrête la course en cours (fige l'historique, stoppe le chrono) */
  stop: () => void
}

/** Déclenche un bip court sur le buzzer physique à chaque tour bouclé. */
function buzzLap() {
  window
    .fetch('/api/db_api.php?action=buzzer&cmd=BUZZER_TEST&source=race_control')
    .catch(() => {
      /* buzzer injoignable : on ignore, la course continue */
    })
}

export function useRaceControl(): RaceControl {
  const initial: RaceState = {
    connected: null,
    active: false,
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
  // Session armée manuellement (boutons Démarrer / Arrêter).
  const activeRef = useRef(false)
  // Suivi de fraîcheur : dernier id vu + horloge client à laquelle on l'a vu.
  const lastIdRef = useRef<string | null>(null)
  const lastFreshRef = useRef<number>(0)

  const commit = useCallback((next: RaceState) => {
    stateRef.current = next
    setState(next)
  }, [])

  /** Démarre une nouvelle course : remet les compteurs à zéro et arme la
   *  session. Le 1ᵉʳ passage suivant lancera le tour 1. */
  const start = useCallback(() => {
    activeRef.current = true
    commit({
      ...stateRef.current,
      active: true,
      currentLap: 0,
      laps: [],
      bestMs: null,
      lapStartTs: null,
      lastCrossingTs: null,
    })
  }, [commit])

  /** Arrête la course : fige l'historique et stoppe le chrono. Le comptage
   *  ne dépend plus du capteur pour la fin de course. */
  const stop = useCallback(() => {
    activeRef.current = false
    commit({ ...stateRef.current, active: false, lapStartTs: null })
  }, [commit])

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

    // Fraîcheur : la base renvoie toujours les dernières lignes, même si le
    // pont capteur est arrêté. On ne fait confiance qu'à l'arrivée de
    // NOUVELLES mesures (id qui change). Si l'id reste figé plus de STALE_MS,
    // le capteur n'écrit plus → on bloque comme s'il était débranché.
    const now0 = Date.now()
    const latestId = latest.id != null ? String(latest.id) : null
    if (latestId !== lastIdRef.current) {
      lastIdRef.current = latestId
      lastFreshRef.current = now0
    }
    const isFresh = latestId != null && now0 - lastFreshRef.current < STALE_MS
    if (!isFresh) {
      // Données périmées : on fige l'état et on signale la déconnexion,
      // sans avancer les tours sur de vieilles lignes.
      commit({ ...stateRef.current, connected: false })
      prevTour.current = Number(latest.tour ?? 0)
      return
    }

    const tour = Number(latest.tour ?? 0)
    const onLine = Number(latest.ligne ?? 0) === 1
    const sensor: SensorReading = {
      luminosite: Number(latest.luminosite) || 0,
      reflectivite: latest.reflectivite != null ? Number(latest.reflectivite) : null,
      status: latest.status || 'OK',
    }

    // Hors session (course non démarrée ou arrêtée) : on rafraîchit juste le
    // capteur, sans toucher aux compteurs. On re-cale `prevTour` pour que le
    // 1ᵉʳ passage après Démarrer ne soit pas compté par erreur.
    if (!activeRef.current) {
      prevTour.current = tour
      commit({ ...stateRef.current, connected: true, active: false, sensor, onLine })
      return
    }

    const prev = stateRef.current
    let { laps, bestMs, lapStartTs, lastCrossingTs, currentLap } = prev
    let shouldBuzz = false

    // Reconnexion série : l'Arduino redémarre et son compteur `tour` repart à
    // zéro. On NE remet PAS la course à zéro (c'était la cause du comptage qui
    // « coupait ») : on re-cale simplement la référence et on garde l'historique.
    if (tour < prevTour.current) {
      prevTour.current = tour
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
          // Passage distinct → tour bouclé (l'anti-rebond métier est
          // déjà assuré par le pont capteur, cf. en-tête du fichier).
          laps = [{ lap: currentLap, ms: elapsed }, ...laps].slice(0, 30)
          bestMs = bestMs == null ? elapsed : Math.min(bestMs, elapsed)
          currentLap += 1
          lapStartTs = now
          shouldBuzz = true
        }
        // Sinon (elapsed < MIN_LAP_MS) : doublon de polling improbable,
        // ignoré pour ne pas compter deux fois le même passage.
      }
    }

    prevTour.current = tour

    commit({
      connected: true,
      active: true,
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

  return { ...state, start, stop }
}
