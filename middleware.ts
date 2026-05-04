/**
 * Next.js Middleware – Edge-level role-based routing & tenant header injection
 *
 * Responsibilities:
 *   1. Redirect unauthenticated users to /login
 *   2. Redirect authenticated users with wrong role away from restricted areas
 *   3. Inject X-Tenant-ID into outgoing request headers (for API routes)
 *   4. Handle JWT expiry grace (soft redirect, let client refresh)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

// ─── Route matchers ───────────────────────────────────────────────────────────

const ADMIN_ROUTES = ['/admin']
const MEMBER_ROUTES = ['/member']
const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/reset-password', '/change-password', '/membership', '/about', '/contact', '/products']

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'TELLER', 'AUDITOR', 'LOAN_OFFICER']
const MEMBER_ROLES = ['MEMBER']

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string
  email: string
  role: string
  tenantId: string
  exp: number
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function getRoleFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    return decoded.role
  } catch {
    return null
  }
}

function getTenantIdFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    return decoded.tenantId
  } catch {
    return null
  }
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('beba_access_token')?.value ?? ''

  // Allow Next.js internals, API routes, and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next()
  }

  // Public routes need no auth
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // No token → redirect to login (with return URL)
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = getRoleFromToken(token)
  const isAdmin = ADMIN_ROLES.includes(role ?? '')
  const isMember = MEMBER_ROLES.includes(role ?? '')

  // Expired token → let client-side refresh handle it, but redirect if stale
  if (isTokenExpired(token)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', pathname)
    loginUrl.searchParams.set('reason', 'expired')
    return NextResponse.redirect(loginUrl)
  }

  // Role-based routing guards
  if (ADMIN_ROUTES.some((p) => pathname.startsWith(p))) {
    if (!isAdmin) {
      // Members trying admin → redirect to member dashboard
      return NextResponse.redirect(new URL('/member/dashboard', request.url))
    }
  }

  if (MEMBER_ROUTES.some((p) => pathname.startsWith(p))) {
    if (!isMember && !isAdmin) {
      // Unknown role → login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Admins CAN access member routes (for support/impersonation)
  }

  // Inject tenant ID into headers for API route proxying
  const tenantId = getTenantIdFromToken(token)
  if (tenantId) {
    const response = NextResponse.next()
    response.headers.set('X-Tenant-ID', tenantId)
    return response
  }

  return NextResponse.next()
}

// ─── Matcher config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|static).*)',
  ],
}
