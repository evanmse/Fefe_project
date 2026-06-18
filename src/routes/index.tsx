import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FerrariShield } from '~/components/ferrari/FerrariShield'
import { useTheme } from '~/contexts/ThemeContext'
import heroCar from '~/assets/vitrine-hero-car.jpg'
import helmetBg from '~/assets/vitrine-helmet-bg.png'
import historyCar from '~/assets/vitrine-history-car.jpg'
import trophy from '~/assets/vitrine-trophy.jpg'
import trackBg from '~/assets/vitrine-track-bg.png'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Scuderia Ferrari · LiDAR Ride Height' },
      {
        property: 'og:image',
        content: heroCar,
      },
    ],
  }),
  component: Vitrine,
})

/* ============================================================
   Vitrine publique — storytelling Scuderia Ferrari
   ============================================================ */

function Vitrine() {
  return (
    <main className="relative bg-[#0a0a0a] text-white">
      <TopNav />
      <Hero />
      <History />
      <TrophyRoom />
      <ScrollCircuit />
      <FinalCTA />
      <Footer />
    </main>
  )
}

/* -------------------- Nav -------------------- */
function TopNav() {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggle } = useTheme()
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-[#1f1f1f] bg-black/80 backdrop-blur' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <FerrariShield size={36} />
          <div className="leading-none">
            <div className="title-display text-sm">Scuderia Ferrari</div>
            <div className="label-mono">LiDAR Ride Height</div>
          </div>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#history" className="label-mono hover:text-white">Histoire</a>
          <a href="#palmares" className="label-mono hover:text-white">Palmarès</a>
          <a href="#circuit" className="label-mono hover:text-white">Monza</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="px-3 py-2 label-mono text-sm transition hover:text-[#dc0000]"
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link
            to="/login"
            className="bg-[#dc0000] px-4 py-2 label-mono text-white transition hover:bg-[#ff1e00]"
          >
            Cockpit ingénieur
          </Link>
        </div>
      </div>
    </header>
  )
}

/* -------------------- Hero -------------------- */
function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <img
        src={helmetBg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/2 h-[120%] -translate-y-1/2 rotate-12 object-contain opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <img
        src={heroCar}
        alt="Monoplace Scuderia Ferrari"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]" />

      <div className="relative mx-auto w-full max-w-7xl px-6">
        <span className="badge-live text-[#dc0000]">
          <span className="h-2 w-2 bg-[#dc0000]" />
          SF-26 · GROUND EFFECT
        </span>
        <h1 className="title-display mt-4 text-6xl md:text-8xl">
          Forza
          <br />
          <span className="text-[#dc0000]">Ferrari</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#cfcfcf]">
          La garde au sol se joue au millimètre. Notre LiDAR la mesure à 100 Hz
          pour libérer chaque kilo d'appui — du baquet au mur des stands.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/login"
            className="bg-[#dc0000] px-6 py-3 title-display text-sm text-white transition hover:bg-[#ff1e00]"
          >
            Accéder à la télémétrie
          </Link>
          <a
            href="#circuit"
            className="border border-[#2a2a2a] px-6 py-3 title-display text-sm text-white transition hover:border-[#dc0000]"
          >
            Explorer Monza
          </a>
        </div>

        <div className="mt-16 grid max-w-2xl grid-cols-3 gap-px bg-[#1f1f1f]">
          <HeroStat value="16" label="Titres pilotes" />
          <HeroStat value="100 Hz" label="Scan LiDAR" />
          <HeroStat value="0.1 mm" label="Résolution" />
        </div>
      </div>
    </section>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-[#0a0a0a] px-5 py-4">
      <div className="value-mono text-2xl font-bold text-white">{value}</div>
      <div className="label-mono mt-1">{label}</div>
    </div>
  )
}

