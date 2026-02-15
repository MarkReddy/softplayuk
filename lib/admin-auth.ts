import { NextResponse } from 'next/server'

/**
 * Simple admin auth via ADMIN_SECRET env var.
 * Checks the Authorization header for "Bearer <secret>" or
 * a cookie named "admin_token".
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function verifyAdmin(request: Request): NextResponse | null {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    // If no secret is configured, block all admin access
    return NextResponse.json(
      { error: 'Admin access not configured. Set ADMIN_SECRET env var.' },
      { status: 503 },
    )
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return null

  // Check cookie
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (match && match[1] === secret) return null

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
