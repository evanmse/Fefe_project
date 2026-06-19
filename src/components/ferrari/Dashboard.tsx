import { StatusPill } from './atoms'

/* ============================================================
   Dashboard.tsx — cœur métier du cockpit ingénieur
   Types · computeAero() · TelemetryPanel · Car3DPanel
   ============================================================ */

export interface SetupState {
  /** Garde au sol avant (mm) */
  rhFront: number
  /** Garde au sol arrière (mm) */
  rhRear: number
  /** Raideur ressort avant (N/mm) */
  springFront: number
  /** Raideur ressort arrière (N/mm) */
  springRear: number
}

export interface AeroResult {
  /** Appui aéro total (kg) */
  downforce: number
  /** Traînée (kg) */
  drag: number
  /** Assiette / rake (deg) */
  pitch: number
  /** Efficacité aéro L/D */
  efficiency: number
  /** Répartition d'appui avant (%) */
  balance: number
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL'
}

export interface LiveTelemetry {
  speed: number
  rpm: number
  gear: number
  latG: number
  downforce: number
  rhFront: number
  rhRear: number
  tireTemp: number
  brakeTemp: number
  drs: boolean
}

const WHEELBASE_MM = 3600

/**
 * Modèle aéro simplifié du sol F1 (ground effect).
 * Cœur du dashboard : alimente sliders + KPIs.
 */
export function computeAero(s: SetupState): AeroResult {
  const meanH = (s.rhFront + s.rhRear) / 2
  const pitch = (Math.atan2(s.rhRear - s.rhFront, WHEELBASE_MM) * 180) / Math.PI

  // Effet de sol : l'appui grimpe quand la garde au sol baisse,
  // puis s'effondre si trop bas (décrochage / marsouinage).
  const groundEffect = Math.max(0, 1 - Math.abs(meanH - 28) / 40)
  const rakeBonus = Math.max(0, 1 - Math.abs(pitch - 1.0) / 2.5)
  const stiffness = (s.springFront + s.springRear) / 2

  let downforce = 1100 * groundEffect * (0.7 + 0.3 * rakeBonus)
  downforce *= 0.85 + 0.15 * Math.min(1, stiffness / 160)

  const drag = 240 + downforce * 0.28 + Math.abs(pitch) * 18
  const efficiency = downforce / drag
  const balance = 50 + (s.rhRear - s.rhFront) * 0.4

  let status: AeroResult['status'] = 'OPTIMAL'
  const tooLow = s.rhFront < 12 || s.rhRear < 18
  const badRake = pitch < -0.2 || pitch > 2.6
  if (tooLow) status = 'CRITICAL'
  else if (badRake || groundEffect < 0.55 || downforce < 720)
    status = 'SUBOPTIMAL'

  return {
    downforce: Math.round(downforce),
    drag: Math.round(drag),
    pitch: Number(pitch.toFixed(2)),
    efficiency: Number(efficiency.toFixed(2)),
    balance: Number(balance.toFixed(1)),
    status,
  }
}

/* ---------------------------------------------------------- */

