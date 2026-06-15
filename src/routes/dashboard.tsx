import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Car3DPanel,
  TelemetryPanel,
  computeAero,
  type SetupState,
  type LiveTelemetry,
} from '~/components/ferrari/Dashboard'
import { useLiveTelemetry } from '~/hooks/useLiveTelemetry'
import { FerrariShield } from '~/components/ferrari/FerrariShield'
import { Kpi, StatusPill } from '~/components/ferrari/atoms'
import { Shell, type ShellTab } from '~/components/ferrari/Shell'
import { OverviewView } from '~/components/ferrari/views/OverviewView'
import { ArchitectureView } from '~/components/ferrari/views/ArchitectureView'
import { TelemetryView } from '~/components/ferrari/views/TelemetryView'
import { SimulatorsView } from '~/components/ferrari/views/SimulatorsView'
import { DataWaterfall } from '~/components/ferrari/DataWaterfall'
import { Chatbot } from '~/components/ferrari/Chatbot'
import { TrackStatusPanel } from '~/components/ferrari/TrackStatusPanel'
import AeroChart from '~/components/ferrari/AeroChart'
import AudioEngine from '~/components/ferrari/AudioEngine'
import DRSIndicator from '~/components/ferrari/DRSIndicator'
import ExportButton from '~/components/ferrari/ExportButton'
import FourCornerLiDAR from '~/components/ferrari/FourCornerLiDAR'
import LapPredictor from '~/components/ferrari/LapPredictor'
import TyreDegradation from '~/components/ferrari/TyreDegradation'
import topdown from '~/assets/dashboard-car-topdown.png'
import heroCar from '~/assets/vitrine-hero-car.jpg'

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [{ title: 'Cockpit ingénieur · Télémétrie — Scuderia Ferrari' }],
  }),
  component: DashboardGate,
})

/* ============================================================
   Garde d'accès — protégé par localStorage (front-only)
   ============================================================ */
function DashboardGate() {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('ferrari_user')
    if (raw) {
      setAuthed(true)
    } else {
      setAuthed(false)
      navigate({ to: '/login' })
    }
  }, [navigate])

  if (authed !== true) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="badge-live">
          <span className="h-2 w-2 rounded-full bg-[#00ff41] animate-pulse-dot" />
          Connexion au mur des stands…
        </div>
      </main>
    )
  }

  return <Cockpit />
}

/* ============================================================
   Cockpit ingénieur
   ============================================================ */
