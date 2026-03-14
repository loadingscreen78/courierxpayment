import { getServiceRoleClient } from './supabaseAdmin';

/**
 * Keys whose values should be masked before logging.
 * Matched case-insensitively against payload object keys.
 */
const SENSITIVE_KEYS = /token|password|phone|email|aadhaar|pan/i;

/**
 * Deep-clones a payload and replaces values for keys matching
 * token, password, phone, email, aadhaar, pan with '***'.
 * Handles nested objects and arrays recursively.
 */
export function maskSensitiveFields(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '***';
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? maskSensitiveFields(item as Record<string, unknown>)
          : item
      );
    } else if (value !== null && typeof value === 'object') {
      result[key] = maskSensitiveFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Logs an external API call to the `api_logs` table with sensitive
 * fields masked in both request and response payloads.
 */
export async function logApiCall(params: {
  shipmentId: string | null;
  apiType: 'nimbus_create' | 'nimbus_track' | 'nimbus_auth' | 'nimbus_label';
  requestPayload: unknown;
  responsePayload: unknown;
  httpStatus: number;
  executionTimeMs: number;
  correlationId: string;
}): Promise<void> {
  const client = getServiceRoleClient();

  const maskedRequest =
    params.requestPayload !== null && typeof params.requestPayload === 'object'
      ? maskSensitiveFields(params.requestPayload as Record<string, unknown>)
      : params.requestPayload ?? {};

  const maskedResponse =
    params.responsePayload !== null && typeof params.responsePayload === 'object'
      ? maskSensitiveFields(params.responsePayload as Record<string, unknown>)
      : params.responsePayload ?? {};

  const { error } = await client.from('api_logs').insert({
    shipment_id: params.shipmentId,
    api_type: params.apiType,
    request_payload: maskedRequest,
    response_payload: maskedResponse,
    http_status: params.httpStatus,
    execution_time_ms: params.executionTimeMs,
    correlation_id: params.correlationId,
  });

  if (error) {
    console.error('[apiLogger] Failed to insert api_logs row:', error.message);
  }
}
