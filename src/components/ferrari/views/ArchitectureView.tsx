import { FeatureTile, SectionHeader, MetricRow } from '../atoms'
import aeroLoad from '~/assets/architecture-aero-load.png'
import topView from '~/assets/architecture-top-view.png'
import sf26 from '~/assets/dashboard-car-topdown.png'
import club from '~/assets/vitrine-history-car.jpg'

/* ============================================================
   ArchitectureView — architecture capteurs + tiles.
   ============================================================ */

export function ArchitectureView() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="ARCHITECTURE"
        title="Chaîne d'acquisition capteurs"
        subtitle="Deux Photosensible, une centrale inertielle et le bus CAN convergent vers le mur des stands. Reconstruction de la garde au sol et de l'assiette en temps réel."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel overflow-hidden">
          <img src={sf26} alt="SF-26 vue de dessus" className="h-64 w-full object-cover opacity-85" />
          <div className="border-t border-[#1f1f1f] p-5">
            <span className="label-mono text-[#dc0000]">SF-26 · FRONT PACKAGE</span>
            <p className="mt-2 text-sm leading-relaxed text-[#9a9a9a]">
              Le Photosensible avant est intégré sous le nez, protégé des projections. Le
              capteur arrière scrute le plancher juste devant le diffuseur, là où
              l'effet de sol est le plus sensible.
            </p>
            <div className="mt-3">
              <MetricRow label="Photosensible avant" value="sous nez" accent="green" />
              <MetricRow label="Photosensible arrière" value="pré-diffuseur" accent="green" />
              <MetricRow label="Bus" value="CAN 1 Mb/s" />
              <MetricRow label="Échantillonnage" value="100" unit="Hz" accent="amber" />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <FeatureTile
            image={aeroLoad}
            tag="AERO LOAD"
            title="Cartographie d'appui"
            desc="Distribution de charge aéro reconstruite depuis la garde au sol mesurée."
          />
          <FeatureTile
            image={topView}
            tag="TOP VIEW"
            title="Vue plancher"
            desc="Référentiel top-down pour positionner les faisceaux Photosensible sur la planche."
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FeatureTile
          image={club}
          tag="CLUB"
          title="Référentiel piste"
          desc="Calibration sur surface de référence avant chaque session."
        />
        <FeatureTile
          tag="PIPELINE"
          title="Fusion de données"
          desc="Photosensible + IMU + accéléromètres fusionnés par filtre de Kalman embarqué."
        />
        <FeatureTile
          tag="TELEMETRY"
          title="Liaison stand"
          desc="Transmission radio chiffrée vers le mur des stands à chaque passage."
        />
      </div>
    </div>
  )
}
