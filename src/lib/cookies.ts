/**
 * Smart Cookie Manager for CourierX
 *
 * Centralized cookie utility using cookies-next.
 * Works in both client components and API routes (Next.js 14 App Router).
 *
 * Usage:
 *   Client:  import { cx } from '@/lib/cookies';
 *   Server:  import { cxServer } from '@/lib/cookies';
 */

import {
  getCookie,
  setCookie,
  deleteCookie,
  hasCookie,
  getCookies,
} from 'cookies-next';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage, ServerResponse } from 'http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options accepted by cookies-next v4 */
export interface CookieOptions {
  /** Cookie max-age in seconds */
  maxAge?: number;
  /** Expiry date */
  expires?: Date;
  /** URL path the cookie is valid for */
  path?: string;
  /** Domain the cookie is valid for */
  domain?: string;
  /** Only send over HTTPS */
  secure?: boolean;
  /** Prevent client-side JS access */
  httpOnly?: boolean;
  /** Cross-site request policy */
  sameSite?: 'strict' | 'lax' | 'none';
}

/** Server context for API routes / getServerSideProps */
export interface ServerCtx {
  req?: IncomingMessage & { cookies?: Partial<Record<string, string>> };
  res?: ServerResponse;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === 'production';

const DEFAULT_OPTS: CookieOptions = {
  path: '/',
  secure: IS_PROD,
  sameSite: 'lax',
};

/** 30 days in seconds */
const THIRTY_DAYS = 30 * 24 * 60 * 60;
/** 7 days in seconds */
const SEVEN_DAYS = 7 * 24 * 60 * 60;
/** 1 hour in seconds */
const ONE_HOUR = 60 * 60;
/** 15 minutes in seconds */
const FIFTEEN_MIN = 15 * 60;
/** 1 year in seconds */
const ONE_YEAR = 365 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Cookie key constants (single source of truth)
// ---------------------------------------------------------------------------

export const COOKIE_KEYS = {
  /** Supabase access token */
  ACCESS_TOKEN: 'cx_access_token',
  /** Supabase refresh token */
  REFRESH_TOKEN: 'cx_refresh_token',
  /** User ID (non-sensitive, for quick reads) */
  USER_ID: 'cx_uid',
  /** User role cache */
  USER_ROLE: 'cx_role',
  /** Theme preference */
  THEME: 'cx_theme',
  /** Language preference */
  LANG: 'cx_lang',
  /** Currency preference */
  CURRENCY: 'cx_currency',
  /** Onboarding completed flag */
  ONBOARDED: 'cx_onboarded',
  /** Last visited route (for redirect after login) */
  REDIRECT_TO: 'cx_redirect',
  /** Cookie consent accepted */
  CONSENT: 'cx_consent',
  /** Rate calculator cache */
  RATE_CACHE: 'cx_rate_cache',
  /** Shipping mode (international / domestic) */
  SHIP_MODE: 'cx_ship_mode',
  /** CXBC partner flag */
  IS_CXBC: 'cx_is_cxbc',
  /** Admin session marker */
  ADMIN_SESSION: 'cx_admin',
  /** CSRF token */
  CSRF: 'cx_csrf',
} as const;

export type CookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];

// ---------------------------------------------------------------------------
// CLIENT-SIDE helpers  (use in "use client" components)
// ---------------------------------------------------------------------------

function mergeOpts(custom?: CookieOptions): CookieOptions {
  return { ...DEFAULT_OPTS, ...custom };
}

