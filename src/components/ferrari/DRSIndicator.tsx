import { useMemo } from 'react'

/* ============================================================
   DRSIndicator.tsx — Indicateur de zones DRS
   Affiche l'état du DRS (Drag Reduction System) sous forme
   visuelle animée. Basé sur la vitesse et l'état du DRS.
   États :
   - INACTIVE  → DRS fermé, pas dans une zone
   - ARMED     → Zone de détection, prêt à activer
   - ACTIVATED → Aileron ouvert, gain de vitesse
   ============================================================ */

interface DRSIndicatorProps {
  /** État DRS (true = activé/ouvert) */
  drs: boolean
  /** Vitesse actuelle en km/h */
  speed: number
}

type DRSStatus = 'INACTIVE' | 'ARMED' | 'ACTIVATED'

/**
 * Détermine le statut DRS en fonction de l'état et de la vitesse.
 * - DRS activé → ACTIVATED
 * - Vitesse > 130 km/h et DRS fermé mais disponible → ARMED
 * - Sinon → INACTIVE
 */
function getDRSStatus(drs: boolean, speed: number): DRSStatus {
  if (drs) return 'ACTIVATED'
  if (speed > 130) return 'ARMED'
  return 'INACTIVE'
}

interface StatusConfig {
  label: string
  color: string
  bg: string
  border: string
  pulse: boolean
}

const STATUS_CONFIG: Record<DRSStatus, StatusConfig> = {
  INACTIVE: {
    label: 'DRS INACTIF',
    color: '#dc0000',
    bg: 'bg-[#dc0000]/10',
    border: 'border-[#dc0000]/30',
    pulse: false,
  },
  ARMED: {
    label: 'DRS ARMÉ',
    color: '#ffb800',
    bg: 'bg-[#ffb800]/10',
    border: 'border-[#ffb800]/40',
    pulse: true,
  },
  ACTIVATED: {
    label: 'DRS OUVERT',
    color: '#00ff41',
    bg: 'bg-[#00ff41]/10',
    border: 'border-[#00ff41]/40',
    pulse: true,
  },
}

/**
 * Indicateur visuel des zones DRS.
 * Affiche un panneau avec le statut, la vitesse et une animation
 * d'aileron mobile.
 */
export default function DRSIndicator({ drs, speed }: DRSIndicatorProps) {
  const status = useMemo(() => getDRSStatus(drs, speed), [drs, speed])
  const cfg = STATUS_CONFIG[status]

  // Angle d'ouverture de l'aileron (0° fermé, 45° ouverte)
  const wingAngle = drs ? 45 : 0
  // Gain de vitesse estimé (km/h)
  const speedGain = drs ? Math.min(15, speed * 0.06) : 0

  return (
    <div className="panel p-5 flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="badge-live" style={{ color: cfg.color }}>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.pulse ? 'animate-pulse-dot' : ''}`}
            style={{ backgroundColor: cfg.color }}
          />
          DRS
        </span>
        <span className="label-mono text-[#8a8a8a]">{speed.toFixed(0)} km/h</span>
      </div>

      {/* Statut principal */}
      <div
        className={`flex items-center justify-center gap-3 border rounded-sm py-4 px-3 transition-all duration-300 ${cfg.bg} ${cfg.border}`}
      >
        {/* Aileron arrière animé */}
        <svg
          width="48"
          height="32"
          viewBox="0 0 48 32"
          className="overflow-visible"
          aria-hidden="true"
        >
          {/* Support central */}
          <line x1="24" y1="28" x2="24" y2="4" stroke="#444" strokeWidth="2" />
          {/* Aile supérieure (mobile) */}
          <g
            style={{
              transformOrigin: '24px 8px',
              transform: `rotate(${-wingAngle}deg)`,
              transition: 'transform 0.3s ease-out',
            }}
          >
            <rect x="6" y="4" width="36" height="5" rx="1" fill={cfg.color} />
          </g>
          {/* Aile inférieure (fixe) */}
          <rect x="8" y="14" width="32" height="4" rx="1" fill="#333" />
          {/* Gap ouvert si DRS actif */}
          {drs && (
            <text x="24" y="29" textAnchor="middle" fill="#00ff41" fontSize="6" fontFamily="monospace">
              GAP
            </text>
          )}
        </svg>

        <div className="flex flex-col items-start">
          <span
            className="value-mono text-lg font-bold tracking-wider"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
          {drs && (
            <span className="label-mono text-[11px] text-[#00ff41]">
              +{speedGain.toFixed(1)} km/h gain
            </span>
          )}
          {!drs && speed > 130 && (
            <span className="label-mono text-[11px] text-[#ffb800]">
              Prêt à activer
            </span>
          )}
        </div>
      </div>

      {/* Zones de détection / activation */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { zone: 'Détection', active: status === 'ARMED' || status === 'ACTIVATED', color: '#ffb800' },
          { zone: 'Activation', active: status === 'ACTIVATED', color: '#00ff41' },
          { zone: 'Gain', active: status === 'ACTIVATED', color: '#00ff41' },
        ] as const).map((item) => (
          <div
            key={item.zone}
            className={`flex flex-col items-center gap-1 rounded-sm py-2 px-1 transition-all duration-300 ${
              item.active
                ? 'border opacity-100'
                : 'border border-[#1f1f1f] opacity-40'
            }`}
            style={{
              borderColor: item.active ? `${item.color}44` : undefined,
              backgroundColor: item.active ? `${item.color}08` : undefined,
            }}
          >
            <span
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                item.active ? 'animate-pulse-dot' : ''
              }`}
              style={{ backgroundColor: item.active ? item.color : '#3a3a3a' }}
            />
            <span className="label-mono text-[10px] text-[#8a8a8a]">
              {item.zone}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
