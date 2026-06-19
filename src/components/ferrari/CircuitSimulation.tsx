import { useEffect, useMemo, useRef, useState } from 'react'
import { useRaceControl, TEMPS_REF_MS } from '~/hooks/useRaceControl'
import { useLiveTelemetry } from '~/hooks/useLiveTelemetry'
import { BuzzerControl } from './BuzzerControl'
import { LedControl } from './LedControl'
import type { SetupState } from './Dashboard'

type SideTab = 'course' | 'capteurs' | 'voiture' | 'controles'

const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: 'course', label: '🏁 Course' },
  { id: 'capteurs', label: '📡 Capteurs' },
  { id: 'voiture', label: '🏎️ Voiture' },
  { id: 'controles', label: '🎛️ Contrôles' },
]

/* ============================================================
   CircuitSimulation — simulation de circuit pilotée par le
   capteur RÉEL de franchissement de ligne (G2D).

   • Le franchissement de la ligne blanche (capteur photosensible)
     lance le tour, puis compte le tour au passage suivant.
   • La voiture parcourt le tracé (position simulée) ; 4 capteurs
     sous le châssis surveillent les limites de piste.
   • Le reste de la télémétrie (vitesse, régime, rapport…) est
     simulé via useLiveTelemetry.
   ============================================================ */

// Setup figé pour la télémétrie simulée du reste de la voiture.
const SIM_SETUP: SetupState = { rhFront: 22, rhRear: 38, springFront: 140, springRear: 150 }

// Tracé fermé du circuit (viewBox 0 0 640 380). Départ = point de longueur 0.
const TRACK_D =
  'M 120 320 C 60 320 50 240 110 220 C 180 197 160 120 230 110 ' +
  'C 300 100 320 180 380 180 C 450 180 440 80 520 90 ' +
  'C 590 98 600 180 550 230 C 510 270 560 320 470 330 ' +
  'C 380 340 330 280 250 295 C 180 308 175 330 120 320 Z'

const LAP_FALLBACK_MS = TEMPS_REF_MS // temps de tour de référence du circuit (temps défini)

// Facteur de vitesse appliqué quand la voiture sort des limites de piste :
// elle ralentit nettement (40 % de sa vitesse) sans jamais s'arrêter.
const OFFTRACK_SPEED = 0.4

// Voitures concurrentes (simulées) qui tournent en continu sur le tracé.
// La voiture du pilote reste pilotée par le capteur réel ; celles-ci animent
// le circuit avec des rythmes et des décalages de départ différents.
const GHOST_CARS = [
  { id: 'SAI', color: '#ffb800', speed: 0.97, offset: 0.16 },
  { id: 'VER', color: '#3b82f6', speed: 1.05, offset: 0.41 },
  { id: 'HAM', color: '#00d2be', speed: 0.99, offset: 0.66 },
  { id: 'NOR', color: '#ff7000', speed: 1.02, offset: 0.83 },
] as const

function formatMs(ms: number): string {
  if (ms <= 0) return '0:00.000'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const milli = Math.floor(ms % 1000)
  return `${m}:${String(s).padStart(2, '0')}.${String(milli).padStart(3, '0')}`
}

interface LimitSensor {
  id: string
  label: string
  side: 'L' | 'R'
  limit: boolean
}

