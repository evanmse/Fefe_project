import { useEffect, useRef, useState } from 'react'

/* ============================================================
   Simulators.tsx — EngineSim · DriftSim · LidarRawSim · GForceSim
   ============================================================ */

function SimFrame({
  title,
  tag,
  children,
}: {
  title: string
  tag: string
  children: React.ReactNode
}) {
  return (
    <div className="panel panel-grid flex flex-col">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
        <h4 className="title-display text-sm">{title}</h4>
        <span className="label-mono text-[#dc0000]">{tag}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* -------------------- EngineSim -------------------- */
export function EngineSim() {
  const [throttle, setThrottle] = useState(60)
  const [rpm, setRpm] = useState(8000)

  useEffect(() => {
    const id = setInterval(() => {
      setRpm((prev) => {
        const target = 4000 + (throttle / 100) * 11000
        return prev + (target - prev) * 0.18 + (Math.random() - 0.5) * 200
      })
    }, 120)
    return () => clearInterval(id)
  }, [throttle])

  const power = Math.round((rpm / 15000) * 1000 * (0.4 + throttle / 160))
  const pct = Math.min(100, (rpm / 15000) * 100)

  return (
    <SimFrame title="Groupe propulseur" tag="POWER UNIT">
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <span className="label-mono">Régime</span>
            <div className="value-mono text-3xl font-bold text-[#ffb800]">
              {(rpm / 1000).toFixed(1)}k
            </div>
          </div>
          <div className="text-right">
            <span className="label-mono">Puissance</span>
            <div className="value-mono text-3xl font-bold text-[#dc0000]">
              {power} ch
            </div>
          </div>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-sm bg-[#1f1f1f]">
          <div
            className="h-full transition-[width] duration-100"
            style={{
              width: `${pct}%`,
              background:
                pct > 80
                  ? '#dc0000'
                  : pct > 55
                    ? '#ffb800'
                    : '#00ff41',
            }}
          />
          <div className="absolute right-[8%] top-0 h-full w-px bg-[#dc0000]" />
        </div>

        <label className="flex flex-col gap-1">
          <span className="label-mono">Accélérateur · {throttle}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={throttle}
            onChange={(e) => setThrottle(Number(e.target.value))}
            className="slider-red"
          />
        </label>
      </div>
    </SimFrame>
  )
}

/* -------------------- DriftSim -------------------- */
export function DriftSim() {
  const [slip, setSlip] = useState(8)
  const angle = useRef(0)
  const [, force] = useState(0)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      angle.current += slip * 0.04
      force((n) => (n + 1) % 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [slip])

  return (
    <SimFrame title="Dérive arrière" tag="SLIP ANGLE">
      <div className="flex flex-col gap-4">
        <div className="relative mx-auto h-40 w-40">
          <div className="absolute inset-0 rounded-full border border-[#1f1f1f]" />
          <div className="absolute inset-6 rounded-full border border-[#1f1f1f]" />
          <div
            className="absolute left-1/2 top-1/2 h-16 w-7 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-gradient-to-b from-[#dc0000] to-[#7a0000]"
            style={{ transform: `translate(-50%,-50%) rotate(${slip}deg)` }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-px w-20 origin-left bg-[#00ff41]/60"
            style={{ transform: `rotate(${angle.current % 360}deg)` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="label-mono">Angle de glisse</span>
          <span className="value-mono text-lg font-bold text-[#ffb800]">
            {slip.toFixed(0)}°
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={35}
          value={slip}
          onChange={(e) => setSlip(Number(e.target.value))}
          className="slider-red"
        />
      </div>
    </SimFrame>
  )
}

/* -------------------- LidarRawSim -------------------- */
export function LidarRawSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let phase = 0

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = 'rgba(10,10,10,0.35)'
      ctx.fillRect(0, 0, w, h)

      phase += 0.05
      // ligne de balayage
      const sweepX = (phase * 60) % w
      ctx.strokeStyle = 'rgba(0,255,65,0.25)'
      ctx.beginPath()
      ctx.moveTo(sweepX, 0)
      ctx.lineTo(sweepX, h)
      ctx.stroke()

      // nuage de points (surface de la piste)
      for (let i = 0; i < 6; i++) {
        const x = (sweepX + i * 3) % w
        const surface =
          h * 0.7 +
          Math.sin(x * 0.05 + phase) * 12 +
          Math.sin(x * 0.13) * 6 +
          (Math.random() - 0.5) * 4
        ctx.fillStyle = '#00ff41'
        ctx.fillRect(x, surface, 2, 2)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <SimFrame title="Scan Photosensible brut" tag="RAW POINTS">
      <div className="flex flex-col gap-3">
        <canvas
          ref={canvasRef}
          width={320}
          height={150}
          className="w-full rounded-sm border border-[#1f1f1f] bg-[#080808]"
        />
        <div className="flex items-center justify-between">
          <span className="label-mono">Fréquence · 100 Hz</span>
          <span className="badge-live">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
            Acquisition
          </span>
        </div>
      </div>
    </SimFrame>
  )
}

/* -------------------- GForceSim -------------------- */
export function GForceSim() {
  const [g, setG] = useState({ x: 0, y: 0 })
  const peak = useRef(0)

  useEffect(() => {
    let t = 0
    const id = setInterval(() => {
      t += 0.2
      const x = Math.sin(t * 0.9) * 3.8 + (Math.random() - 0.5) * 0.4
      const y = Math.cos(t * 0.6) * 2.6 + (Math.random() - 0.5) * 0.4
      const mag = Math.hypot(x, y)
      if (mag > peak.current) peak.current = mag
      setG({ x, y })
    }, 200)
    return () => clearInterval(id)
  }, [])

  const cx = 80 + g.x * 16
  const cy = 80 - g.y * 16

  return (
    <SimFrame title="Charges G" tag="G-FORCE">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0">
          <circle cx="80" cy="80" r="70" fill="none" stroke="#1f1f1f" />
          <circle cx="80" cy="80" r="46" fill="none" stroke="#1f1f1f" />
          <circle cx="80" cy="80" r="23" fill="none" stroke="#1f1f1f" />
          <line x1="80" y1="6" x2="80" y2="154" stroke="#1a1a1a" />
          <line x1="6" y1="80" x2="154" y2="80" stroke="#1a1a1a" />
          <line x1="80" y1="80" x2={cx} y2={cy} stroke="#dc0000" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="6" fill="#dc0000" />
        </svg>
        <div className="flex flex-col gap-2">
          <div>
            <span className="label-mono">Latérale</span>
            <div className="value-mono text-xl font-bold text-[#ffb800]">
              {g.x.toFixed(1)} G
            </div>
          </div>
          <div>
            <span className="label-mono">Longitudinale</span>
            <div className="value-mono text-xl font-bold text-[#00ff41]">
              {g.y.toFixed(1)} G
            </div>
          </div>
          <div>
            <span className="label-mono">Pic</span>
            <div className="value-mono text-xl font-bold text-[#dc0000]">
              {peak.current.toFixed(1)} G
            </div>
          </div>
        </div>
      </div>
    </SimFrame>
  )
}

export function SimulatorsGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <EngineSim />
      <DriftSim />
      <LidarRawSim />
      <GForceSim />
    </div>
  )
}
