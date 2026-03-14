/**
 * Server-only HTTP client for the Nimbus domestic courier API.
 *
 * - Reads credentials from env vars (NIMBUS_BASE_URL, NIMBUS_EMAIL, NIMBUS_PASSWORD, NIMBUS_TOKEN)
 * - Caches auth token in-memory with expiry timestamp
 * - Re-authenticates automatically on 401 or token expiry
 * - Logs all requests/responses to api_logs via apiLogger (with PII masking)
 * - Retries failed calls up to 3 times with exponential backoff (1s, 3s, 9s)
 *
 * MUST NOT be imported from client-side code.
 * NIMBUS_* env vars are NOT prefixed with NEXT_PUBLIC_.
 */

import { logApiCall } from './apiLogger';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface NimbusCreateParams {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  weightKg: number;
  declaredValue: number;
  shipmentType: string;
}

export interface NimbusCreateResponse {
  success: boolean;
  awb?: string;
  error?: string;
}

export interface NimbusTrackResponse {
  success: boolean;
  rawStatus?: string;
  location?: string;
  timestamp?: string;
  error?: string;
}

export interface NimbusLabelResponse {
  success: boolean;
  labelUrl?: string;
  labelBase64?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

/** Visible for testing — resets the in-memory token cache. */
export function _resetTokenCache(): void {
  tokenCache = null;
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[nimbusClient] ${name} is not set. Add it to your .env.local file.`);
  }
  return value;
}

function baseUrl(): string {
  return getEnv('NIMBUS_BASE_URL').replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// Retry helper — exponential backoff 1s, 3s, 9s
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [1_000, 3_000, 9_000];
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes `fn` up to MAX_RETRIES times with exponential backoff.
 * Re-authenticates on 401 before retrying.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  onUnauthorized: () => Promise<void>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // On 401, refresh token and retry immediately (counts as an attempt)
      if (err instanceof NimbusApiError && err.httpStatus === 401 && attempt < MAX_RETRIES) {
        await onUnauthorized();
        continue;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class NimbusApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'NimbusApiError';
  }
}

// ---------------------------------------------------------------------------
// Correlation ID helper
// ---------------------------------------------------------------------------

function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// authenticate()
// ---------------------------------------------------------------------------

/**
 * Authenticates with the Nimbus API and caches the token.
 * If a static NIMBUS_TOKEN env var is set, uses that directly.
 * Otherwise calls the Nimbus /auth endpoint with email + password.
 */
export async function authenticate(): Promise<string> {
  // If a static token is configured, use it (useful for dev/test)
  const staticToken = process.env.NIMBUS_TOKEN;
  if (staticToken) {
    tokenCache = { token: staticToken, expiresAt: Date.now() + 3_600_000 }; // 1 hour
    return staticToken;
  }

  const url = `${baseUrl()}/auth`;
  const email = getEnv('NIMBUS_EMAIL');
  const password = getEnv('NIMBUS_PASSWORD');
  const correlationId = generateCorrelationId();
  const start = Date.now();

  let httpStatus = 0;
  let responseBody: Record<string, unknown> = {};

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    httpStatus = res.status;
    responseBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      throw new NimbusApiError(
        `Nimbus auth failed: ${res.status} ${res.statusText}`,
        res.status,
      );
    }

    const token = responseBody.token as string | undefined;
    if (!token) {
      throw new NimbusApiError('Nimbus auth response missing token', 500);
    }

    // Cache with 55-minute expiry (conservative buffer before typical 1h expiry)
    tokenCache = { token, expiresAt: Date.now() + 55 * 60 * 1_000 };
    return token;
  } finally {
    await logApiCall({
      shipmentId: null,
      apiType: 'nimbus_auth',
      requestPayload: { url, email, password },
      responsePayload: responseBody,
      httpStatus: httpStatus || 0,
      executionTimeMs: Date.now() - start,
      correlationId,
    }).catch((e) => console.error('[nimbusClient] Failed to log auth call:', e));
  }
}

/**
 * Returns a valid token, re-authenticating if the cached token is expired or missing.
 */
async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  return authenticate();
}

// ---------------------------------------------------------------------------
// createShipment()
// ---------------------------------------------------------------------------

/**
 * Creates a domestic shipment via Nimbus POST /create.
 * Auto-refreshes token on 401, retries up to 3 times with exponential backoff.
 * Logs request/response to api_logs with PII masking.
 */
export async function createShipment(
  params: NimbusCreateParams,
): Promise<NimbusCreateResponse> {
  const url = `${baseUrl()}/create`;
  const correlationId = generateCorrelationId();

  return withRetry(
    async () => {
      const token = await getToken();
      const start = Date.now();
      let httpStatus = 0;
      let responseBody: Record<string, unknown> = {};

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });

        httpStatus = res.status;
        responseBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (res.status === 401) {
          throw new NimbusApiError('Nimbus token expired or invalid', 401);
        }

        if (!res.ok) {
          throw new NimbusApiError(
            `Nimbus create failed: ${res.status} ${res.statusText}`,
            res.status,
          );
        }

        return {
          success: true,
          awb: responseBody.awb as string | undefined,
        };
      } finally {
        await logApiCall({
          shipmentId: null,
          apiType: 'nimbus_create',
          requestPayload: { url, ...params },
          responsePayload: responseBody,
          httpStatus: httpStatus || 0,
          executionTimeMs: Date.now() - start,
          correlationId,
        }).catch((e) => console.error('[nimbusClient] Failed to log create call:', e));
      }
    },
    async () => {
      tokenCache = null;
      await authenticate();
    },
  );
}

// ---------------------------------------------------------------------------
// fetchLabel()
// ---------------------------------------------------------------------------

/**
 * Fetches the AWB label for a domestic shipment via Nimbus GET /label.
 * Returns a URL or base64 PDF depending on what Nimbus provides.
 * Auto-refreshes token on 401, retries up to 3 times with exponential backoff.
 */
export async function fetchLabel(awb: string): Promise<NimbusLabelResponse> {
  const url = `${baseUrl()}/label?awb=${encodeURIComponent(awb)}`;
  const correlationId = generateCorrelationId();

  return withRetry(
    async () => {
      const token = await getToken();
      const start = Date.now();
      let httpStatus = 0;
      let responseBody: Record<string, unknown> = {};

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        httpStatus = res.status;

        if (res.status === 401) {
          throw new NimbusApiError('Nimbus token expired or invalid', 401);
        }

        // Nimbus may return PDF bytes directly or JSON with a URL
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/pdf')) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          responseBody = { type: 'pdf_bytes', size: buffer.byteLength };
          return { success: true, labelBase64: base64 };
        }

        responseBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (!res.ok) {
          throw new NimbusApiError(
            `Nimbus label fetch failed: ${res.status} ${res.statusText}`,
            res.status,
          );
        }

        return {
          success: true,
          labelUrl: responseBody.label_url as string | undefined,
          labelBase64: responseBody.label as string | undefined,
        };
      } finally {
        await logApiCall({
          shipmentId: null,
          apiType: 'nimbus_label',
          requestPayload: { url, awb },
          responsePayload: responseBody,
          httpStatus: httpStatus || 0,
          executionTimeMs: Date.now() - start,
          correlationId,
        }).catch((e) => console.error('[nimbusClient] Failed to log label call:', e));
      }
    },
    async () => {
      tokenCache = null;
      await authenticate();
    },
  );
}

// ---------------------------------------------------------------------------
// trackShipment()
// ---------------------------------------------------------------------------

/**
 * Tracks a domestic shipment via Nimbus GET /track.
 * Auto-refreshes token on 401, retries up to 3 times with exponential backoff.
 * Logs request/response to api_logs with PII masking.
 */
export async function trackShipment(awb: string): Promise<NimbusTrackResponse> {
  const url = `${baseUrl()}/track?awb=${encodeURIComponent(awb)}`;
  const correlationId = generateCorrelationId();

  return withRetry(
    async () => {
      const token = await getToken();
      const start = Date.now();
      let httpStatus = 0;
      let responseBody: Record<string, unknown> = {};

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        httpStatus = res.status;
        responseBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (res.status === 401) {
          throw new NimbusApiError('Nimbus token expired or invalid', 401);
        }

        if (!res.ok) {
          throw new NimbusApiError(
            `Nimbus track failed: ${res.status} ${res.statusText}`,
            res.status,
          );
        }

        return {
          success: true,
          rawStatus: responseBody.status as string | undefined,
          location: responseBody.location as string | undefined,
          timestamp: responseBody.timestamp as string | undefined,
        };
      } finally {
        await logApiCall({
          shipmentId: null,
          apiType: 'nimbus_track',
          requestPayload: { url, awb },
          responsePayload: responseBody,
          httpStatus: httpStatus || 0,
          executionTimeMs: Date.now() - start,
          correlationId,
        }).catch((e) => console.error('[nimbusClient] Failed to log track call:', e));
      }
    },
    async () => {
      tokenCache = null;
      await authenticate();
    },
  );
}