function Bar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string
  value: number
  max: number
  unit: string
  color: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <span className="value-mono text-sm font-semibold" style={{ color }}>
          {value.toFixed(0)}
          <span className="label-mono ml-1">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#1f1f1f] overflow-hidden rounded-sm">
        <div
          className="h-full transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function TelemetryPanel({ live }: { live: LiveTelemetry }) {
  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
          Télémétrie live
        </span>
        <span className="label-mono">200 ms · CAN bus</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <span className="label-mono">Vitesse</span>
          <span className="value-mono text-3xl font-bold text-white">
            {live.speed.toFixed(0)}
          </span>
          <span className="label-mono">km/h</span>
        </div>
        <div className="flex flex-col">
          <span className="label-mono">Régime</span>
          <span className="value-mono text-3xl font-bold text-[#ffb800]">
            {(live.rpm / 1000).toFixed(1)}
          </span>
          <span className="label-mono">×1000 tr/min</span>
        </div>
        <div className="flex flex-col">
          <span className="label-mono">Rapport</span>
          <span className="value-mono text-3xl font-bold text-[#dc0000]">
            {live.gear}
          </span>
          <span className="label-mono">{live.drs ? 'DRS ouvert' : 'DRS fermé'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <Bar label="Appui aéro" value={live.downforce} max={1200} unit="kg" color="#dc0000" />
        <Bar label="Accél. latérale" value={live.latG} max={6} unit="G" color="#ffb800" />
        <Bar label="Garde au sol AV" value={live.rhFront} max={60} unit="mm" color="#00ff41" />
        <Bar label="Garde au sol AR" value={live.rhRear} max={60} unit="mm" color="#00ff41" />
        <Bar label="Temp. pneus" value={live.tireTemp} max={140} unit="°C" color="#ffb800" />
        <Bar label="Temp. freins" value={live.brakeTemp} max={900} unit="°C" color="#dc0000" />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */

/**
 * Car3DPanel — profil latéral pseudo-3D réagissant à l'assiette.
 * Visualise rake, garde au sol AV/AR et faisceaux Photosensible.
 */
export function Car3DPanel({
  setup,
  aero,
}: {
  setup: SetupState
  aero: AeroResult
}) {
  // Échelle visuelle : mm -> px (garde au sol entre ~10 et 60 mm)
  const scale = 2.2
  const groundY = 230
  const frontY = groundY - setup.rhFront * scale
  const rearY = groundY - setup.rhRear * scale

  return (
    <div className="panel panel-grid p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#dc0000]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />
          Plateforme aéro · vue profil
        </span>
        <StatusPill status={aero.status} />
      </div>

      <svg viewBox="0 0 520 270" className="w-full">
        {/* Faisceaux Photosensible avant / arrière */}
        <defs>
          <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00ff41" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#00ff41" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="carbody" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#dc0000" />
            <stop offset="100%" stopColor="#7a0000" />
          </linearGradient>
        </defs>

        {/* Piste */}
        <line x1="20" y1={groundY} x2="500" y2={groundY} stroke="#2a2a2a" strokeWidth="2" />
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1={24 + i * 20}
            y1={groundY + 4}
            x2={24 + i * 20}
            y2={groundY + 10}
            stroke="#1f1f1f"
            strokeWidth="2"
          />
        ))}

        {/* Faisceaux capteurs */}
        <polygon points={`140,${frontY} 110,${groundY} 170,${groundY}`} fill="url(#beam)" />
        <polygon points={`380,${rearY} 350,${groundY} 410,${groundY}`} fill="url(#beam)" />

        {/* Châssis (suit l'assiette) */}
        <polygon
          points={`120,${frontY} 400,${rearY} 430,${rearY - 26} 360,${rearY - 30} 300,${frontY - 48} 180,${frontY - 28} 120,${frontY}`}
          fill="url(#carbody)"
          stroke="#ff1e00"
          strokeWidth="1.5"
        />
        {/* Aileron arrière */}
        <rect x={415} y={rearY - 70} width="34" height="6" fill="#1a1a1a" stroke="#dc0000" />
        <line x1="432" y1={rearY - 64} x2="432" y2={rearY - 26} stroke="#444" strokeWidth="3" />
        {/* Aileron avant */}
        <rect x={96} y={frontY - 4} width="34" height="6" fill="#1a1a1a" stroke="#dc0000" />

        {/* Roues */}
        <circle cx="170" cy={groundY - 22} r="26" fill="#0d0d0d" stroke="#333" strokeWidth="4" />
        <circle cx="170" cy={groundY - 22} r="10" fill="#1a1a1a" stroke="#dc0000" />
        <circle cx="380" cy={groundY - 24} r="28" fill="#0d0d0d" stroke="#333" strokeWidth="4" />
        <circle cx="380" cy={groundY - 24} r="11" fill="#1a1a1a" stroke="#dc0000" />

        {/* Capteurs Photosensible (points verts) */}
        <circle cx="140" cy={frontY} r="4" fill="#00ff41" />
        <circle cx="380" cy={rearY} r="4" fill="#00ff41" />

        {/* Cotes garde au sol */}
        <text x="140" y={groundY - 4} fontSize="10" fill="#00ff41" textAnchor="middle" fontFamily="monospace">
          {setup.rhFront.toFixed(0)}mm
        </text>
        <text x="380" y={groundY - 4} fontSize="10" fill="#00ff41" textAnchor="middle" fontFamily="monospace">
          {setup.rhRear.toFixed(0)}mm
        </text>
      </svg>

      <div className="grid grid-cols-3 gap-3 border-t border-[#1f1f1f] pt-4">
        <div className="flex flex-col">
          <span className="label-mono">Assiette / Rake</span>
          <span className="value-mono text-lg font-bold text-white">
            {aero.pitch.toFixed(2)}°
          </span>
        </div>
        <div className="flex flex-col">
          <span className="label-mono">Efficacité L/D</span>
          <span className="value-mono text-lg font-bold text-[#00ff41]">
            {aero.efficiency.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="label-mono">Balance AV</span>
          <span className="value-mono text-lg font-bold text-[#ffb800]">
            {aero.balance.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