function Cockpit() {
  const navigate = useNavigate()
  const [setup, setSetup] = useState<SetupState>({
    rhFront: 22,
    rhRear: 38,
    springFront: 140,
    springRear: 150,
  })

  const aero = useMemo(() => computeAero(setup), [setup])
  const live = useLiveTelemetry(setup)
  const [audioOn, setAudioOn] = useState(false)

  const logout = () => {
    localStorage.removeItem('ferrari_user')
    navigate({ to: '/login' })
  }

  const tabs: ShellTab[] = [
    { id: 'overview', label: 'Overview', content: <OverviewView live={live} /> },
    { id: 'architecture', label: 'Architecture', content: <ArchitectureView /> },
    {
      id: 'telemetry',
      label: 'Telemetry',
      content: <TelemetryView setup={setup} aero={aero} live={live} />,
    },
    { id: 'simulators', label: 'Simulators', content: <SimulatorsView /> },
  ]

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-24 text-white">
      <CockpitHeader live={live} status={aero.status} audioOn={audioOn} onToggleAudio={() => setAudioOn(!audioOn)} onLogout={logout} />
      <CockpitHero live={live} />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Appui aéro" value={aero.downforce} unit="kg" accent="red" sub="Ground effect" />
          <Kpi label="Traînée" value={aero.drag} unit="kg" accent="amber" sub={`L/D ${aero.efficiency}`} />
          <Kpi label="Assiette / Rake" value={aero.pitch} unit="°" accent="neutral" sub="Cible ≈ +1.0°" />
          <Kpi label="Balance avant" value={aero.balance} unit="%" accent="green" sub="Répartition d'appui" />
        </section>

        {/* Setup + LiDAR */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <SetupPanel setup={setup} onChange={setSetup} status={aero.status} />
          <RealCarPanel live={live} />
        </section>

        {/* Plateforme aéro + télémétrie */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.95fr]">
          <Car3DPanel setup={setup} aero={aero} />
          <div className="grid gap-6">
            <TelemetryPanel live={live} />
            <TrackStatusPanel live={live} />
          </div>
        </section>

        {/* Flux de données */}
        <DataWaterfall />

      <AudioEngine rpm={live.rpm} active={audioOn} />

      {/* Station d'ingénierie (Shell + views) */}
        <Shell tabs={tabs} />

        {/* Graphique aéro + prédiction tour */}
        <section className="grid gap-6 lg:grid-cols-2">
          <AeroChart setup={setup} aero={aero} />
          <div className="grid gap-6">
            <LapPredictor setup={setup} aero={aero} />
            <TyreDegradation live={live} laps={22} />
          </div>
        </section>
      </div>

      {/* 4 coins LiDAR */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <FourCornerLiDAR live={live} setup={setup} />
      </section>

      <Chatbot />
    </main>
  )
}

/* -------------------- Header -------------------- */
function CockpitHeader({
  live,
  status,
  audioOn,
  onToggleAudio,
  onLogout,
}: {
  live: LiveTelemetry
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL'
  audioOn: boolean
  onToggleAudio: () => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#1f1f1f] bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <FerrariShield size={34} />
          <div className="leading-none">
            <div className="title-display text-sm">Cockpit ingénieur</div>
            <div className="label-mono">SF-26 · LiDAR ride height</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="badge-live">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
            LIVE · {live.speed.toFixed(0)} km/h
          </span>
          <span className="badge-live text-[#ffb800]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffb800]" />
            {(live.rpm / 1000).toFixed(1)}k tr/min
          </span>
          <DRSIndicator drs={live.drs} speed={live.speed} />
          <StatusPill status={status} />
          <ExportButton live={live} />
          <button
            onClick={onToggleAudio}
            className={`border px-3 py-1.5 label-mono transition hover:border-[#dc0000] hover:text-white ${audioOn ? 'border-[#00ff41] text-[#00ff41]' : 'border-[#2a2a2a]'}`}
          >
            {audioOn ? 'Audio ON' : 'Audio OFF'}
          </button>
          <button
            onClick={onLogout}
            className="border border-[#2a2a2a] px-3 py-1.5 label-mono transition hover:border-[#dc0000] hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}

/* -------------------- Hero -------------------- */
function CockpitHero({ live }: { live: LiveTelemetry }) {
  return (
    <section className="relative overflow-hidden border-b border-[#1f1f1f]">
      <img src={heroCar} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-6 py-12">
        <span className="badge-live text-[#dc0000]">
          <span className="h-2 w-2 bg-[#dc0000] animate-pulse-dot" />
          SESSION EN COURS · MONZA
        </span>
        <h1 className="title-display text-4xl md:text-6xl">
          Télémétrie temps réel
        </h1>
        <p className="max-w-xl text-sm text-[#bdbdbd]">
          Réglez le setup et surveillez la garde au sol mesurée par le LiDAR
          sous pneu. Le dashboard détecte la stabilité piste et les sorties de
          trajectoire en temps réel, données 200 ms.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
          <HeroMini label="Garde au sol AV" value={`${live.rhFront.toFixed(1)} mm`} />
          <HeroMini label="Garde au sol AR" value={`${live.rhRear.toFixed(1)} mm`} />
          <HeroMini label="Appui" value={`${live.downforce.toFixed(0)} kg`} />
        </div>
      </div>
    </section>
  )
}

function HeroMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-mono">{label}</div>
      <div className="value-mono text-xl font-bold text-[#00ff41]">{value}</div>
    </div>
  )
}

/* -------------------- Setup sliders -------------------- */
function SetupPanel({
  setup,
  onChange,
  status,
}: {
  setup: SetupState
  onChange: (s: SetupState) => void
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL'
}) {
  const set = (k: keyof SetupState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...setup, [k]: Number(e.target.value) })

  return (
    <div className="panel p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#dc0000]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#dc0000]" />
          Réglages plateforme
        </span>
        <StatusPill status={status} />
      </div>

      <Slider label="Garde au sol AV" unit="mm" min={8} max={50} step={1} value={setup.rhFront} onChange={set('rhFront')} />
      <Slider label="Garde au sol AR" unit="mm" min={12} max={60} step={1} value={setup.rhRear} onChange={set('rhRear')} />
      <Slider label="Ressort AV" unit="N/mm" min={80} max={220} step={5} value={setup.springFront} onChange={set('springFront')} />
      <Slider label="Ressort AR" unit="N/mm" min={80} max={220} step={5} value={setup.springRear} onChange={set('springRear')} />

      <p className="label-mono">
        Trop bas → décrochage de plancher (CRITICAL). Rake idéal ≈ +1°.
      </p>
    </div>
  )
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  unit: string
  min: number
  max: number
  step: number
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <span className="value-mono text-sm font-semibold text-white">
          {value}
          <span className="label-mono ml-1">{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="slider-red" />
    </label>
  )
}

