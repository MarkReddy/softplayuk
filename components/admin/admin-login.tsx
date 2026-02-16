'use client'

import { useState } from 'react'
import { useAdminAuth } from '@/components/admin-auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AdminLogin() {
  const { login } = useAdminAuth()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await login(secret)
    setLoading(false)
    if (!ok) {
      setError('Invalid admin secret. Check your ADMIN_SECRET env var.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          Admin Access
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Enter your admin secret to access the backfill tool.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={loading || !secret}>
            {loading ? 'Verifying...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  )
}
