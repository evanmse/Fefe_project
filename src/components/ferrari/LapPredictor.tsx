import { useMemo } from 'react'
import type { SetupState, AeroResult } from '~/components/ferrari/Dashboard'
import { MetricRow, StatusPill } from '~/components/ferrari/atoms'

/* ============================================================
   LapPredictor.tsx — Prédiction de temps au tour
   Calcule l'impact estimé des réglages aéro actuels sur
   le temps au tour, basé sur le ratio portance/traînée (L/D).
   Utilise un modèle physique simplifié :
   - Temps de base : 78.5 s (circuit de référence)
   - Le delta dépend de l'efficacité aéro et de l'appui
   ============================================================ */

interface LapPredictorProps {
  /** Réglages actuels de suspension / garde au sol */
  setup: SetupState
  /** Résultats aéro calculés */
  aero: AeroResult
}

/** Temps de base du tour de référence (secondes) */
const BASELINE_LAP_TIME = 78.5

/** Efficacité aéro de référence (L/D cible) */
const BASELINE_EFFICIENCY = 3.2

/**
 * Calcule le temps au tour estimé et le delta par rapport
 * à la référence, en utilisant un modèle empirique :
 * - Meilleure efficacité → plus de vitesse en ligne droite
 * - Plus d'appui → plus de vitesse en courbe (mais traînée)
 */
function computeLapPrediction(aero: AeroResult) {
  // Facteur d'efficacité : mieux que la référence → gain de temps
  const effFactor = (aero.efficiency - BASELINE_EFFICIENCY) / BASELINE_EFFICIENCY

  // Facteur d'appui : plus d'appui aide dans les virages
  // mais la traînée associée pénalise les lignes droites
  const downforceRatio = aero.downforce / 1100
  const dragRatio = aero.drag / 500
  const aeroFactor = downforceRatio * 0.6 - dragRatio * 0.4

  // Pénalité si le statut est critique (risque de porpoising / décrochage)
  const statusPenalty = aero.status === 'CRITICAL' ? 0.8 : aero.status === 'SUBOPTIMAL' ? 0.15 : 0

  // Delta combiné (secondes)
  const delta = -(effFactor * 0.4) - (aeroFactor * 0.3) + statusPenalty

  // Temps estimé
  const estimated = BASELINE_LAP_TIME + delta

  return {
    estimated: Math.max(72, Math.min(90, estimated)),
    delta,
    baseline: BASELINE_LAP_TIME,
  }
}

/**
 * Affiche une carte de prédiction de temps au tour basée
 * sur les réglages aéro actuels.
 */
export default function LapPredictor({ setup, aero }: LapPredictorProps) {
  const prediction = useMemo(() => computeLapPrediction(aero), [aero])

  const deltaColor =
    prediction.delta < -0.3
      ? 'green'
      : prediction.delta < 0
        ? 'amber'
        : 'red'

  const deltaSign = prediction.delta <= 0 ? '' : '+'

  return (
    <div className="panel p-5 flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#ffb800]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffb800] animate-pulse-dot" />
          Prédiction temps au tour
        </span>
        <StatusPill status={aero.status} />
      </div>

      {/* Temps estimé */}
      <div className="flex flex-col items-center gap-1 py-3">
        <span className="label-mono text-[#8a8a8a]">Temps estimé</span>
        <span className="value-mono text-4xl font-bold text-white tabular-nums tracking-tight">
          {prediction.estimated.toFixed(2)}
          <span className="text-lg font-normal text-[#6a6a6a] ml-1">s</span>
        </span>
        <span
          className={`value-mono text-sm font-semibold ${
            deltaColor === 'green'
              ? 'text-[#00ff41]'
              : deltaColor === 'amber'
                ? 'text-[#ffb800]'
                : 'text-[#dc0000]'
          }`}
        >
          {deltaSign}
          {prediction.delta.toFixed(2)}s / {prediction.baseline.toFixed(1)}s ref
        </span>
      </div>

      {/* Détails des facteurs */}
      <div className="border-t border-[#1f1f1f] pt-3 flex flex-col gap-1">
        <MetricRow
          label="Efficacité L/D"
          value={aero.efficiency.toFixed(2)}
          accent={aero.efficiency >= BASELINE_EFFICIENCY ? 'green' : 'amber'}
        />
        <MetricRow
          label="Appui aéro"
          value={`${aero.downforce} kg`}
          accent={aero.downforce > 900 ? 'green' : aero.downforce > 700 ? 'amber' : 'red'}
        />
        <MetricRow
          label="Traînée"
          value={`${aero.drag} kg`}
          accent={aero.drag < 500 ? 'green' : aero.drag < 600 ? 'amber' : 'red'}
        />
        <MetricRow
          label="Garde au sol AV"
          value={`${setup.rhFront.toFixed(1)} mm`}
          accent={
            setup.rhFront < 14 ? 'red' : setup.rhFront > 45 ? 'amber' : 'green'
          }
        />
        <MetricRow
          label="Garde au sol AR"
          value={`${setup.rhRear.toFixed(1)} mm`}
          accent={
            setup.rhRear < 20 ? 'red' : setup.rhRear > 55 ? 'amber' : 'green'
          }
        />
      </div>
    </div>
  )
}
