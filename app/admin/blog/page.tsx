'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { AdminLogin } from '@/components/admin/admin-login'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function AdminBlogPage() {
  return (
    <AdminAuthProvider>
      <BlogGate />
    </AdminAuthProvider>
  )
}

interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt: string
  category: string
  region: string
  city: string
  word_count: number
  status: string
  published_at: string | null
  created_at: string
}

function BlogGate() {
  const { isAuthenticated, fetchWithAuth } = useAdminAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 })
  const [cityInput, setCityInput] = useState('')
  const [regionInput, setRegionInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [bulkAutoPublish, setBulkAutoPublish] = useState(true)

  const fetchPosts = useCallback(async () => {
    const res = await fetchWithAuth('/api/admin/generate-blog-posts')
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts || [])
      setStats(data.stats || { total: 0, published: 0, drafts: 0 })
    }
  }, [fetchWithAuth])

  useEffect(() => {
    if (isAuthenticated) fetchPosts()
  }, [isAuthenticated, fetchPosts])

  if (!isAuthenticated) return <AdminLogin />

  const handleGenerate = async (action: string, params: Record<string, unknown>) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetchWithAuth('/api/admin/generate-blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })
      const data = await res.json()
      setMessage(data.message || 'Done')
      fetchPosts()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePublishToggle = async (postId: number, currentStatus: string) => {
    const action = currentStatus === 'published' ? 'unpublish' : 'publish'
    await handleGenerate(action, { postId })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Blog Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and manage SEO blog posts (min 500 words each)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/backfill">
            <Button variant="outline" size="sm">Backfill</Button>
          </Link>
          <Link href="/admin/generate-content">
            <Button variant="outline" size="sm">Venue Content</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Posts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
          <p className="text-sm text-muted-foreground">Published</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.drafts}</p>
          <p className="text-sm text-muted-foreground">Drafts</p>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="mb-8 space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-bold text-foreground">Generate New Posts</h2>

        {/* City */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">City Guide</label>
            <Input
              placeholder="e.g. London, Manchester, Birmingham"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
          </div>
          <Button
            onClick={() => handleGenerate('generate_city', { city: cityInput, autoPublish: bulkAutoPublish })}
            disabled={loading || !cityInput}
          >
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Region */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Region Guide</label>
            <Input
              placeholder="e.g. Greater London, West Midlands"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
            />
          </div>
          <Button
            onClick={() => handleGenerate('generate_region', { region: regionInput, autoPublish: bulkAutoPublish })}
            disabled={loading || !regionInput}
          >
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Bulk */}
        <div className="flex items-center gap-4 border-t border-border pt-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Bulk Generate</p>
            <p className="text-xs text-muted-foreground">Generate city guides for all cities with 3+ venues</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={bulkAutoPublish}
              onChange={(e) => setBulkAutoPublish(e.target.checked)}
              className="rounded"
            />
            Auto-publish
          </label>
          <Button
            variant="outline"
            onClick={() => handleGenerate('bulk_generate', { autoPublish: bulkAutoPublish })}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Bulk Generate'}
          </Button>
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.includes('Error') || message.includes('already') ? 'text-destructive' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Posts List */}
      <div>
        <h2 className="mb-4 font-serif text-xl font-bold text-foreground">All Posts</h2>
        {posts.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No blog posts yet. Use the controls above to generate your first post.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                    <Badge
                      variant={post.status === 'published' ? 'default' : 'secondary'}
                      className={post.status === 'published' ? 'bg-emerald-600 text-white' : ''}
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {post.city && <span>{post.city}</span>}
                    {post.region && <span>{post.region}</span>}
                    <span>{post.word_count} words</span>
                    <span>{new Date(post.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {post.status === 'published' && (
                    <Link href={`/blog/${post.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePublishToggle(post.id, post.status)}
                    disabled={loading}
                  >
                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