export function CircuitSimulation() {
  const race = useRaceControl()
  const live = useLiveTelemetry(SIM_SETUP)
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLen, setPathLen] = useState(0)
  const [progress, setProgress] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [sideTab, setSideTab] = useState<SideTab>('course')

  // Accumulateur de progression : la voiture avance d'un delta de temps à
  // chaque frame, à vitesse réduite quand elle est hors des limites de piste.
  const progressRef = useRef(0)
  const lastTsRef = useRef(Date.now())
  const offTrackRef = useRef(false)
  const lapRef = useRef(LAP_FALLBACK_MS)

  // Longueur du tracé (pour positionner la voiture).
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength())
  }, [])

  // Boucle d'animation ~20 fps : on accumule la progression selon le temps
  // écoulé × la vitesse courante. Hors-piste → la voiture RALENTIT (facteur
  // OFFTRACK_SPEED) mais continue toujours de tourner, jamais bloquée.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      const dt = t - lastTsRef.current
      lastTsRef.current = t
      const speedFactor = offTrackRef.current ? OFFTRACK_SPEED : 1
      let p = progressRef.current + (dt / lapRef.current) * speedFactor
      p -= Math.floor(p) // garde p dans [0, 1)
      progressRef.current = p
      setProgress(p)
    }, 50)
    return () => clearInterval(id)
  }, [])

  // Échap quitte le plein écran.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // Durée de tour pour l'animation : temps de référence du circuit, puis
  // affiné par les tours réels mesurés (meilleur tour > dernier tour).
  const lapEstimate = useMemo(() => {
    if (race.bestMs) return race.bestMs
    if (race.laps[0]) return race.laps[0].ms
    return LAP_FALLBACK_MS
  }, [race.bestMs, race.laps])

  // Garde la durée de tour accessible à la boucle d'animation (qui s'exécute
  // hors du cycle de rendu React).
  useEffect(() => {
    lapRef.current = lapEstimate
  }, [lapEstimate])

  const now = Date.now()
  const running = race.currentLap > 0 && race.lapStartTs != null
  const elapsed = running ? now - (race.lapStartTs as number) : 0

  // Progression VISUELLE de la voiture : accumulateur calé sur l'horloge mais
  // pondéré par la vitesse (ralenti hors-piste). Indépendante du capteur de
  // ligne, donc la voiture tourne toujours sans jamais se bloquer. Le capteur
  // ne sert qu'au chrono / au comptage des tours, pas au déplacement.

  // Position de la voiture sur le tracé.
  const car = useMemo(() => {
    if (!pathRef.current || pathLen === 0) return { x: 120, y: 320 }
    const pt = pathRef.current.getPointAtLength(progress * pathLen)
    return { x: pt.x, y: pt.y }
  }, [progress, pathLen])

  // Voitures concurrentes (simulées) qui tournent en continu sur le tracé.
  const ghosts = useMemo(() => {
    const path = pathRef.current
    if (!path || pathLen === 0)
      return [] as Array<{ id: string; color: string; x: number; y: number; progress: number }>
    return GHOST_CARS.map((g) => {
      const p = (now / (lapEstimate * g.speed) + g.offset) % 1
      const pt = path.getPointAtLength(p * pathLen)
      return { id: g.id, color: g.color, x: pt.x, y: pt.y, progress: p }
    })
  }, [now, pathLen, lapEstimate])

  // Classement instantané (par avancement sur le tour), pilote inclus.
  const standings = useMemo(() => {
    const field = [
      { id: 'LEC', color: '#dc0000', progress, you: true },
      ...ghosts.map((g) => ({ id: g.id, color: g.color, progress: g.progress, you: false })),
    ]
    return field.sort((a, b) => b.progress - a.progress)
  }, [ghosts, progress])

  // Secteur courant (1 / 2 / 3).
  const sector = progress < 1 / 3 ? 1 : progress < 2 / 3 ? 2 : 3

  // Capteurs de limites de piste sous le châssis (simulés mais réalistes).
  const drift = Math.sin(progress * Math.PI * 2 * 3) * 0.55 + Math.sin(now / 700) * 0.45
  const limitSensors: LimitSensor[] = [
    { id: 'FL', label: 'Avant G.', side: 'L', limit: drift < -0.82 },
    { id: 'FR', label: 'Avant D.', side: 'R', limit: drift > 0.82 },
    { id: 'RL', label: 'Arrière G.', side: 'L', limit: drift < -0.9 },
    { id: 'RR', label: 'Arrière D.', side: 'R', limit: drift > 0.9 },
  ]
  const offTrack = limitSensors.some((s) => s.limit)

  // La boucle d'animation lit cet état pour ralentir la voiture hors-piste.
  useEffect(() => {
    offTrackRef.current = offTrack
  }, [offTrack])

  // Flash de la ligne au franchissement (< 600 ms).
  const lineFlash = race.lastCrossingTs != null && now - race.lastCrossingTs < 600

  const refl = race.sensor?.reflectivite ?? 0
  const reflPct = Math.min(100, Math.max(0, refl))

  // Contenu de l'onglet latéral actif.
  const sidePanel = (() => {
    switch (sideTab) {
      case 'course':
        return (
          <div className="flex flex-col gap-4">
            <div className="panel p-5 flex flex-col gap-2">
              <span className="label-mono">🏁 Tour en cours</span>
              <div className="flex items-baseline gap-3">
                <span className="value-mono text-6xl font-bold text-[#dc0000]">{race.currentLap}</span>
                <div className="flex flex-col">
                  <span className="value-mono text-2xl">{formatMs(elapsed)}</span>
                  <span className="label-mono text-[10px]">chrono live</span>
                </div>
              </div>
              {race.currentLap === 0 && (
                <p className="text-[13px] text-[#ffb800] leading-snug">
                  Passe le capteur sur la ligne blanche pour lancer le 1ᵉʳ tour.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="panel p-4 flex flex-col gap-1">
                <span className="label-mono">Dernier tour</span>
                <span className="value-mono text-xl text-[#f5f5f5]">
                  {race.laps[0] ? formatMs(race.laps[0].ms) : '—'}
                </span>
              </div>
              <div className="panel p-4 flex flex-col gap-1">
                <span className="label-mono">Meilleur tour</span>
                <span className="value-mono text-xl text-[#00ff41]">
                  {race.bestMs ? formatMs(race.bestMs) : '—'}
                </span>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-2.5">
                <span className="badge-live text-[#ffb800]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot" />
                  Classement piste
                </span>
                <span className="label-mono">{standings.length} voitures</span>
              </div>
              <div>
                {standings.map((c, i) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-[28px_14px_1fr_auto] items-center gap-2 border-b border-[#161616] px-4 py-1.5 text-[12px]"
                    style={{ background: c.you ? 'rgba(220,0,0,0.08)' : 'transparent' }}
                  >
                    <span className="value-mono text-[#8a8a8a]">P{i + 1}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    <span className={`value-mono ${c.you ? 'text-[#dc0000] font-bold' : 'text-[#f5f5f5]'}`}>
                      {c.id}
                      {c.you ? ' (vous)' : ''}
                    </span>
                    <span className="value-mono text-[#8a8a8a]">{(c.progress * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-2.5">
                <span className="badge-live">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
                  Historique des tours
                </span>
                <span className="label-mono">{race.laps.length}</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {race.laps.length === 0 ? (
                  <div className="px-4 py-4 label-mono text-[11px] text-[#8a8a8a]">Aucun tour bouclé.</div>
                ) : (
                  race.laps.map((l) => {
                    const isBest = race.bestMs != null && l.ms === race.bestMs
                    return (
                      <div
                        key={l.lap}
                        className="grid grid-cols-[60px_1fr_auto] items-center gap-2 border-b border-[#161616] px-4 py-2 text-[12px]"
                      >
                        <span className="value-mono text-[#8a8a8a]">T{l.lap}</span>
                        <span className={`value-mono ${isBest ? 'text-[#00ff41]' : 'text-[#f5f5f5]'}`}>
                          {formatMs(l.ms)}
                        </span>
                        {isBest && <span className="label-mono text-[9px] text-[#00ff41]">BEST</span>}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )
      case 'capteurs':
        return (
          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="badge-live text-[#ffb800]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot" />
                Capteur ligne (réel)
              </span>
              <span
                className={`label-mono px-2 py-0.5 border ${
                  lineFlash
                    ? 'text-[#00ff41] border-[#00ff41]/50 bg-[#00ff41]/10'
                    : 'text-[#8a8a8a] border-[#2a2a2a]'
                }`}
              >
                {lineFlash ? '● LIGNE' : '○ piste'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="value-mono text-4xl font-bold text-[#ffb800]">
                {race.sensor ? race.sensor.luminosite : '—'}
              </span>
              <span className="label-mono">lux · réfl {refl.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-[#1f1f1f] rounded-sm overflow-hidden">
              <div className="h-full bg-[#ffb800] transition-all" style={{ width: `${reflPct}%` }} />
            </div>

            <span className="label-mono mt-1">Capteurs sol · limites de piste</span>
            <div className="grid grid-cols-2 gap-2">
              {limitSensors.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border px-3 py-2 text-[12px]"
                  style={{
                    borderColor: s.limit ? 'rgba(220,0,0,0.5)' : '#222',
                    background: s.limit ? 'rgba(220,0,0,0.08)' : 'transparent',
                  }}
                >
                  <span className="label-mono">
                    {s.id} · {s.label}
                  </span>
                  <span
                    className="value-mono font-bold"
                    style={{ color: s.limit ? '#dc0000' : '#00ff41' }}
                  >
                    {s.limit ? 'LIMIT' : 'OK'}
                  </span>
                </div>
              ))}
            </div>
            <p className="label-mono text-[9px] text-[#6a6a6a]">
              Ligne = capteur réel · limites de piste = simulées sous le châssis.
            </p>
          </div>
        )
      case 'voiture':
        return (
          <div className="panel p-5 flex flex-col gap-4">
            <span className="badge-live">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] animate-pulse-dot" />
              Télémétrie voiture (simulée)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <SimTile label="Vitesse" value={Math.round(live.speed)} unit="km/h" color="#f5f5f5" />
              <SimTile label="Rapport" value={live.gear} unit="" color="#dc0000" />
              <SimTile label="Régime" value={Math.round(live.rpm)} unit="rpm" color="#ffb800" />
              <SimTile label="G latéral" value={live.latG.toFixed(1)} unit="g" color="#3b82f6" />
              <SimTile label="Temp. pneus" value={Math.round(live.tireTemp)} unit="°C" color="#ff7000" />
              <SimTile
                label="DRS"
                value={live.drs ? 'ON' : 'OFF'}
                unit=""
                color={live.drs ? '#00ff41' : '#8a8a8a'}
              />
            </div>
            <p className="label-mono text-[9px] text-[#6a6a6a]">
              Données générées pour la démo — seul le franchissement de ligne provient du capteur.
            </p>
          </div>
        )
      case 'controles':
        return (
          <div className="flex flex-col gap-4">
            <BuzzerControl />
            <LedControl />
          </div>
        )
    }
  })()

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[60] flex flex-col gap-3 overflow-hidden bg-[#0a0a0a] p-4'
          : 'flex flex-col gap-3 h-full'
      }
    >
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="badge-live text-[#00ff41]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
            Circuit · Temps réel
          </span>
          <span className="label-mono">
            Secteur S{sector} · {(progress * 100).toFixed(0)}%
          </span>
          {race.connected === false && (
            <span className="label-mono text-[#ffb800]">⚠ Capteur G2D non connecté</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="label-mono border border-[#2a2a2a] px-3 py-1 text-[#8a8a8a] transition-colors hover:border-[#00ff41] hover:text-[#00ff41]"
          title={fullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
        >
          {fullscreen ? '✕ Quitter' : '⛶ Plein écran'}
        </button>
      </div>

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_360px]">
        {/* ---- Tracé du circuit (zone principale) ---- */}
        <div className="panel panel-grid relative flex flex-col overflow-hidden">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 640 380"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full bg-[#050505]"
            >
              {/* zone de dégagement */}
              <path d={TRACK_D} fill="none" stroke="#141414" strokeWidth={34} strokeLinejoin="round" />
              {/* surface de piste */}
              <path
                ref={pathRef}
                d={TRACK_D}
                fill="none"
                stroke={offTrack ? '#3a0d0d' : '#262626'}
                strokeWidth={22}
                strokeLinejoin="round"
              />
              {/* axe central */}
              <path d={TRACK_D} fill="none" stroke="#3a3a3a" strokeWidth={1.5} strokeDasharray="6 10" />

              {/* ligne de départ / arrivée (damier) */}
              <g transform="translate(120 320)">
                {[0, 1, 2, 3].map((r) =>
                  [0, 1].map((c) => (
                    <rect
                      key={`${r}-${c}`}
                      x={-6 + c * 6}
                      y={-16 + r * 8}
                      width={6}
                      height={8}
                      fill={(r + c) % 2 === 0 ? '#f5f5f5' : '#0a0a0a'}
                    />
                  )),
                )}
                {lineFlash && <circle cx={0} cy={0} r={26} fill="none" stroke="#00ff41" strokeWidth={3} opacity={0.7} />}
              </g>

              {/* voitures concurrentes (simulées) */}
              {ghosts.map((g) => (
                <g key={g.id} transform={`translate(${g.x} ${g.y})`}>
                  <circle r={5} fill={g.color} opacity={0.9} />
                  <text x={8} y={3} fill={g.color} fontSize={9} className="value-mono">
                    {g.id}
                  </text>
                </g>
              ))}

              {/* voiture du pilote (capteur réel) */}
              <g transform={`translate(${car.x} ${car.y})`}>
                <circle r={11} fill="#dc0000" opacity={0.25} />
                <circle r={6} fill={offTrack ? '#ffb800' : '#dc0000'} stroke="#fff" strokeWidth={1.5} />
                <text x={9} y={3} fill="#fff" fontSize={9} className="value-mono">
                  LEC
                </text>
              </g>
            </svg>
          </div>
          <div className="border-t border-[#1f1f1f] px-5 py-2 flex justify-between label-mono text-[10px] shrink-0">
            <span className={offTrack ? 'text-[#dc0000]' : 'text-[#00ff41]'}>
              {offTrack ? '⚠️ LIMITES DE PISTE' : '✓ Dans les limites'}
            </span>
            <span>
              Vitesse simulée :{' '}
              {Math.round(offTrack ? live.speed * OFFTRACK_SPEED : live.speed)} km/h
            </span>
            <span className="text-[#00ff41]">G2D · 100 Hz</span>
          </div>
        </div>

        {/* ---- Onglets latéraux paramétrables ---- */}
        <aside className="flex flex-col min-h-0">
          <div className="grid grid-cols-4 gap-1 shrink-0">
            {SIDE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSideTab(t.id)}
                className={`label-mono border px-2 py-2 text-[11px] transition-colors ${
                  sideTab === t.id
                    ? 'border-[#dc0000] bg-[#dc0000]/10 text-[#dc0000]'
                    : 'border-[#2a2a2a] text-[#8a8a8a] hover:border-[#444]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1">{sidePanel}</div>
        </aside>
      </div>
    </div>
  )
}

function SimTile({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string | number
  unit: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-0.5 border border-[#222] px-3 py-2">
      <span className="label-mono">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="value-mono text-xl font-bold" style={{ color }}>
          {value}
        </span>
        {unit && <span className="label-mono text-[10px]">{unit}</span>}
      </div>
    </div>
  )
}
