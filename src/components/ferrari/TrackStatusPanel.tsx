import { StatusPill } from './atoms'
import type { LiveTelemetry } from './Dashboard'

const OFF_TRACK_THRESHOLD = 15
const WARNING_DIFF = 12

function computeTrackStatus(live: LiveTelemetry) {
  const wheelDiff = Math.abs(live.rhRear - live.rhFront)
  const lowHeight = live.rhFront < 12 || live.rhRear < 18
  const highSideLoad = live.latG > 3.4
  const offTrack = lowHeight && wheelDiff > OFF_TRACK_THRESHOLD
  const unstable = wheelDiff > WARNING_DIFF || highSideLoad

  if (offTrack) {
    return {
      title: 'Hors piste probable',
      detail:
        'Hauteur LiDAR instable sous le pneu et diff. AV/AR élevée. Activez le statut de récupération.',
      status: 'CRITICAL' as const,
      badge: 'Hors piste',
    }
  }

  if (unstable) {
    return {
      title: 'Vigilance piste',
      detail:
        'Variation de hauteur ou charge latérale élevée détectée. Surveillez la trajectoire et la sortie de virage.',
      status: 'SUBOPTIMAL' as const,
      badge: 'Vigilance',
    }
  }

  return {
    title: 'Vue piste stable',
    detail:
      'Toutes les données LiDAR sont cohérentes. La voiture reste focus sur la trajectoire et les appuis.',
    status: 'OPTIMAL' as const,
    badge: 'En piste',
  }
}

export function TrackStatusPanel({ live }: { live: LiveTelemetry }) {
  const state = computeTrackStatus(live)

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="badge-live">LiDAR sous pneu · statut piste</span>
          <h3 className="title-display text-xl mt-3 text-white">{state.title}</h3>
        </div>
        <StatusPill status={state.status} />
      </div>

      <p className="text-sm leading-relaxed text-[#bdbdbd]">{state.detail}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-4">
          <span className="label-mono">Garde au sol AV</span>
          <div className="value-mono mt-2 text-3xl font-bold text-[#00ff41]">
            {live.rhFront.toFixed(1)} mm
          </div>
        </div>
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-4">
          <span className="label-mono">Garde au sol AR</span>
          <div className="value-mono mt-2 text-3xl font-bold text-[#00ff41]">
            {live.rhRear.toFixed(1)} mm
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-4">
          <span className="label-mono">Différence AV/AR</span>
          <div className="value-mono mt-2 text-2xl font-bold text-[#ffb800]">
            {Math.abs(live.rhRear - live.rhFront).toFixed(1)} mm
          </div>
        </div>
        <div className="rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-4">
          <span className="label-mono">Charge latérale</span>
          <div className="value-mono mt-2 text-2xl font-bold text-[#dc0000]">
            {live.latG.toFixed(2)} G
          </div>
        </div>
      </div>
    </div>
  )
}
