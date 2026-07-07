/**
 * proxy.ts (the edge auth/role guard) calls jwtDecode() on the access token
 * cookie and checks its `exp` claim — a plain string like "mock-token"
 * throws inside jwtDecode(), which proxy.ts treats as "expired" and bounces
 * straight back to /login. Mocked login responses need a structurally real
 * (base64url header.payload.signature) JWT with the claims proxy.ts and
 * lib/auth-context.tsx actually read, even though the signature itself is
 * never verified client-side.
 */

function base64url(input: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function createMockJwt(claims: {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  expiresInSeconds?: number;
}): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    sub: claims.sub,
    email: claims.email,
    role: claims.role,
    tenantId: claims.tenantId,
    firstName: claims.firstName,
    lastName: claims.lastName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (claims.expiresInSeconds ?? 15 * 60),
  });
  // Signature is never verified client-side (proxy.ts only decodes), so any
  // fixed placeholder segment is fine here.
  return `${header}.${payload}.mock-signature`;
}