/* -------------------- RealCarPanel (LiDAR top-down) -------------------- */
function RealCarPanel({ live }: { live: LiveTelemetry }) {
  return (
    <div className="panel relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-5 py-3">
        <span className="badge-live">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41] animate-pulse-dot" />
          Capteurs LiDAR · vue plongée
        </span>
        <span className="label-mono">100 Hz</span>
      </div>

      <div className="relative">
        <img src={topdown} alt="Monoplace vue de dessus" className="h-full max-h-[24rem] w-full object-cover opacity-90" />
        <div className="absolute inset-0 scanline" />

        {/* Capteur AVANT */}
        <Sensor top="22%" left="50%" value={`${live.rhFront.toFixed(1)} mm`} label="LiDAR AV" />
        {/* Capteur ARRIÈRE */}
        <Sensor top="74%" left="50%" value={`${live.rhRear.toFixed(1)} mm`} label="LiDAR AR" />
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-[#1f1f1f] bg-[#1f1f1f]">
        <div className="bg-[#0d0d0d] px-5 py-3">
          <span className="label-mono">Écart AV/AR</span>
          <div className="value-mono text-lg font-bold text-[#00ff41]">
            {(live.rhRear - live.rhFront).toFixed(1)} mm
          </div>
        </div>
        <div className="bg-[#0d0d0d] px-5 py-3">
          <span className="label-mono">Temp. pneus</span>
          <div className="value-mono text-lg font-bold text-[#ffb800]">
            {live.tireTemp.toFixed(0)} °C
          </div>
        </div>
      </div>
    </div>
  )
}

function Sensor({
  top,
  left,
  value,
  label,
}: {
  top: string
  left: string
  value: string
  label: string
}) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top, left }}>
      <div className="relative flex items-center justify-center">
        <span className="absolute h-8 w-8 rounded-full border border-[#00ff41] animate-ping-ring" />
        <span className="h-3 w-3 rounded-full bg-[#00ff41] shadow-[0_0_12px_2px_rgba(0,255,65,0.7)]" />
      </div>
      <div className="mt-2 -translate-x-1/2 whitespace-nowrap border border-[#00ff41]/40 bg-black/80 px-2 py-1 text-center">
        <div className="label-mono text-[#00ff41]">{label}</div>
        <div className="value-mono text-sm font-bold text-white">{value}</div>
      </div>
    </div>
  )
}
