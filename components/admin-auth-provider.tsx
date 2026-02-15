'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface AdminAuthCtx {
  token: string | null
  isAuthenticated: boolean
  login: (secret: string) => Promise<boolean>
  logout: () => void
  fetchWithAuth: (url: string, opts?: RequestInit) => Promise<Response>
}

const Ctx = createContext<AdminAuthCtx>({
  token: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  fetchWithAuth: async () => new Response(),
})

export function useAdminAuth() {
  return useContext(Ctx)
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_token')
    if (stored) setToken(stored)
  }, [])

  const login = useCallback(async (secret: string) => {
    // Validate by hitting the health endpoint with this token
    const res = await fetch('/api/admin/backfill/runs', {
      headers: { Authorization: `Bearer ${secret}` },
    })
    if (res.ok) {
      setToken(secret)
      sessionStorage.setItem('admin_token', secret)
      document.cookie = `admin_token=${secret}; path=/; SameSite=Strict; max-age=86400`
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    sessionStorage.removeItem('admin_token')
    document.cookie = 'admin_token=; path=/; max-age=0'
  }, [])

  const fetchWithAuth = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const headers = new Headers(opts.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(url, { ...opts, headers })
    },
    [token],
  )

  return (
    <Ctx.Provider value={{ token, isAuthenticated: !!token, login, logout, fetchWithAuth }}>
      {children}
    </Ctx.Provider>
  )
}
