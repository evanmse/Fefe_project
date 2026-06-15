import { useEffect, useRef } from 'react'
import type { SetupState } from '~/components/ferrari/Dashboard'

/* ============================================================
   FuelSimulator.tsx — Fuel load effect on ride height over a stint
   Simulates 80kg start fuel burning at 2.5kg/lap.
   Shows: current fuel, estimated ride height gain, lap counter,
   plus a canvas-based fuel-level bar that decreases with each lap.
   ============================================================ */

const START_FUEL_KG = 80
const BURN_PER_LAP_KG = 2.5
const RIDE_HEIGHT_GAIN_PER_KG = 0.12 // mm per kg of fuel burned

interface FuelSimulatorProps {
  setup: SetupState
  laps: number
}

export default function FuelSimulator({ setup, laps }: FuelSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentFuel = Math.max(0, START_FUEL_KG - BURN_PER_LAP_KG * laps)
  const fuelBurned = START_FUEL_KG - currentFuel
  const rideHeightGain = fuelBurned * RIDE_HEIGHT_GAIN_PER_KG
  const fuelPct = (currentFuel / START_FUEL_KG) * 100

  // Draw the fuel bar on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    // Clear
    ctx.clearRect(0, 0, w, h)

    // Background track
    ctx.fillStyle = '#1f1f1f'
    ctx.fillRect(0, 0, w, h)

    // Fuel level (bottom-up bar)
    const levelH = (currentFuel / START_FUEL_KG) * h
    const gradient = ctx.createLinearGradient(0, h - levelH, 0, h)
    gradient.addColorStop(0, '#ffb800')
    gradient.addColorStop(1, '#dc0000')
    ctx.fillStyle = gradient
    ctx.fillRect(0, h - levelH, w, levelH)

    // Grid lines every 20kg
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let kg = 20; kg < START_FUEL_KG; kg += 20) {
      const y = h - (kg / START_FUEL_KG) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Lap markers on the bar
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    const maxLaps = Math.floor(START_FUEL_KG / BURN_PER_LAP_KG)
    for (let lap = 1; lap <= maxLaps; lap++) {
      const fuelAtLap = START_FUEL_KG - BURN_PER_LAP_KG * lap
      if (fuelAtLap <= 0) continue
      const y = h - (fuelAtLap / START_FUEL_KG) * h
      ctx.fillRect(w / 2 - 8, y - 0.5, 16, 1)
      if (lap % 5 === 0) {
        ctx.fillText(`L${lap}`, w / 2, y - 4)
      }
    }

    // Current fuel label overlay
    ctx.fillStyle = '#f5f5f5'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${currentFuel.toFixed(0)}kg`, w / 2, h / 2)
  }, [currentFuel])

  // Color coding for fuel level
  const fuelColor =
    fuelPct > 50 ? '#00ff41' : fuelPct > 20 ? '#ffb800' : '#dc0000'

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#ffb800]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot" />
          Simulation carburant
        </span>
        <span className="label-mono text-[#8a8a8a]">
          Tour {laps}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-3 flex flex-col">
          <span className="label-mono">Carburant</span>
          <span
            className="value-mono text-2xl font-bold mt-1"
            style={{ color: fuelColor }}
          >
            {currentFuel.toFixed(1)}
            <span className="label-mono text-sm ml-1">kg</span>
          </span>
        </div>
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-3 flex flex-col">
          <span className="label-mono">Gain hauteur</span>
          <span className="value-mono text-2xl font-bold mt-1 text-[#00ff41]">
            +{rideHeightGain.toFixed(1)}
            <span className="label-mono text-sm ml-1">mm</span>
          </span>
        </div>
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-3 flex flex-col">
          <span className="label-mono">Brûlé / tour</span>
          <span className="value-mono text-2xl font-bold mt-1 text-[#ffb800]">
            {BURN_PER_LAP_KG.toFixed(1)}
            <span className="label-mono text-sm ml-1">kg</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label-mono">Réservoir</span>
          <span className="label-mono">
            {currentFuel.toFixed(0)} / {START_FUEL_KG} kg
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={120}
          height={240}
          className="w-full h-48 rounded-sm border border-[#1f1f1f]"
        />
      </div>

      <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-3 text-[10px] text-[#5a5a5a] label-mono">
        <span>
          Garde au sol AV : {setup.rhFront.toFixed(0)} mm
        </span>
        <span>
          Garde au sol AR : {setup.rhRear.toFixed(0)} mm
        </span>
        <span>
          Gain total estimé : +{rideHeightGain.toFixed(1)} mm
        </span>
      </div>
    </div>
  )
}
