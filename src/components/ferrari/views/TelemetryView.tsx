import { Car3DPanel } from '../Dashboard'
import type { AeroResult, SetupState } from '../Dashboard'
import { SectionHeader } from '../atoms'

/* ============================================================
   TelemetryView — plateforme aéro (profil réagissant à l'assiette).
   ============================================================ */

export function TelemetryView({
  setup,
  aero,
}: {
  setup: SetupState
  aero: AeroResult
}) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="TELEMETRY"
        title="Plateforme aéro"
        subtitle="Le profil réagit en direct à l'assiette du setup."
      />
      <div className="grid gap-5">
        <Car3DPanel setup={setup} aero={aero} />
      </div>
    </div>
  )
}