/* -------------------- History -------------------- */
function History() {
  return (
    <section id="history" className="relative mx-auto max-w-7xl px-6 py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <img src={historyCar} alt="Monoplace Ferrari" className="h-[28rem] w-full object-cover" />
        </div>
        <div className="flex flex-col gap-6">
          <span className="badge-live text-[#dc0000]">
            <span className="h-2 w-2 bg-[#dc0000]" />
            DEPUIS 1929
          </span>
          <h2 className="title-display text-4xl md:text-5xl">
            Une écurie née pour la course
          </h2>
          <p className="text-base leading-relaxed text-[#bdbdbd]">
            De Enzo Ferrari aux hybrides à effet de sol, la Scuderia a fait de la
            précision technique une obsession. Aujourd'hui, la moindre variation
            de garde au sol est traquée, mesurée, optimisée.
          </p>
          <div className="grid grid-cols-2 gap-5 pt-2">
            <Milestone year="1950" text="Premier championnat du monde F1" />
            <Milestone year="1975" text="Domination Lauda · 312T" />
            <Milestone year="2004" text="Ère Schumacher · 15 victoires" />
            <Milestone year="2026" text="SF-26 · LiDAR ride height" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Milestone({ year, text }: { year: string; text: string }) {
  return (
    <div className="border-l-2 border-[#dc0000] pl-4">
      <div className="value-mono text-xl font-bold text-white">{year}</div>
      <div className="mt-1 text-sm text-[#9a9a9a]">{text}</div>
    </div>
  )
}

/* -------------------- TrophyRoom -------------------- */
function TrophyRoom() {
  const trophies = [
    { n: '16', l: 'Titres pilotes' },
    { n: '16', l: 'Titres constructeurs' },
    { n: '247', l: 'Victoires en GP' },
    { n: '1000+', l: 'Grands Prix disputés' },
  ]
  return (
    <section id="palmares" className="relative overflow-hidden py-28">
      <img src={trophy} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/85 to-[#0a0a0a]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          <span className="badge-live text-[#ffb800]">
            <span className="h-2 w-2 bg-[#ffb800]" />
            PALMARÈS
          </span>
          <h2 className="title-display mt-4 text-4xl md:text-6xl">
            L'écurie la plus titrée
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-px bg-[#1f1f1f] md:grid-cols-4">
          {trophies.map((t) => (
            <div key={t.l} className="bg-[#0a0a0a] px-6 py-10 text-center">
              <div className="title-display text-5xl text-[#dc0000]">{t.n}</div>
              <div className="label-mono mt-3">{t.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------- ScrollCircuit (Monza) -------------------- */
// Tracé stylisé du circuit de Monza
const MONZA_PATH =
  'M120,520 L120,140 Q120,90 170,90 L640,90 Q700,90 700,150 L700,210 Q700,250 660,255 L300,275 Q255,280 258,320 L262,360 Q265,400 320,402 L760,402 Q820,402 820,460 L820,540 Q820,600 760,600 L300,600 Q180,600 180,560 Q180,520 240,520 L520,520 Q560,520 560,480 Q560,448 520,448 L240,448 Q180,448 170,500 L160,540 Q150,580 200,582 L180,560 Z'

function ScrollCircuit() {
  const pathRef = useRef<SVGPathElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [car, setCar] = useState({ x: 120, y: 520, angle: 0 })
  const [hud, setHud] = useState({ speed: 0, gear: 1, time: '1:20.000' })

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const len = path.getTotalLength()

    const update = () => {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const total = section.offsetHeight - window.innerHeight
      const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, total)))
      setProgress(p)

      const pt = path.getPointAtLength(p * len)
      const ahead = path.getPointAtLength(Math.min(len, p * len + 6))
      const angle = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI
      setCar({ x: pt.x, y: pt.y, angle })

      // HUD fictif corrélé à la "vitesse" (delta de position)
      const speed = Math.round(120 + Math.abs(Math.sin(p * Math.PI * 4)) * 220)
      const gear = Math.max(1, Math.min(8, Math.round(speed / 45)))
      const lap = 80 + p * 0.001
      const ms = Math.floor((p * 20000) % 1000)
      setHud({
        speed,
        gear,
        time: `1:${Math.floor(lap % 60)
          .toString()
          .padStart(2, '0')}.${ms.toString().padStart(3, '0')}`,
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section id="circuit" ref={sectionRef} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="absolute inset-0 bg-carbon opacity-40" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Circuit */}
          <div className="panel panel-grid relative">
            <div className="flex items-center justify-between border-b border-[#1f1f1f] px-5 py-3">
              <span className="title-display text-sm">Autodromo Nazionale Monza</span>
              <span className="label-mono text-[#dc0000]">5.793 KM · 11 VIRAGES</span>
            </div>
            <svg viewBox="0 0 940 700" className="w-full">
              {/* Tracé fantôme */}
              <path d={MONZA_PATH} fill="none" stroke="#1f1f1f" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
              {/* Tracé parcouru */}
              <path
                ref={pathRef}
                d={MONZA_PATH}
                fill="none"
                stroke="#dc0000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: pathRef.current?.getTotalLength() ?? 4000,
                  strokeDashoffset:
                    (pathRef.current?.getTotalLength() ?? 4000) * (1 - progress),
                }}
              />
              {/* Ligne de départ */}
              <line x1="100" y1="520" x2="140" y2="520" stroke="#fff" strokeWidth="3" strokeDasharray="4 4" />
              {/* Voiture */}
              <g transform={`translate(${car.x},${car.y}) rotate(${car.angle})`}>
                <rect x="-12" y="-6" width="24" height="12" rx="2" fill="#dc0000" stroke="#fff" strokeWidth="1" />
                <circle cx="14" cy="0" r="3" fill="#00ff41" />
              </g>
            </svg>
          </div>

          {/* HUD */}
          <div className="flex flex-col justify-center gap-5">
            <span className="badge-live text-[#dc0000]">
              <span className="h-2 w-2 bg-[#dc0000] animate-pulse-dot" />
              TÉLÉMÉTRIE · TOUR LANCÉ
            </span>
            <h2 className="title-display text-4xl md:text-5xl">
              Faites défiler
              <br />
              <span className="text-[#dc0000]">la monoplace</span>
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-[#9a9a9a]">
              Le scroll pilote la voiture sur un tour de Monza. Position et
              orientation interpolées le long du tracé, HUD synchronisé.
            </p>

            <div className="grid grid-cols-3 gap-px bg-[#1f1f1f]">
              <HudCell value={hud.speed} unit="km/h" label="Vitesse" accent="text-white" />
              <HudCell value={hud.gear} unit="rapport" label="Boîte" accent="text-[#dc0000]" />
              <HudCell value={hud.time} unit="chrono" label="Tour" accent="text-[#00ff41]" mono />
            </div>

            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="label-mono">Progression du tour</span>
                <span className="value-mono text-sm text-[#dc0000]">
                  {(progress * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-[#1f1f1f]">
                <div className="h-full bg-[#dc0000]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HudCell({
  value,
  unit,
  label,
  accent,
  mono,
}: {
  value: string | number
  unit: string
  label: string
  accent: string
  mono?: boolean
}) {
  return (
    <div className="bg-[#0a0a0a] px-4 py-4">
      <div className="label-mono">{label}</div>
      <div className={`value-mono mt-1 font-bold ${mono ? 'text-xl' : 'text-3xl'} ${accent}`}>
        {value}
      </div>
      <div className="label-mono mt-1">{unit}</div>
    </div>
  )
}

/* -------------------- FinalCTA -------------------- */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-32">
      <img src={trackBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <FerrariShield size={56} className="mx-auto" />
        <h2 className="title-display mt-6 text-4xl md:text-6xl">
          Prenez le mur des stands
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#bdbdbd]">
          Accédez au cockpit ingénieur : télémétrie temps réel, capteurs LiDAR
          animés et réglages de setup en direct.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex bg-[#dc0000] px-8 py-4 title-display text-sm text-white transition hover:bg-[#ff1e00]"
        >
          Ouvrir la télémétrie →
        </Link>
        <div className="mt-6 label-mono">Identifiants équipe requis · FERRARI</div>
      </div>
    </section>
  )
}

/* -------------------- Footer -------------------- */
function Footer() {
  return (
    <footer className="border-t border-[#1f1f1f] bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-3">
          <FerrariShield size={28} />
          <span className="label-mono">Scuderia Ferrari · LiDAR Ride Height</span>
        </div>
        <span className="label-mono">Démonstrateur front-only · données simulées</span>
      </div>
    </footer>
  )
}
