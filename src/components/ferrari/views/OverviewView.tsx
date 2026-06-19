import { InfoCard, Kpi, MetricRow, SectionHeader } from '../atoms'
import type { LiveTelemetry } from '../Dashboard'
import pitlane from '~/assets/dashboard-car-topdown.png'

/* ============================================================
   OverviewView — pourquoi le Photosensible + télémétrie résumée.
   ============================================================ */

export function OverviewView({ live }: { live: LiveTelemetry }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="OVERVIEW"
        title="Pourquoi mesurer la garde au sol au Photosensible ?"
        subtitle="La performance aérodynamique d'une F1 moderne dépend de quelques millimètres de garde au sol. Le Photosensible mesure cette hauteur en temps réel, sans contact, à 100 Hz."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 panel overflow-hidden">
          <img
            src={pitlane}
            alt="Vue plongée monoplace"
            className="h-56 w-full object-cover opacity-85"
          />
          <div className="grid grid-cols-2 gap-px bg-[#1f1f1f] sm:grid-cols-4">
            <Stat label="Fréquence" value="100" unit="Hz" />
            <Stat label="Résolution" value="0.1" unit="mm" />
            <Stat label="Capteurs" value="2" unit="Photosensible" />
            <Stat label="Latence" value="<5" unit="ms" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <InfoCard eyebrow="EFFET DE SOL" title="Millimètres décisifs">
            Abaisser la voiture de 5 mm peut ajouter plus de 100 kg d'appui — mais
            trop bas, le plancher décroche et la planche s'use. Le Photosensible garde la
            fenêtre optimale sous contrôle.
          </InfoCard>
          <div className="panel p-5">
            <span className="label-mono">Télémétrie résumée</span>
            <div className="mt-2">
              <MetricRow label="Vitesse" value={live.speed.toFixed(0)} unit="km/h" />
              <MetricRow label="Garde au sol AV" value={live.rhFront.toFixed(1)} unit="mm" accent="green" />
              <MetricRow label="Garde au sol AR" value={live.rhRear.toFixed(1)} unit="mm" accent="green" />
              <MetricRow label="Appui aéro" value={live.downforce.toFixed(0)} unit="kg" accent="red" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Kpi label="Régime moteur" value={(live.rpm / 1000).toFixed(1)} unit="k tr/min" accent="amber" />
        <Kpi label="Accél. latérale" value={live.latG.toFixed(1)} unit="G" accent="amber" />
        <Kpi label="Temp. pneus" value={live.tireTemp.toFixed(0)} unit="°C" accent="red" />
      </div>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-[#0d0d0d] px-4 py-3">
      <span className="label-mono">{label}</span>
      <div className="value-mono text-xl font-bold text-white">
        {value}
        <span className="label-mono ml-1">{unit}</span>
      </div>
    </div>
  )
}
