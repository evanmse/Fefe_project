import type { LiveTelemetry } from './Dashboard'

/* ============================================================
   LidarMonitor.tsx — Monitoring temps réel des capteurs LiDAR
   Signal quality, health, frequency, latency
   ============================================================ */

interface SensorHealth {
  signalStrength: number
  latency: number
  frequency: number
  status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE'
}

function computeSensorHealth(live: LiveTelemetry): {
  front: SensorHealth
  rear: SensorHealth
} {
  // Simule la santé des capteurs basée sur les données de télémétrie
  const baseSignal = Math.max(0, 100 - Math.abs(live.rhFront - 22) * 2)
  const frontSignal = Math.max(40, baseSignal + (Math.random() - 0.5) * 20)
  const rearSignal = Math.max(40, baseSignal + (Math.random() - 0.5) * 20)

  const frontLatency = 8 + (Math.random() - 0.5) * 3
  const rearLatency = 9 + (Math.random() - 0.5) * 3

  const getFrontStatus = (): 'ACTIVE' | 'DEGRADED' | 'OFFLINE' => {
    if (frontSignal > 75) return 'ACTIVE'
    if (frontSignal > 40) return 'DEGRADED'
    return 'OFFLINE'
  }

  const getRearStatus = (): 'ACTIVE' | 'DEGRADED' | 'OFFLINE' => {
    if (rearSignal > 75) return 'ACTIVE'
    if (rearSignal > 40) return 'DEGRADED'
    return 'OFFLINE'
  }

  return {
    front: {
      signalStrength: frontSignal,
      latency: frontLatency,
      frequency: 100,
      status: getFrontStatus(),
    },
    rear: {
      signalStrength: rearSignal,
      latency: rearLatency,
      frequency: 100,
      status: getRearStatus(),
    },
  }
}

function HealthBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color =
    pct > 75 ? '#00ff41' : pct > 50 ? '#ffb800' : pct > 25 ? '#ff6a00' : '#dc0000'

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-sm bg-[#1f1f1f] overflow-hidden">
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="label-mono w-12 text-right text-sm" style={{ color }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

function SensorCard({
  label,
  position,
  health,
}: {
  label: string
  position: 'AV' | 'AR'
  health: SensorHealth
}) {
  const statusColors = {
    ACTIVE: { bg: '#00ff41', text: '#0a0a0a' },
    DEGRADED: { bg: '#ffb800', text: '#0a0a0a' },
    OFFLINE: { bg: '#dc0000', text: '#fff' },
  }

  const colors = statusColors[health.status]

  return (
    <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <span
          className="label-mono rounded-sm px-2 py-1 text-[11px]"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {health.status}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="label-mono mb-1">Signal (rssi)</div>
          <HealthBar value={health.signalStrength} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="label-mono text-[11px]">Latence</span>
            <div className="value-mono text-sm font-bold text-white">
              {health.latency.toFixed(1)} ms
            </div>
          </div>
          <div>
            <span className="label-mono text-[11px]">Hz</span>
            <div className="value-mono text-sm font-bold text-[#00ff41]">
              {health.frequency}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LidarMonitor({ live }: { live: LiveTelemetry }) {
  const health = computeSensorHealth(live)
  const overallHealth =
    (health.front.signalStrength + health.rear.signalStrength) / 2

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="badge-live">Réseau de capteurs LiDAR · santé</span>
          <h3 className="title-display text-lg mt-2">Monitoring capteurs</h3>
        </div>
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3">
          <span className="label-mono">Santé globale</span>
          <div className="value-mono text-2xl font-bold text-[#00ff41] mt-1">
            {overallHealth.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SensorCard label="Capteur LiDAR AV (avant)" position="AV" health={health.front} />
        <SensorCard label="Capteur LiDAR AR (arrière)" position="AR" health={health.rear} />
      </div>

      <div className="border-t border-[#1f1f1f] pt-3">
        <div className="label-mono mb-3">Statut global du réseau</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-sm bg-[#0d0d0d] px-3 py-2">
            <span className="label-mono">Connexion capteurs</span>
            <span
              className={`label-mono text-sm ${
                overallHealth > 75 ? 'text-[#00ff41]' : 'text-[#ffb800]'
              }`}
            >
              {overallHealth > 75 ? 'Stable' : 'Vigilance'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-sm bg-[#0d0d0d] px-3 py-2">
            <span className="label-mono">Synchronisation</span>
            <span className="label-mono text-sm text-[#00ff41]">Synchronisée</span>
          </div>
          <div className="flex items-center justify-between rounded-sm bg-[#0d0d0d] px-3 py-2">
            <span className="label-mono">Fréquence acquisition</span>
            <span className="label-mono text-sm text-white">200 Hz (100 Hz × 2 capteurs)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
