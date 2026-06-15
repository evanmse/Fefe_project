import { useMemo } from 'react'
import type { LiveTelemetry } from '~/components/ferrari/Dashboard'
import { Kpi } from '~/components/ferrari/atoms'

/* ============================================================
   TyreDegradation.tsx — Simulation d'usure pneumatique
   Modélise la dégradation des pneus sur un relais, en
   fonction de la température, de l'accélération latérale
   et de la vitesse. Affiche pour chaque coin :
   - Usure courante (%)
   - Température (°C)
   - Pression (psi)
   ============================================================ */

interface TyreDegradationProps {
  /** Données de télémétrie live */
  live: LiveTelemetry
  /** Nombre de tours parcourus dans le relais */
  laps: number
}

interface TyreCorner {
  label: string
  wear: number       // 0-100 %
  temp: number       // °C
  pressure: number   // psi
  color: string
}

/**
 * Calcule l'état simulé des 4 pneus en fonction de la
 * télémétrie live et du nombre de tours.
 */
function simulateTyreWear(live: LiveTelemetry, laps: number): TyreCorner[] {
  const tempFactor = Math.max(0.5, Math.min(2.0, live.tireTemp / 100))
  const latGFactor = Math.max(0.5, Math.min(2.0, Math.abs(live.latG) / 2))
  const speedFactor = Math.max(0.5, Math.min(2.0, live.speed / 200))
  const baseWearPerLap = 1.2
  const frontFactor = tempFactor * (0.8 + 0.4 * latGFactor) * speedFactor
  const rearFactor = tempFactor * (0.9 + 0.6 * latGFactor) * speedFactor
  const seed = (laps * 7 + live.speed) % 100

  function calcWear(base: number, factor: number, offset: number): number {
    const variation = Math.sin(seed + offset) * 3
    return Math.min(100, Math.max(0, base * laps * factor + variation))
  }

  function calcTemp(base: number, offset: number): number {
    return Math.min(130, Math.max(60, base + Math.sin(seed + offset + 10) * 8))
  }

  function calcPressure(offset: number): number {
    return 20 + Math.sin(seed + offset + 20) * 1.5 + laps * 0.02
  }

  return [
    { label: 'FL', wear: calcWear(baseWearPerLap, frontFactor, 0), temp: calcTemp(live.tireTemp, 0), pressure: calcPressure(0), color: '#dc0000' },
    { label: 'FR', wear: calcWear(baseWearPerLap, frontFactor, 10), temp: calcTemp(live.tireTemp, 10), pressure: calcPressure(10), color: '#00ff41' },
    { label: 'RL', wear: calcWear(baseWearPerLap, rearFactor, 20), temp: calcTemp(live.tireTemp, 20), pressure: calcPressure(20), color: '#ffb800' },
    { label: 'RR', wear: calcWear(baseWearPerLap, rearFactor, 30), temp: calcTemp(live.tireTemp, 30), pressure: calcPressure(30), color: '#2e86ff' },
  ]
}

/**
 * Panneau de simulation d'usure pneumatique.
 * Affiche les 4 coins avec barre de wear, température et pression.
 */
export default function TyreDegradation({ live, laps }: TyreDegradationProps) {
  const corners = useMemo(() => simulateTyreWear(live, laps), [live, laps])

  const avgWear = corners.reduce((s, c) => s + c.wear, 0) / 4

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#ffb800]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot" />
          Usure pneumatiques
        </span>
        <span className="label-mono text-[#8a8a8a]">
          Tour {laps}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Kpi
          label="Usure moy."
          value={`${avgWear.toFixed(1)}%`}
          accent={avgWear > 70 ? 'red' : avgWear > 40 ? 'amber' : 'green'}
        />
        <Kpi
          label="Temp. piste"
          value={`${live.tireTemp.toFixed(0)}°C`}
          accent={live.tireTemp > 110 ? 'red' : live.tireTemp > 95 ? 'amber' : 'green'}
        />
        <Kpi
          label="G latéral"
          value={`${live.latG.toFixed(2)} G`}
          accent={Math.abs(live.latG) > 4 ? 'red' : Math.abs(live.latG) > 2.5 ? 'amber' : 'green'}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-1">
        {corners.map((corner) => (
          <TyreBar key={corner.label} corner={corner} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-[#1f1f1f] pt-3 text-[10px] text-[#5a5a5a] label-mono">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#00ff41]" /> Bon
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#ffb800]" /> Médium
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#dc0000]" /> Critique
        </span>
      </div>
    </div>
  )
}

function wearColor(wear: number): string {
  if (wear > 70) return '#dc0000'
  if (wear > 40) return '#ffb800'
  return '#00ff41'
}

function TyreBar({ corner }: { corner: TyreCorner }) {
  const wc = wearColor(corner.wear)
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="label-mono text-sm font-bold" style={{ color: corner.color }}>
        {corner.label}
      </span>
      <div className="relative h-28 w-5 rounded-full bg-[#1f1f1f] overflow-hidden">
        <div
          className="absolute bottom-0 w-full transition-all duration-500 ease-out rounded-full"
          style={{
            height: `${Math.min(100, corner.wear)}%`,
            backgroundColor: wc,
            boxShadow: `0 0 6px ${wc}44`,
          }}
        />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="value-mono text-sm font-bold" style={{ color: wc }}>
          {corner.wear.toFixed(1)}%
        </span>
        <span className="label-mono text-[10px] text-[#8a8a8a]">
          {corner.temp.toFixed(0)}°C
        </span>
        <span className="label-mono text-[10px] text-[#6a6a6a]">
          {corner.pressure.toFixed(1)} psi
        </span>
      </div>
    </div>
  )
}
