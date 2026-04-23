import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  readCookieFromRequest,
  setCookieOnResponse,
  COOKIE_KEYS,
} from '@/lib/cookies';

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/register',
  '/about',
  '/contact',
  '/blog',
  '/services',
  '/privacy-policy',
  '/refund-policy',
  '/chargeback-policy',
  '/data-retention-policy',
  '/kyc-policy',
  '/prohibited-items',
  '/public',
  '/rate-calculator',
  '/open-account',
  '/partner/login',
  '/dev-portal',
  '/signup',
  '/cxbc',
];

/** Auth routes that are disabled for public but accessible with dev cookie */
const DISABLED_AUTH_ROUTES = ['/auth', '/register', '/open-account', '/signup'];

/** Routes that require admin role */
const ADMIN_ROUTES = ['/admin'];

/** Admin routes that are publicly accessible (no auth needed) */
const PUBLIC_ADMIN_ROUTES = ['/admin/login'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isDisabledAuthRoute(pathname: string): boolean {
  return DISABLED_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function hasDevAccess(request: NextRequest): boolean {
  return !!readCookieFromRequest(request, 'cx_dev_access');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Dev portal gate page — always allow
  if (pathname.startsWith('/dev-portal')) {
    return response;
  }

  // Disabled auth routes: if user has dev cookie, let them through.
  // Otherwise the page itself shows "under development".
  // (Public routes are always allowed, so this just passes through.)
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Admin login is always accessible regardless of auth state
  if (PUBLIC_ADMIN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return response;
  }

  // Read auth cookie — accept either access token or refresh token
  // (access token is 7 days but refresh token is 30 days as fallback)
  const accessToken = readCookieFromRequest(request, COOKIE_KEYS.ACCESS_TOKEN);
  const refreshToken = readCookieFromRequest(request, COOKIE_KEYS.REFRESH_TOKEN);
  const hasSession = !!(accessToken || refreshToken);

  // If no session and trying to access protected route:
  // - Dev team (has dev cookie) → redirect to /auth so they can sign in
  // - Everyone else → redirect to home
  if (!hasSession) {
    if (hasDevAccess(request)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/auth';
      setCookieOnResponse(response, COOKIE_KEYS.REDIRECT_TO, pathname, {
        maxAge: 15 * 60,
      });
      return NextResponse.redirect(redirectUrl);
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  // Admin route guard — check admin cookie marker
  // Skip guard for /admin/login itself to prevent redirect loops
  if (isAdminRoute(pathname) && !PUBLIC_ADMIN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    const isAdmin = readCookieFromRequest(request, COOKIE_KEYS.ADMIN_SESSION);
    if (isAdmin !== '1') {
      // Admin cookie expired but they may still have a valid session
      // Redirect to login to re-establish the admin cookie (PIN not required again)
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin/login';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