export const cx = {
  // ---- Core CRUD ----

  /** Get a cookie value (client-side) */
  get(key: CookieKey | string): string | undefined {
    const val = getCookie(key);
    return val === undefined || val === null ? undefined : String(val);
  },

  /** Set a cookie (client-side). Defaults: path=/, secure in prod, sameSite=lax */
  set(key: CookieKey | string, value: string, opts?: CookieOptions): void {
    setCookie(key, value, mergeOpts(opts));
  },

  /** Delete a cookie (client-side) */
  remove(key: CookieKey | string, opts?: CookieOptions): void {
    deleteCookie(key, mergeOpts(opts));
  },

  /** Check if a cookie exists (client-side) */
  has(key: CookieKey | string): boolean {
    return hasCookie(key);
  },

  /** Get all cookies as a key-value object */
  getAll(): Record<string, string> {
    const raw = getCookies();
    const result: Record<string, string> = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        if (v !== undefined && v !== null) result[k] = String(v);
      }
    }
    return result;
  },

  // ---- Auth shortcuts ----

  /** Store auth tokens from Supabase session */
  setAuth(accessToken: string, refreshToken: string): void {
    cx.set(COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
      maxAge: ONE_HOUR,
      httpOnly: false, // client needs to read for Supabase SDK
      sameSite: 'lax',
    });
    cx.set(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
      maxAge: THIRTY_DAYS,
      httpOnly: false,
      sameSite: 'lax',
    });
  },

  /** Read stored access token */
  getAccessToken(): string | undefined {
    return cx.get(COOKIE_KEYS.ACCESS_TOKEN);
  },

  /** Read stored refresh token */
  getRefreshToken(): string | undefined {
    return cx.get(COOKIE_KEYS.REFRESH_TOKEN);
  },

  /** Clear all auth-related cookies */
  clearAuth(): void {
    cx.remove(COOKIE_KEYS.ACCESS_TOKEN);
    cx.remove(COOKIE_KEYS.REFRESH_TOKEN);
    cx.remove(COOKIE_KEYS.USER_ID);
    cx.remove(COOKIE_KEYS.USER_ROLE);
    cx.remove(COOKIE_KEYS.ADMIN_SESSION);
    cx.remove(COOKIE_KEYS.IS_CXBC);
  },

  // ---- User preference shortcuts ----

  /** Save user ID for quick non-auth reads */
  setUserId(uid: string): void {
    cx.set(COOKIE_KEYS.USER_ID, uid, { maxAge: THIRTY_DAYS });
  },

  getUserId(): string | undefined {
    return cx.get(COOKIE_KEYS.USER_ID);
  },

  setRole(role: string): void {
    cx.set(COOKIE_KEYS.USER_ROLE, role, { maxAge: SEVEN_DAYS });
  },

  getRole(): string | undefined {
    return cx.get(COOKIE_KEYS.USER_ROLE);
  },

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    cx.set(COOKIE_KEYS.THEME, theme, { maxAge: ONE_YEAR });
  },

  getTheme(): string | undefined {
    return cx.get(COOKIE_KEYS.THEME);
  },

  setLang(lang: string): void {
    cx.set(COOKIE_KEYS.LANG, lang, { maxAge: ONE_YEAR });
  },

  getLang(): string | undefined {
    return cx.get(COOKIE_KEYS.LANG);
  },

  setCurrency(currency: string): void {
    cx.set(COOKIE_KEYS.CURRENCY, currency, { maxAge: ONE_YEAR });
  },

  getCurrency(): string | undefined {
    return cx.get(COOKIE_KEYS.CURRENCY);
  },

  // ---- Shipping / Business ----

  setShippingMode(mode: 'international' | 'domestic'): void {
    cx.set(COOKIE_KEYS.SHIP_MODE, mode, { maxAge: SEVEN_DAYS });
  },

  getShippingMode(): 'international' | 'domestic' | undefined {
    return cx.get(COOKIE_KEYS.SHIP_MODE) as 'international' | 'domestic' | undefined;
  },

  setCxbcPartner(isCxbc: boolean): void {
    cx.set(COOKIE_KEYS.IS_CXBC, isCxbc ? '1' : '0', { maxAge: THIRTY_DAYS });
  },

  isCxbcPartner(): boolean {
    return cx.get(COOKIE_KEYS.IS_CXBC) === '1';
  },

  setAdminSession(active: boolean): void {
    if (active) {
      cx.set(COOKIE_KEYS.ADMIN_SESSION, '1', { maxAge: ONE_HOUR });
    } else {
      cx.remove(COOKIE_KEYS.ADMIN_SESSION);
    }
  },

  isAdminSession(): boolean {
    return cx.get(COOKIE_KEYS.ADMIN_SESSION) === '1';
  },

  // ---- Redirect / Navigation ----

  /** Save the path user was trying to visit (for post-login redirect) */
  setRedirectTo(path: string): void {
    cx.set(COOKIE_KEYS.REDIRECT_TO, path, { maxAge: FIFTEEN_MIN });
  },

  /** Pop the redirect path (reads and deletes) */
  popRedirectTo(): string | undefined {
    const path = cx.get(COOKIE_KEYS.REDIRECT_TO);
    if (path) cx.remove(COOKIE_KEYS.REDIRECT_TO);
    return path;
  },

  // ---- Onboarding ----

  markOnboarded(): void {
    cx.set(COOKIE_KEYS.ONBOARDED, '1', { maxAge: ONE_YEAR });
  },

  isOnboarded(): boolean {
    return cx.get(COOKIE_KEYS.ONBOARDED) === '1';
  },

  // ---- Consent ----

  acceptConsent(): void {
    cx.set(COOKIE_KEYS.CONSENT, '1', { maxAge: ONE_YEAR });
  },

  hasConsent(): boolean {
    return cx.get(COOKIE_KEYS.CONSENT) === '1';
  },

  // ---- Rate cache (JSON blob, short TTL) ----

  cacheRate(data: Record<string, unknown>): void {
    cx.set(COOKIE_KEYS.RATE_CACHE, JSON.stringify(data), { maxAge: FIFTEEN_MIN });
  },

  getCachedRate<T = Record<string, unknown>>(): T | null {
    const raw = cx.get(COOKIE_KEYS.RATE_CACHE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  clearRateCache(): void {
    cx.remove(COOKIE_KEYS.RATE_CACHE);
  },

  // ---- CSRF ----

  /** Generate and store a CSRF token */
  generateCsrf(): string {
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    cx.set(COOKIE_KEYS.CSRF, token, { maxAge: ONE_HOUR, sameSite: 'strict' });
    return token;
  },

  getCsrf(): string | undefined {
    return cx.get(COOKIE_KEYS.CSRF);
  },

  // ---- Bulk operations ----

  /** Clear ALL courierx cookies */
  clearAll(): void {
    for (const key of Object.values(COOKIE_KEYS)) {
      cx.remove(key);
    }
  },
};


// ---------------------------------------------------------------------------
// SERVER-SIDE helpers  (use in API routes, middleware, getServerSideProps)
// ---------------------------------------------------------------------------

/**
 * Server-side cookie manager. Pass `{ req, res }` from your API route
 * or getServerSideProps context.
 *
 * Example:
 *   import { cxServer } from '@/lib/cookies';
 *   export async function GET(req: NextRequest) {
 *     const server = cxServer({ req, res });
 *     const token = server.get(COOKIE_KEYS.ACCESS_TOKEN);
 *   }
 */
export function cxServer(ctx: ServerCtx) {
  function mergeServerOpts(custom?: CookieOptions) {
    return { ...DEFAULT_OPTS, ...custom, req: ctx.req, res: ctx.res };
  }

  return {
    get(key: CookieKey | string): string | undefined {
      const val = getCookie(key, { req: ctx.req, res: ctx.res });
      return val === undefined || val === null ? undefined : String(val);
    },

    set(key: CookieKey | string, value: string, opts?: CookieOptions): void {
      setCookie(key, value, mergeServerOpts(opts));
    },

    remove(key: CookieKey | string, opts?: CookieOptions): void {
      deleteCookie(key, mergeServerOpts(opts));
    },

    has(key: CookieKey | string): boolean {
      return hasCookie(key, { req: ctx.req, res: ctx.res });
    },

    getAll(): Record<string, string> {
      const raw = getCookies({ req: ctx.req, res: ctx.res });
      const result: Record<string, string> = {};
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (v !== undefined && v !== null) result[k] = String(v);
        }
      }
      return result;
    },

    // ---- Auth shortcuts (server) ----

    setAuth(accessToken: string, refreshToken: string): void {
      this.set(COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
        maxAge: ONE_HOUR,
        httpOnly: true,
        sameSite: 'lax',
      });
      this.set(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
        maxAge: THIRTY_DAYS,
        httpOnly: true,
        sameSite: 'lax',
      });
    },

    getAccessToken(): string | undefined {
      return this.get(COOKIE_KEYS.ACCESS_TOKEN);
    },

    getRefreshToken(): string | undefined {
      return this.get(COOKIE_KEYS.REFRESH_TOKEN);
    },

    clearAuth(): void {
      this.remove(COOKIE_KEYS.ACCESS_TOKEN);
      this.remove(COOKIE_KEYS.REFRESH_TOKEN);
      this.remove(COOKIE_KEYS.USER_ID);
      this.remove(COOKIE_KEYS.USER_ROLE);
      this.remove(COOKIE_KEYS.ADMIN_SESSION);
      this.remove(COOKIE_KEYS.IS_CXBC);
    },

    /** Verify the CSRF token from a request header/body matches the cookie */
    verifyCsrf(tokenFromRequest: string): boolean {
      const stored = this.get(COOKIE_KEYS.CSRF);
      if (!stored || !tokenFromRequest) return false;
      return stored === tokenFromRequest;
    },

    clearAll(): void {
      for (const key of Object.values(COOKIE_KEYS)) {
        this.remove(key);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Next.js App Router helpers (for use with NextRequest/NextResponse)
// ---------------------------------------------------------------------------

/**
 * Read a cookie from a NextRequest (App Router API routes / middleware).
 * NextRequest has its own cookie API, this is a convenience wrapper.
 */
export function readCookieFromRequest(
  req: { cookies: { get: (name: string) => { value: string } | undefined } },
  key: CookieKey | string
): string | undefined {
  return req.cookies.get(key)?.value;
}

/**
 * Set a cookie on a NextResponse (App Router API routes / middleware).
 */
export function setCookieOnResponse(
  res: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: {
          maxAge?: number;
          path?: string;
          secure?: boolean;
          httpOnly?: boolean;
          sameSite?: 'strict' | 'lax' | 'none';
        }
      ) => void;
    };
  },
  key: CookieKey | string,
  value: string,
  opts?: CookieOptions
): void {
  const merged = { ...DEFAULT_OPTS, ...opts };
  res.cookies.set(key, value, {
    maxAge: merged.maxAge,
    path: merged.path,
    secure: merged.secure,
    httpOnly: merged.httpOnly,
    sameSite: merged.sameSite,
  });
}

/**
 * Delete a cookie on a NextResponse.
 */
export function deleteCookieFromResponse(
  res: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: { maxAge?: number; path?: string }
      ) => void;
    };
  },
  key: CookieKey | string
): void {
  res.cookies.set(key, '', { maxAge: 0, path: '/' });
}
