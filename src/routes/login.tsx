import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FerrariShield } from '~/components/ferrari/FerrariShield'
import heroCar from '~/assets/vitrine-hero-car.jpg'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [{ title: 'Connexion · Cockpit ingénieur — Scuderia Ferrari' }],
  }),
  component: LoginPage,
})

const TEAM = 'FERRARI'
const NUMBER = '16'

function LoginPage() {
  const navigate = useNavigate()
  const [team, setTeam] = useState('')
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (team.trim().toUpperCase() === TEAM && number.trim() === NUMBER) {
      localStorage.setItem(
        'ferrari_user',
        JSON.stringify({ team: TEAM, number: NUMBER, ts: Date.now() }),
      )
      navigate({ to: '/dashboard' })
    } else {
      setError("Identifiants invalides. Indice : l'écurie et le numéro 16.")
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
      <img src={heroCar} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/85 to-[#0a0a0a]" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 label-mono hover:text-white">
          ← Retour vitrine
        </Link>

        <form onSubmit={submit} className="panel panel-grid flex flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <FerrariShield size={44} />
            <div>
              <div className="label-mono text-[#dc0000]">ACCÈS RESTREINT</div>
              <h1 className="title-display text-xl">Cockpit ingénieur</h1>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono">Écurie</label>
            <input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="FERRARI"
              autoComplete="off"
              className="bg-[#0a0a0a] px-4 py-3 value-mono uppercase tracking-widest text-white outline-none focus:ring-1 focus:ring-[#dc0000]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono">Numéro pilote</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="16"
              inputMode="numeric"
              autoComplete="off"
              className="bg-[#0a0a0a] px-4 py-3 value-mono text-2xl tracking-widest text-white outline-none focus:ring-1 focus:ring-[#dc0000]"
            />
          </div>

          {error && (
            <div className="border border-[#dc0000]/40 bg-[#dc0000]/10 px-4 py-3 text-sm text-[#ff6a6a]">
              {error}
            </div>
          )}

          <div className="border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 text-center">
            <div className="label-mono text-[#8a8a8a]">Identifiants de démonstration</div>
            <div className="value-mono mt-1 text-sm text-[#00ff41]">Écurie : FERRARI</div>
            <div className="value-mono text-sm text-[#00ff41]">Numéro : 16</div>
          </div>

          <button
            type="submit"
            className="bg-[#dc0000] px-6 py-3 title-display text-sm text-white transition hover:bg-[#ff1e00]"
          >
            Déverrouiller le cockpit
          </button>

          <p className="label-mono text-center">
            Auth simulée · localStorage · aucun backend
          </p>
        </form>
      </div>
    </main>
  )
}
