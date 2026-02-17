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
  content_type: string
  region: string
  city: string
  area: string | null
  intent: string | null
  word_count: number
  status: string
  published_at: string | null
  created_at: string
}

interface Stats {
  total: number
  published: number
  drafts: number
  cityGuides: number
  areaGuides: number
  intentPages: number
}

const INTENT_OPTIONS = [
  { value: 'toddler-soft-play', label: 'Toddler Soft Play' },
  { value: 'birthday-parties', label: 'Birthday Parties' },
  { value: 'cheap-soft-play', label: 'Cheap Soft Play' },
  { value: 'sen-friendly', label: 'SEN-Friendly' },
  { value: 'rainy-day-activities', label: 'Rainy Day Activities' },
]

function getContentTypeLabel(type: string) {
  switch (type) {
    case 'city': return 'City Guide'
    case 'area': return 'Area Guide'
    case 'intent': return 'Intent Page'
    case 'region': return 'Region Guide'
    default: return type || 'Unknown'
  }
}

function getContentTypeBadgeClass(type: string) {
  switch (type) {
    case 'city': return 'bg-primary/10 text-primary border-primary/20'
    case 'area': return 'bg-accent/10 text-accent border-accent/20'
    case 'intent': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    case 'region': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    default: return ''
  }
}

function getViewUrl(post: BlogPost) {
  if (post.content_type === 'city' && post.city) {
    return `/guides/${post.city.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`
  }
  if (post.content_type === 'area' && post.city && post.area) {
    return `/guides/${post.city.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}/${post.area.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`
  }
  if (post.content_type === 'intent' && post.city && post.intent) {
    return `/guides/${post.city.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}/${post.intent}`
  }
  return `/blog/post/${post.slug}`
}

function BlogGate() {
  const { isAuthenticated, fetchWithAuth } = useAdminAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, drafts: 0, cityGuides: 0, areaGuides: 0, intentPages: 0 })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [bulkAutoPublish, setBulkAutoPublish] = useState(true)

  // Generation inputs
  const [cityInput, setCityInput] = useState('')
  const [regionInput, setRegionInput] = useState('')
  const [areaInput, setAreaInput] = useState('')
  const [areaCityInput, setAreaCityInput] = useState('')
  const [intentCityInput, setIntentCityInput] = useState('')
  const [selectedIntent, setSelectedIntent] = useState('toddler-soft-play')
  const [bulkIntentCity, setBulkIntentCity] = useState('')

  const fetchPosts = useCallback(async () => {
    const res = await fetchWithAuth('/api/admin/generate-blog-posts')
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts || [])
      setStats(data.stats || { total: 0, published: 0, drafts: 0, cityGuides: 0, areaGuides: 0, intentPages: 0 })
    }
  }, [fetchWithAuth])

  useEffect(() => {
    if (isAuthenticated) fetchPosts()
  }, [isAuthenticated, fetchPosts])

  if (!isAuthenticated) return <AdminLogin />

  const handleGenerate = async (action: string, params: Record<string, unknown>) => {
    setLoading(true)
    setMessage('')
    setErrors([])
    try {
      const res = await fetchWithAuth('/api/admin/generate-blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })
      const text = await res.text()
      if (!text) {
        setMessage(`Server returned empty response (status ${res.status}). The function may have timed out.`)
        return
      }
      let data
      try { data = JSON.parse(text) } catch {
        setMessage(`Server returned invalid JSON (status ${res.status}): ${text.substring(0, 200)}`)
        return
      }
      setMessage(data.message || data.error || 'Done')
      if (data.errors && data.errors.length > 0) setErrors(data.errors)
      if (data.detail) setMessage((prev) => `${prev} -- ${data.detail}`)
      fetchPosts()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePublishToggle = async (postId: number, currentStatus: string) => {
    await handleGenerate(currentStatus === 'published' ? 'unpublish' : 'publish', { postId })
  }

  const handleDelete = async (postId: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await handleGenerate('delete', { postId })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Content Engine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and manage SEO guides: city, area, and intent pages
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
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.drafts}</p>
          <p className="text-xs text-muted-foreground">Drafts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.cityGuides}</p>
          <p className="text-xs text-muted-foreground">City Guides</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-accent">{stats.areaGuides}</p>
          <p className="text-xs text-muted-foreground">Area Guides</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.intentPages}</p>
          <p className="text-xs text-muted-foreground">Intent Pages</p>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="mb-8 space-y-5 rounded-xl border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-bold text-foreground">Generate New Content</h2>

        {/* City Guide */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">City Guide (1,400--2,200 words)</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
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
        </div>

        {/* Area Guide */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Area/Borough Guide (1,000--1,600 words)</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">City</label>
              <Input
                placeholder="e.g. London"
                value={areaCityInput}
                onChange={(e) => setAreaCityInput(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Area/Borough</label>
              <Input
                placeholder="e.g. North London"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleGenerate('generate_area', { city: areaCityInput, area: areaInput, autoPublish: bulkAutoPublish })}
              disabled={loading || !areaCityInput || !areaInput}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Intent Page */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Intent Page (1,200--1,800 words)</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">City</label>
              <Input
                placeholder="e.g. London"
                value={intentCityInput}
                onChange={(e) => setIntentCityInput(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Intent</label>
              <select
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {INTENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => handleGenerate('generate_intent', { city: intentCityInput, intent: selectedIntent, autoPublish: bulkAutoPublish })}
              disabled={loading || !intentCityInput}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Region Guide */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Region Guide</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
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
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
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
            {loading ? 'Generating...' : 'Bulk City Guides'}
          </Button>
          <div className="flex items-center gap-2">
            <Input
              placeholder="City for all intents"
              value={bulkIntentCity}
              onChange={(e) => setBulkIntentCity(e.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              onClick={() => handleGenerate('bulk_generate_intent', { city: bulkIntentCity, autoPublish: bulkAutoPublish })}
              disabled={loading || !bulkIntentCity}
            >
              {loading ? 'Generating...' : 'All Intents'}
            </Button>
          </div>
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.includes('Error') || message.includes('already') || message.includes('failed') ? 'text-destructive' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-1 text-xs font-medium text-destructive">Errors ({errors.length}):</p>
            <ul className="max-h-40 overflow-y-auto space-y-0.5">
              {errors.map((err, i) => (
                <li key={i} className="text-xs text-destructive/80">{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div>
        <h2 className="mb-4 font-serif text-xl font-bold text-foreground">All Content ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No content yet. Use the controls above to generate your first guide.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                    <Badge
                      variant={post.status === 'published' ? 'default' : 'secondary'}
                      className={post.status === 'published' ? 'bg-emerald-600 text-white' : ''}
                    >
                      {post.status}
                    </Badge>
                    <Badge variant="outline" className={getContentTypeBadgeClass(post.content_type)}>
                      {getContentTypeLabel(post.content_type)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {post.city && <span>{post.city}</span>}
                    {post.area && <span>{post.area}</span>}
                    {post.intent && <span className="capitalize">{post.intent.replace(/-/g, ' ')}</span>}
                    <span>{post.word_count} words</span>
                    <span>{new Date(post.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {post.status === 'published' && (
                    <Link href={getViewUrl(post)} target="_blank">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={loading}
                  >
                    Delete
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
