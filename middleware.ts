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
];

/** Routes that require admin role */
const ADMIN_ROUTES = ['/admin'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Always allow public routes and API/static
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Read auth cookie
  const accessToken = readCookieFromRequest(request, COOKIE_KEYS.ACCESS_TOKEN);

  // If no token and trying to access protected route → redirect to home
  // (account system is currently disabled / under development)
  if (!accessToken) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  // Admin route guard — check admin cookie marker
  if (isAdminRoute(pathname)) {
    const isAdmin = readCookieFromRequest(request, COOKIE_KEYS.ADMIN_SESSION);
    if (isAdmin !== '1') {
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
