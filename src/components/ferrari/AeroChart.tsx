import { useEffect, useRef } from 'react'

/* ============================================================
   AeroChart.tsx — Courbe d'appui aéro (downforce vs ride height)
   Portée depuis l'ancien tableau de bord vanilla JS.
   Affiche la relation non-linéaire entre la garde au sol
   et l'appui aérodynamique généré par l'effet de sol.
   ============================================================ */

interface AeroChartProps {
  setup: { rhFront: number; rhRear: number }
  aero: { downforce: number }
}

/**
 * Composant canvas affichant la courbe downforce / ride height.
 * - Fond sombre avec grille subtile
 * - Courbe rouge dégradée (effet de sol)
 * - Point vert indicateur de la position courante
 * - Animation en requestAnimationFrame pour le breathing du point
 */
export default function AeroChart({ setup, aero }: AeroChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Non-null captured for closure (narrowed by early returns above)
    const cvs: HTMLCanvasElement = canvas
    const cxt: CanvasRenderingContext2D = ctx

    let rafId: number

    /** Redimensionne le canvas pour le HiDPI */
    function resize() {
      const rect = cvs.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      cvs.width = rect.width * dpr
      cvs.height = rect.height * dpr
      cxt.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    /** Calcule un point (x, y) sur la courbe à partir d'un paramètre t ∈ [0, 1] */
    function curvePoint(t: number) {
      const pad = 40
      const w = cvs.getBoundingClientRect().width
      const h = cvs.getBoundingClientRect().height
      const x = pad + t * (w - 2 * pad)
      // Courbe quadratique modélisant l'effet de sol :
      // l'appui augmente quand la hauteur baisse (t petit),
      // puis décroche brutalement si trop bas.
      const y = h - pad - (Math.pow(t, 2) * 0.3 + 0.12) * (h - 2 * pad)
      return { x, y }
    }

    function draw() {
      resize()

      const rect = cvs.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const pad = 40

      // --- Effacement ---
      cxt.clearRect(0, 0, w, h)

      // --- Fond ---
      cxt.fillStyle = '#0a0a0a'
      cxt.fillRect(0, 0, w, h)

      // --- Grille horizontale ---
      for (let i = 0; i <= 4; i++) {
        const y = pad + i * (h - 2 * pad) / 4
        cxt.strokeStyle = 'rgba(255,255,255,0.07)'
        cxt.lineWidth = 1
        cxt.beginPath()
        cxt.moveTo(pad, y)
        cxt.lineTo(w - pad, y)
        cxt.stroke()

        // Étiquettes
        const labelVal = ((4 - i) / 4 * 1200).toFixed(0)
        cxt.fillStyle = 'rgba(255,255,255,0.25)'
        cxt.font = '10px monospace'
        cxt.textAlign = 'right'
        cxt.fillText(`${labelVal} kg`, pad - 6, y + 4)
      }

      // --- Légendes axes ---
      cxt.fillStyle = 'rgba(255,255,255,0.2)'
      cxt.font = '9px monospace'
      cxt.textAlign = 'center'
      cxt.fillText('Garde au sol (mm) →', w / 2, h - 6)
      cxt.save()
      cxt.translate(14, h / 2)
      cxt.rotate(-Math.PI / 2)
      cxt.fillText('Appui aéro (kg) →', 0, 0)
      cxt.restore()

      // --- Courbe de downforce ---
      cxt.beginPath()
      for (let i = 0; i <= 100; i++) {
        const t = i / 100
        const { x, y } = curvePoint(t)
        if (i === 0) cxt.moveTo(x, y)
        else cxt.lineTo(x, y)
      }
      cxt.strokeStyle = 'rgba(220,0,0,0.95)'
      cxt.lineWidth = 3
      cxt.stroke()

      // --- Remplissage sous la courbe ---
      cxt.lineTo(w - pad, h - pad)
      cxt.lineTo(pad, h - pad)
      cxt.closePath()
      const grad = cxt.createLinearGradient(0, pad, 0, h - pad)
      grad.addColorStop(0, 'rgba(220,0,0,0.25)')
      grad.addColorStop(1, 'rgba(220,0,0,0)')
      cxt.fillStyle = grad
      cxt.fill()

      // --- Point courant ---
      // Mappe la garde au sol moyenne sur [20, 160] mm → t ∈ [0, 1]
      const meanH = (setup.rhFront + setup.rhRear) / 2
      const t = Math.max(0, Math.min(1, (meanH - 20) / 140))
      const pt = curvePoint(t)

      // Pulse du point courant
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 400)

      cxt.fillStyle = '#00ff41'
      cxt.shadowColor = '#00ff41'
      cxt.shadowBlur = 12 * pulse
      cxt.beginPath()
      cxt.arc(pt.x, pt.y, 8 * pulse, 0, Math.PI * 2)
      cxt.fill()
      cxt.shadowBlur = 0

      // Cercle extérieur
      cxt.strokeStyle = 'rgba(0,255,65,0.4)'
      cxt.lineWidth = 2
      cxt.beginPath()
      cxt.arc(pt.x, pt.y, 14, 0, Math.PI * 2)
      cxt.stroke()

      // Valeur affichée près du point
      cxt.fillStyle = '#00ff41'
      cxt.font = 'bold 11px monospace'
      cxt.textAlign = 'left'
      cxt.fillText(
        `${aero.downforce} kg @ ${meanH.toFixed(1)} mm`,
        Math.min(pt.x + 18, w - 140),
        pt.y - 14
      )

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [setup, aero])

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#dc0000]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />
          Downforce / Ride Height
        </span>
        <span className="label-mono text-[#8a8a8a]">effet de sol</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-52 rounded-sm cursor-crosshair"
        style={{ display: 'block' }}
      />
    </div>
  )
}
