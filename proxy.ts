import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { canAccessPortalRoute, getDefaultPortalRoute } from './lib/role-routing';
import { normalizeRole } from './types/roles';

// SOURCE OF TRUTH NOTE
// This edge proxy (Next.js 16's renamed `middleware.ts`) reads the JWT from the
// `beba_access_token` cookie and calls jwtDecode() on it — a base64 decode with
// NO signature verification. That is intentional, not an oversight: verifying a
// JWT signature at the edge would require distributing the signing secret/JWKS
// to this runtime, which is a bigger trust boundary than route-guard UX needs.
// Treat everything this file decides as advisory routing/UX only:
//   - It redirects unauthenticated/wrong-role users away from a portal route
//     before the page renders, so they don't see a flash of the wrong UI.
//   - It does NOT authenticate or authorize anything. A forged or expired
//     token that happens to decode without throwing could pass this check.
// The NestJS backend remains the absolute source of truth for cryptographic
// JWT verification and RBAC enforcement (RolesGuard + JwtStrategy) on every
// request — nothing here should ever be treated as a substitute for that, and
// no data-fetching or mutation should rely on this file having run correctly.

const ADMIN_ROUTES = ['/admin'];
const MEMBER_ROUTES = ['/member'];
const PUBLIC_ROUTES = [
  '/',
  '/403',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/membership',
  '/about',
  '/contact',
  '/products',
];

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  exp: number;
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getRoleFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return normalizeRole(decoded.role);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('beba_access_token')?.value ?? '';

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isTokenExpired(token)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    loginUrl.searchParams.set('reason', 'expired');
    return NextResponse.redirect(loginUrl);
  }

  const role = getRoleFromToken(token);
  const isProtectedPortalRoute =
    ADMIN_ROUTES.some((p) => pathname.startsWith(p)) ||
    MEMBER_ROUTES.some((p) => pathname.startsWith(p));

  if (isProtectedPortalRoute && !canAccessPortalRoute(role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultPortalRoute(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|static).*)'],
};
