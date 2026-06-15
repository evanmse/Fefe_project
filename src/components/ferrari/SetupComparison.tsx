import type { SetupState } from '~/components/ferrari/Dashboard'

/* ============================================================
   SetupComparison.tsx — Side-by-side setup comparison
   Compares the current setup against pre-defined circuit presets.
   Shows a table with green/red diffs and an "Apply" button
   for each preset.
   ============================================================ */

interface Preset {
  name: string
  description: string
  setup: SetupState
}

const PRESETS: Preset[] = [
  {
    name: 'Monza Low Downforce',
    description: 'Faible appui — vitesse de pointe maximale',
    setup: { rhFront: 15, rhRear: 28, springFront: 180, springRear: 200 },
  },
  {
    name: 'Monaco Max Downforce',
    description: 'Appui max — traction en sortie de virage serré',
    setup: { rhFront: 28, rhRear: 48, springFront: 100, springRear: 120 },
  },
  {
    name: 'Spa Balanced',
    description: 'Compromis appui/traînée pour secteurs variés',
    setup: { rhFront: 22, rhRear: 38, springFront: 140, springRear: 150 },
  },
]

interface SetupComparisonProps {
  currentSetup: SetupState
  onApply: (setup: SetupState) => void
}

/** Render a diff value with color coding */
function DiffCell({ current, preset }: { current: number; preset: number }) {
  const diff = preset - current
  const isZero = Math.abs(diff) < 0.01
  return (
    <span
      className={`value-mono text-sm font-semibold ${
        isZero
          ? 'text-[#8a8a8a]'
          : diff > 0
            ? 'text-[#00ff41]'
            : 'text-[#dc0000]'
      }`}
    >
      {isZero ? '—' : diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}
    </span>
  )
}

export default function SetupComparison({
  currentSetup,
  onApply,
}: SetupComparisonProps) {
  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="badge-live text-[#dc0000]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#dc0000] animate-pulse-dot" />
          Comparateur de réglages
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="label-mono pb-2 pr-4">Réglage</th>
                <th className="label-mono pb-2 pr-4">Actuel</th>
                {PRESETS.map((p) => (
                  <th
                    key={p.name}
                    className="label-mono pb-2 pr-4 text-[#dc0000]"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { key: 'rhFront', label: 'Garde AV (mm)' },
                  { key: 'rhRear', label: 'Garde AR (mm)' },
                  { key: 'springFront', label: 'Ressort AV (N/mm)' },
                  { key: 'springRear', label: 'Ressort AR (N/mm)' },
                ] as const
              ).map(({ key, label }) => (
                <tr key={key} className="border-b border-[#1f1f1f]/60">
                  <td className="label-mono py-2 pr-4">{label}</td>
                  <td className="value-mono text-sm font-bold py-2 pr-4 text-white">
                    {currentSetup[key]}
                  </td>
                  {PRESETS.map((p) => (
                    <td key={p.name} className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="value-mono text-sm text-[#bdbdbd]">
                          {p.setup[key]}
                        </span>
                        <DiffCell
                          current={currentSetup[key]}
                          preset={p.setup[key]}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preset detail cards with Apply button */}
        <div className="grid gap-3 pt-2">
          {PRESETS.map((preset) => (
            <div
              key={preset.name}
              className="flex items-center justify-between rounded-sm border border-[#1f1f1f] bg-[#0d0d0d] p-3"
            >
              <div className="flex flex-col gap-1">
                <span className="value-mono text-sm font-bold text-white">
                  {preset.name}
                </span>
                <span className="label-mono text-[10px] text-[#8a8a8a]">
                  {preset.description}
                </span>
                <span className="label-mono text-[10px] text-[#5a5a5a]">
                  AV {preset.setup.rhFront}mm · AR {preset.setup.rhRear}mm ·
                  Ressorts {preset.setup.springFront}/{preset.setup.springRear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onApply(preset.setup)}
                className="cursor-pointer rounded-sm border border-[#dc0000] bg-[#dc0000]/10 px-4 py-2 text-xs font-bold text-[#dc0000] transition hover:bg-[#dc0000]/20 label-mono"
              >
                APPLIQUER
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
