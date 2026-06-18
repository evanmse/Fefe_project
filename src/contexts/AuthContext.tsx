import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'

/* ============================================================
   AuthContext — Google OAuth + email vérifié
   Stockage localStorage pour persistance
   ============================================================ */

interface FerrariUser {
  name: string
  email: string
  picture: string
  provider: 'google' | 'local'
  ts: number
}

interface AuthState {
  user: FerrariUser | null
  loading: boolean
  loginWithGoogle: (credential: string) => void
  loginWithLocal: (team: string, number: string) => boolean
  logout: () => void
}

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  loginWithGoogle: () => {},
  loginWithLocal: () => false,
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FerrariUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restaurer la session au chargement
  useEffect(() => {
    const raw = localStorage.getItem('ferrari_user')
    if (raw) {
      try {
        const u = JSON.parse(raw) as FerrariUser
        if (u.email && u.ts) setUser(u)
      } catch {}
    }
    setLoading(false)
  }, [])

  const persist = useCallback((u: FerrariUser) => {
    localStorage.setItem('ferrari_user', JSON.stringify(u))
    setUser(u)
  }, [])

  const loginWithGoogle = useCallback((credential: string) => {
    // Décoder le JWT Google (payload uniquement, pas de vérification serveur ici)
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]))
      const u: FerrariUser = {
        name: payload.name || payload.email,
        email: payload.email,
        picture: payload.picture || '',
        provider: 'google',
        ts: Date.now(),
      }
      persist(u)
    } catch {
      console.error('Google credential invalide')
    }
  }, [persist])

  const loginWithLocal = useCallback((team: string, num: string): boolean => {
    if (team.trim().toUpperCase() === 'FERRARI' && num.trim() === '16') {
      const u: FerrariUser = {
        name: 'Charles Leclerc',
        email: 'leclerc@scuderiaferrari.com',
        picture: '',
        provider: 'local',
        ts: Date.now(),
      }
      persist(u)
      return true
    }
    return false
  }, [persist])

  const logout = useCallback(() => {
    localStorage.removeItem('ferrari_user')
    setUser(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, loginWithGoogle, loginWithLocal, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
