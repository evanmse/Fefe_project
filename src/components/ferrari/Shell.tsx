import { useState, type ReactNode } from 'react'
import { FerrariShield } from './FerrariShield'

/* ============================================================
   Shell.tsx — layout réutilisable (header + tabs) pour les
   vues techniques du cockpit ingénieur.
   ============================================================ */

export interface ShellTab {
  id: string
  label: string
  content: ReactNode
}

export function Shell({
  title = 'Engineering Station',
  eyebrow = 'SF-26 · Photosensible',
  tabs,
}: {
  title?: string
  eyebrow?: string
  tabs: ShellTab[]
}) {
  const [active, setActive] = useState(tabs[0]?.id)
  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-[#1f1f1f] bg-[#0d0d0d] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <FerrariShield size={34} />
          <div className="flex flex-col">
            <span className="label-mono text-[#dc0000]">{eyebrow}</span>
            <h3 className="title-display text-lg">{title}</h3>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-3 py-2 label-mono transition ${
                t.id === active
                  ? 'bg-[#dc0000] text-white'
                  : 'bg-[#141414] text-[#8a8a8a] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="p-5">{current?.content}</div>
    </section>
  )
}
