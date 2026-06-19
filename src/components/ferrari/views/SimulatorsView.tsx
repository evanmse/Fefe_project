import { SectionHeader } from '../atoms'
import { SimulatorsGrid } from '../Simulators'
import pitstop from '~/assets/simulators-pitstop.png'
import crew from '~/assets/simulators-crew.png'

/* ============================================================
   SimulatorsView — grid des 4 simulateurs.
   ============================================================ */

export function SimulatorsView() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="SIMULATORS"
        title="Bancs d'essai temps réel"
        subtitle="Quatre modèles interactifs : groupe propulseur, dérive arrière, scan Photosensible brut et charges G."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Banner image={pitstop} label="PIT STOP" caption="Arrêt 2.1 s · 18 mécaniciens" />
        <Banner image={crew} label="RACE CREW" caption="Mur des stands · stratégie live" />
      </div>

      <SimulatorsGrid />
    </div>
  )
}

function Banner({
  image,
  label,
  caption,
}: {
  image: string
  label: string
  caption: string
}) {
  return (
    <div className="panel relative h-32 overflow-hidden">
      <img src={image} alt={label} className="h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent" />
      <div className="absolute bottom-3 left-4">
        <span className="label-mono text-[#dc0000]">{label}</span>
        <p className="value-mono text-sm text-white">{caption}</p>
      </div>
    </div>
  )
}
