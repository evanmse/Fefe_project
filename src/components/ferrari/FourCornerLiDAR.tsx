import { useEffect, useRef } from 'react'
import type { LiveTelemetry, SetupState } from '~/components/ferrari/Dashboard'

/* ============================================================
   FourCornerLiDAR.tsx — Affichage 4 coins des capteurs LiDAR
   Représentation canvas des 4 capteurs de hauteur de caisse
   (FL / FR / RL / RR) avec barres de niveau et couleurs
   d'alerte. Porté depuis l'ancien tableau de bord vanilla JS.
   ============================================================ */

interface FourCornerLiDARProps {
  live: LiveTelemetry
  setup: SetupState
}

interface CornerSensor {
  label: string
  color: string
  offset: number
  baseValue: number
  maxValue: number
}

const SENSORS: CornerSensor[] = [
  { label: 'FL', color: '#dc0000', offset: 0.15, baseValue: 0, maxValue: 60 },
  { label: 'FR', color: '#00ff41', offset: 0.35, baseValue: 0, maxValue: 60 },
  { label: 'RL', color: '#ffb800', offset: 0.65, baseValue: 0, maxValue: 60 },
  { label: 'RR', color: '#2e86ff', offset: 0.85, baseValue: 0, maxValue: 60 },
]

function heightColor(mm: number): string {
  if (mm < 14) return '#dc0000'
  if (mm < 20) return '#ffb800'
  if (mm > 50) return '#ffb800'
  return '#00ff41'
}

/**
 * Composant canvas qui dessine 4 barres verticales représentant
 * les capteurs LiDAR aux 4 coins de la voiture.
 */
export default function FourCornerLiDAR({ live, setup }: FourCornerLiDARProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cvs: HTMLCanvasElement = canvas
    const cxt: CanvasRenderingContext2D = ctx

    let rafId: number

    function resize() {
      const rect = cvs.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      cvs.width = rect.width * dpr
      cvs.height = rect.height * dpr
      cxt.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw() {
      resize()
      const rect = cvs.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      cxt.clearRect(0, 0, w, h)
      cxt.fillStyle = '#0a0a0a'
      cxt.fillRect(0, 0, w, h)

      const padX = 10
      const padY = 36
      const barWidth = Math.max(14, (w - 2 * padX) / 6)
      const barMaxH = h - padY - 20

      const noise = (seed: number) => (Math.sin(Date.now() / 300 + seed) * 0.8)

      SENSORS.forEach((sensor, i) => {
        const xCenter = padX + sensor.offset * (w - 2 * padX)
        const xLeft = xCenter - barWidth / 2

        const base = i < 2 ? setup.rhFront : setup.rhRear
        const measured = Math.max(0, base + noise(i * 10))
        const hc = heightColor(measured)
        const barH = Math.min(barMaxH, (measured / sensor.maxValue) * barMaxH)

        // Fond de barre
        cxt.fillStyle = '#1a1a1a'
        cxt.fillRect(xLeft, padY, barWidth, barMaxH)

        // Barre de valeur colorée
        const yBar = padY + (barMaxH - barH)
        cxt.fillStyle = hc
        cxt.shadowColor = hc
        cxt.shadowBlur = 8
        cxt.fillRect(xLeft, yBar, barWidth, barH)
        cxt.shadowBlur = 0

        // Faisceaux laser
        for (let j = 0; j < 8; j++) {
          const alpha = 0.08 + 0.06 * Math.sin(Date.now() / 250 + j * 0.6 + i)
          cxt.strokeStyle = `rgba(0,255,65,${alpha})`
          cxt.lineWidth = 1
          cxt.beginPath()
          const xBeam = xCenter + Math.sin(j) * 6
          cxt.moveTo(xBeam, yBar + 2)
          cxt.lineTo(xBeam + 60 + Math.sin(Date.now() / 300 + j) * 20, padY + barMaxH + 6 + j * 2)
          cxt.stroke()
        }

        // Étiquette du capteur
        cxt.fillStyle = sensor.color
        cxt.font = 'bold 11px monospace'
        cxt.textAlign = 'center'
        cxt.fillText(sensor.label, xCenter, padY - 8)

        // Valeur mesurée
        cxt.fillStyle = hc
        cxt.font = 'bold 12px monospace'
        cxt.fillText(`${measured.toFixed(1)} mm`, xCenter, padY + barMaxH + 14)

        // Seuils critiques (lignes horizontales)
        const warnY = padY + (barMaxH - (20 / sensor.maxValue) * barMaxH)
        const critY = padY + (barMaxH - (14 / sensor.maxValue) * barMaxH)

        cxt.strokeStyle = 'rgba(255,184,0,0.3)'
        cxt.lineWidth = 1
        cxt.setLineDash([3, 3])
        cxt.beginPath()
        cxt.moveTo(xLeft - 4, warnY)
        cxt.lineTo(xLeft + barWidth + 4, warnY)
        cxt.stroke()

        cxt.strokeStyle = 'rgba(220,0,0,0.3)'
        cxt.beginPath()
        cxt.moveTo(xLeft - 4, critY)
        cxt.lineTo(xLeft + barWidth + 4, critY)
        cxt.stroke()
        cxt.setLineDash([])
      })

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [live, setup])

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#00ff41]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
          LiDAR 4 coins
        </span>
        <span className="label-mono text-[#8a8a8a]">±0.3 mm précision</span>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-52 rounded-sm"
        style={{ display: 'block' }}
      />

      <div className="flex items-center justify-center gap-4 text-[10px] text-[#5a5a5a] label-mono">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#00ff41]" /> Optimal
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#ffb800]" /> Limite
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#dc0000]" /> Critique
        </span>
        <span className="flex items-center gap-1 ml-2">
          <span className="h-px w-4 border-t border-dashed border-[#ffb800]" /> 20mm
        </span>
        <span className="flex items-center gap-1">
          <span className="h-px w-4 border-t border-dashed border-[#dc0000]" /> 14mm
        </span>
      </div>
    </div>
  )
}
