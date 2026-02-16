'use client'

import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { AdminLogin } from '@/components/admin/admin-login'
import Link from 'next/link'
import { Database, FileText, Sparkles, FlaskConical } from 'lucide-react'

export default function AdminPage() {
  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  )
}

const tools = [
  {
    href: '/admin/backfill',
    icon: Database,
    title: 'Backfill Dashboard',
    description: 'Run Google Places backfill to import venue data, photos, and reviews from Google.',
  },
  {
    href: '/admin/generate-content',
    icon: Sparkles,
    title: 'Generate Content',
    description: 'Use AI to generate venue descriptions, facilities, and parent reviews in bulk.',
  },
  {
    href: '/admin/blog',
    icon: FileText,
    title: 'Blog Manager',
    description: 'Generate, publish, and manage SEO blog posts for cities and regions.',
  },
  {
    href: '/admin/api-test',
    icon: FlaskConical,
    title: 'API Tests',
    description: 'Test API endpoints and check integration health.',
  },
]

function AdminGate() {
  const { isAuthenticated, logout } = useAdminAuth()
  if (!isAuthenticated) return <AdminLogin />

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Admin Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage content, data, and SEO for Softplay UK</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Sign Out
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <tool.icon className="h-5 w-5" />
            </div>
            <h2 className="mb-1 font-serif text-lg font-bold text-foreground">{tool.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
