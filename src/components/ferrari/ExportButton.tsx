import { useCallback } from 'react'
import type { LiveTelemetry } from '~/components/ferrari/Dashboard'

/* ============================================================
   ExportButton.tsx — Export CSV des données de télémétrie
   Génère et télécharge un fichier CSV contenant l'instantané
   courant des données LiveTelemetry.
   Nom du fichier : lidar-telemetry-{timestamp}.csv
   ============================================================ */

interface ExportButtonProps {
  /** Données de télémétrie live à exporter */
  live: LiveTelemetry
}

/**
 * Bouton d'export CSV. Au clic, sérialise les données de
 * télémétrie au format CSV et déclenche le téléchargement.
 */
export default function ExportButton({ live }: ExportButtonProps) {
  const handleExport = useCallback(() => {
    // Construire les lignes du CSV
    const headers = [
      'timestamp',
      'speed_kmh',
      'rpm',
      'gear',
      'latG',
      'downforce_kg',
      'rhFront_mm',
      'rhRear_mm',
      'tireTemp_c',
      'brakeTemp_c',
      'drs',
    ]

    const now = new Date()
    const timestamp = now.toISOString()

    const values = [
      timestamp,
      live.speed.toFixed(2),
      live.rpm.toFixed(0),
      live.gear.toFixed(0),
      live.latG.toFixed(3),
      live.downforce.toFixed(2),
      live.rhFront.toFixed(2),
      live.rhRear.toFixed(2),
      live.tireTemp.toFixed(2),
      live.brakeTemp.toFixed(2),
      live.drs ? '1' : '0',
    ]

    const csvContent = [headers.join(','), values.join(',')].join('\n')

    // Générer le nom de fichier avec timestamp
    const fileDate = now
      .toISOString()
      .replace(/[:-]/g, '')
      .replace(/\.\d+Z/, '')
    const filename = `lidar-telemetry-${fileDate}.csv`

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [live])

  return (
    <button
      onClick={handleExport}
      className="
        inline-flex items-center gap-2
        border border-[#dc0000]/40 bg-[#dc0000]/10
        px-4 py-2 text-sm font-semibold
        text-[#dc0000] label-mono
        transition-all duration-200
        hover:bg-[#dc0000]/20 hover:border-[#dc0000]/60
        active:scale-95
        cursor-pointer
      "
      title="Exporter les données de télémétrie au format CSV"
    >
      {/* Icône CSV simple en SVG */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export CSV
    </button>
  )
}
