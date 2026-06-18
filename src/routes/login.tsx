import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { FerrariShield } from '~/components/ferrari/FerrariShield'
import { useAuth } from '~/contexts/AuthContext'
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
  const { loginWithGoogle, loginWithLocal } = useAuth()
  const [team, setTeam] = useState('')
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')
  const [showLocal, setShowLocal] = useState(false)

  const handleGoogleSuccess = (credentialResponse: any) => {
    loginWithGoogle(credentialResponse.credential)
    navigate({ to: '/dashboard' })
  }

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginWithLocal(team, number)) {
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

        <div className="panel panel-grid flex flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <FerrariShield size={44} />
            <div>
              <div className="label-mono text-[#dc0000]">ACCÈS RESTREINT</div>
              <h1 className="title-display text-xl">Cockpit ingénieur</h1>
            </div>
          </div>

          {/* ===== Google Sign-In ===== */}
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="label-mono text-center">Connexion sécurisée via Google</p>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Erreur Google — réessaie.')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="signin_with"
            />
            <p className="text-[10px] leading-relaxed text-[#555] text-center">
              Ton email Google est vérifié pour te donner accès au cockpit télémétrie.
            </p>
          </div>

          {/* ===== Séparateur ===== */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-[#1f1f1f]" />
            <span className="label-mono text-[10px] text-[#555]">ou identifiants pilote</span>
            <div className="flex-1 border-t border-[#1f1f1f]" />
          </div>

          {/* ===== Fallback local FERRARI/16 ===== */}
          {!showLocal ? (
            <button
              onClick={() => setShowLocal(true)}
              className="border border-[#2a2a2a] px-6 py-3 label-mono text-sm text-white transition hover:border-[#dc0000]"
            >
              Accès identifiants pilote
            </button>
          ) : (
            <form onSubmit={handleLocalSubmit} className="flex flex-col gap-4">
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

              <button
                type="submit"
                className="bg-[#dc0000] px-6 py-3 title-display text-sm text-white transition hover:bg-[#ff1e00]"
              >
                Déverrouiller le cockpit
              </button>
            </form>
          )}

          <p className="label-mono text-center text-[10px]">
            Google OAuth · localStorage
          </p>
        </div>
      </div>
    </main>
  )
}
