/**
 * Server-only NimbusPost domestic API client.
 * Handles rate checking and shipment creation for domestic (India-to-India) shipments.
 *
 * Uses the same NIMBUS_* env vars as the international client.
 * MUST NOT be imported from client-side code.
 */

import { MARKUP_MULTIPLIER } from './types';
import type { CourierOption, CourierMode, RateCheckRequest } from './types';

const NIMBUS_API_BASE = 'https://api.nimbuspost.com/v1';

// ---------------------------------------------------------------------------
// Auth — reuse token caching pattern
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function authenticate(): Promise<string> {
  const email = process.env.NIMBUS_EMAIL;
  const password = process.env.NIMBUS_PASSWORD;

  if (!email || !password) {
    throw new Error('[nimbusPostDomestic] NIMBUS_EMAIL / NIMBUS_PASSWORD not set');
  }

  const res = await fetch(`${NIMBUS_API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`[nimbusPostDomestic] Auth failed: ${res.status}`);
  }

  const data = await res.json();
  const token = data?.data;

  if (!token) {
    throw new Error('[nimbusPostDomestic] No token in auth response');
  }

  // Cache for 23 hours
  tokenCache = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  return authenticate();
}

// ---------------------------------------------------------------------------
// Rate Check — fetch available couriers for a domestic route
// ---------------------------------------------------------------------------

export async function fetchDomesticRates(req: RateCheckRequest): Promise<CourierOption[]> {
  const token = await getToken();

  // NimbusPost expects: origin/destination pincodes, payment_type, weight in GRAMS (integer)
  const payload = {
    origin: req.pickupPincode,
    destination: req.deliveryPincode,
    payment_type: 'prepaid',
    order_amount: req.declaredValue,
    weight: Math.round(req.weightKg * 1000), // kg → grams, must be integer
    length: req.lengthCm,
    breadth: req.widthCm,
    height: req.heightCm,
  };

  const res = await fetch(`${NIMBUS_API_BASE}/courier/serviceability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // If 401, clear cache and retry once
    if (res.status === 401) {
      tokenCache = null;
      const newToken = await authenticate();
      const retryRes = await fetch(`${NIMBUS_API_BASE}/courier/serviceability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!retryRes.ok) {
        throw new Error(`NimbusPost rate check failed: ${retryRes.status}`);
      }
      const retryData = await retryRes.json();
      return mapCourierResponse(retryData);
    }
    throw new Error(`NimbusPost rate check failed: ${res.status}`);
  }

  const data = await res.json();
  console.log('[nimbusPostDomestic] Raw response keys:', Object.keys(data), 'rates count:', data?.rates?.length ?? 'N/A');
  return mapCourierResponse(data);
}

function mapCourierResponse(data: any): CourierOption[] {
  // NimbusPost actual response: { status: true, data: [...] }
  // Each item: { id, name, freight_charges, cod_charges, total_charges, edd, min_weight, chargeable_weight }
  const couriers = Array.isArray(data?.data) ? data.data : [];

  if (couriers.length === 0) {
    return [];
  }

  // Filter to only couriers with valid freight charges
  const valid = couriers.filter((c: any) => c.freight_charges > 0);

  // Sort by freight_charges ascending
  const sorted = valid.sort((a: any, b: any) => a.freight_charges - b.freight_charges);

  return sorted.map((c: any, idx: number) => {
    const shippingCharge = Math.round(c.freight_charges * MARKUP_MULTIPLIER);
    const gstAmount = Math.round(shippingCharge * 0.18);
    const customerPrice = shippingCharge + gstAmount;

    // Infer mode from courier name — "Air" in name = air, BlueDart is always air, otherwise surface
    const nameUpper = (c.name || '').toUpperCase();
    const mode: CourierMode = (nameUpper.includes('AIR') || nameUpper.includes('BLUEDART') || nameUpper.includes('BLUE DART')) ? 'air' : 'surface';

    // Parse EDD to get estimated delivery days
    let estimatedDays = 3;
    if (c.edd) {
      try {
        const [day, month, year] = c.edd.split('-').map(Number);
        const eddDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffMs = eddDate.getTime() - today.getTime();
        estimatedDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      } catch {
        estimatedDays = 3;
      }
    }

    return {
      courier_company_id: Number(c.id),
      courier_name: c.name || 'Unknown Courier',
      freight_charge: Math.round(c.freight_charges),
      shipping_charge: shippingCharge,
      gst_amount: gstAmount,
      customer_price: customerPrice,
      estimated_delivery_days: estimatedDays,
      etd: c.edd || '',
      rating: 0,
      rto_charges: 0,
      cod: (c.cod_charges || 0) > 0,
      cod_charges: Math.round((c.cod_charges || 0) * MARKUP_MULTIPLIER),
      pickup_availability: true,
      is_recommended: idx === 0,
      mode,
    };
  });
}

// ---------------------------------------------------------------------------
// Create Domestic Shipment — book with NimbusPost and get AWB
// ---------------------------------------------------------------------------

export interface CreateDomesticShipmentParams {
  courier_id: number;
  pickup: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  delivery: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  order_amount: number;
  weight: number;
  length: number;
  breadth: number;
  height: number;
  payment_type: 'prepaid';
  content_description: string;
  /** Optional custom order number (e.g. CRX tracking number). Auto-generated if omitted. */
  order_number?: string;
  /** Optional NimbusPost warehouse name. Defaults to NIMBUS_WAREHOUSE_NAME env var or 'default'. */
  warehouse_name?: string;
}

export interface CreateDomesticShipmentResponse {
  success: boolean;
  awb?: string;
  order_id?: string;
  label_url?: string;
  error?: string;
}

export async function createDomesticShipment(
  params: CreateDomesticShipmentParams,
): Promise<CreateDomesticShipmentResponse> {
  const token = await getToken();

  const orderNumber = params.order_number || `CXD-${Date.now()}`;
  const weightGrams = Math.max(1, Math.round(params.weight * 1000));

  const payload = {
    order_number: orderNumber,
    shipping_charges: 0,
    discount: 0,
    cod_charges: 0,
    payment_type: params.payment_type,
    order_amount: params.order_amount,
    package_weight: weightGrams,
    package_length: Math.max(1, Math.round(params.length)),
    package_breadth: Math.max(1, Math.round(params.breadth)),
    package_height: Math.max(1, Math.round(params.height)),
    consignee: {
      name: params.delivery.name,
      address: params.delivery.address,
      address_2: '',
      city: params.delivery.city,
      state: params.delivery.state,
      pincode: String(params.delivery.pincode),
      phone: String(params.delivery.phone),
    },
    pickup: {
      warehouse_name: params.warehouse_name || process.env.NIMBUS_WAREHOUSE_NAME || 'default',
      name: params.pickup.name,
      address: params.pickup.address,
      address_2: '',
      city: params.pickup.city,
      state: params.pickup.state,
      pincode: String(params.pickup.pincode),
      phone: String(params.pickup.phone),
    },
    order_items: [
      {
        name: params.content_description || 'Domestic Shipment',
        qty: 1,
        price: params.order_amount,
      },
    ],
    courier_id: params.courier_id,
  };

  console.log('[nimbusPostDomestic] Creating shipment:', JSON.stringify({
    order_number: orderNumber,
    courier_id: params.courier_id,
    weight_g: weightGrams,
    pickup_pin: params.pickup.pincode,
    delivery_pin: params.delivery.pincode,
    pickup_state: params.pickup.state,
    delivery_state: params.delivery.state,
    warehouse_name: params.warehouse_name || process.env.NIMBUS_WAREHOUSE_NAME || 'default',
  }));

  console.log('[nimbusPostDomestic] Full payload:', JSON.stringify(payload));

  const res = await fetch(`${NIMBUS_API_BASE}/shipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[nimbusPostDomestic] Create shipment failed:', res.status, errBody);
    return { success: false, error: `NimbusPost shipment creation failed: ${res.status} ${errBody}` };
  }

  const data = await res.json();

  console.log('[nimbusPostDomestic] Create order response:', JSON.stringify(data));

  if (data?.status === false) {
    console.error('[nimbusPostDomestic] createDomesticShipment failed response:', JSON.stringify(data));
    return { success: false, error: data?.message || 'Shipment creation failed' };
  }

  const shipmentData = data?.data;
  const nimbusOrderId = shipmentData?.id || shipmentData?.order_id;

  // If AWB already assigned in create response, return it
  if (shipmentData?.awb_number || shipmentData?.awb) {
    return {
      success: true,
      awb: shipmentData.awb_number || shipmentData.awb,
      order_id: nimbusOrderId?.toString(),
      label_url: shipmentData.label || shipmentData.label_url,
    };
  }

  // ── Step 2: Ship the order to get AWB ──
  // NimbusPost requires a separate call to assign AWB and generate label
  if (nimbusOrderId) {
    console.log('[nimbusPostDomestic] Order created, now shipping. NimbusPost order_id:', nimbusOrderId);
    try {
      const shipRes = await fetch(`${NIMBUS_API_BASE}/shipments/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [nimbusOrderId] }),
      });

      const shipData = await shipRes.json();
      console.log('[nimbusPostDomestic] Ship response:', JSON.stringify(shipData));

      if (shipRes.ok && shipData?.status !== false) {
        // Ship response can be in different formats
        const shipResult = Array.isArray(shipData?.data) ? shipData.data[0] : shipData?.data;
        const awb = shipResult?.awb_number || shipResult?.awb || shipResult?.tracking_number;
        const label = shipResult?.label || shipResult?.label_url || shipResult?.shipping_label;

        if (awb) {
          return {
            success: true,
            awb,
            order_id: nimbusOrderId.toString(),
            label_url: label || '',
          };
        }

        // AWB might take a moment — return order_id so we can check later
        console.warn('[nimbusPostDomestic] Ship call succeeded but no AWB in response');
        return {
          success: true,
          awb: `NP-${nimbusOrderId}`,
          order_id: nimbusOrderId.toString(),
          label_url: '',
        };
      } else {
        console.error('[nimbusPostDomestic] Ship call failed:', JSON.stringify(shipData));
        // Order was created but shipping failed — return partial success
        return {
          success: true,
          awb: `NP-${nimbusOrderId}`,
          order_id: nimbusOrderId.toString(),
          label_url: '',
          error: shipData?.message || 'AWB assignment pending',
        };
      }
    } catch (shipErr) {
      console.error('[nimbusPostDomestic] Ship call exception:', shipErr);
      return {
        success: true,
        awb: `NP-${nimbusOrderId}`,
        order_id: nimbusOrderId.toString(),
        label_url: '',
        error: 'AWB assignment pending — will be processed manually',
      };
    }
  }

  // Fallback — no order_id in response
  return {
    success: true,
    awb: shipmentData?.awb_number || shipmentData?.awb || `CXD-${Date.now()}`,
    order_id: nimbusOrderId?.toString(),
    label_url: shipmentData?.label || shipmentData?.label_url || '',
  };
}

// ---------------------------------------------------------------------------
// Track Domestic Shipment — real-time status from NimbusPost
// ---------------------------------------------------------------------------

export interface NimbusTrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  remarks?: string;
}

export interface TrackDomesticShipmentResponse {
  success: boolean;
  awb?: string;
  currentStatus?: string;
  currentLocation?: string;
  events?: NimbusTrackingEvent[];
  error?: string;
}

/**
 * Fetches real-time tracking data for a domestic AWB from NimbusPost.
 * Returns the full event history so we can build a complete timeline.
 *
 * NimbusPost tracking endpoint: POST /v1/courier/track
 * Body: { awb_number: string }
 * Response: { status: true, data: { current_status, current_location, tracking_data: [...] } }
 */
export async function trackDomesticShipment(
  awb: string,
): Promise<TrackDomesticShipmentResponse> {
  const token = await getToken();

  const res = await fetch(`${NIMBUS_API_BASE}/courier/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ awb_number: awb }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      tokenCache = null;
      const newToken = await authenticate();
      const retry = await fetch(`${NIMBUS_API_BASE}/courier/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body: JSON.stringify({ awb_number: awb }),
      });
      if (!retry.ok) {
        return { success: false, error: `NimbusPost track failed: ${retry.status}` };
      }
      const retryData = await retry.json();
      return parseTrackResponse(retryData, awb);
    }
    return { success: false, error: `NimbusPost track failed: ${res.status}` };
  }

  const data = await res.json();
  return parseTrackResponse(data, awb);
}

function parseTrackResponse(data: any, awb?: string): TrackDomesticShipmentResponse {
  if (!data?.status && !data?.data) {
    return { success: false, error: 'Invalid response from NimbusPost' };
  }

  const trackData = data?.data;
  if (!trackData) {
    return { success: false, error: 'No tracking data in response' };
  }

  // NimbusPost returns tracking_data as array of events
  const rawEvents: any[] = Array.isArray(trackData.tracking_data)
    ? trackData.tracking_data
    : Array.isArray(trackData.scans)
      ? trackData.scans
      : [];

  const events: NimbusTrackingEvent[] = rawEvents.map((e: any) => ({
    status: e.status || e.Status || e.activity || '',
    location: e.location || e.Location || e.city || '',
    timestamp: e.timestamp || e.date || e.DateTime || e.created_at || '',
    remarks: e.remarks || e.Remarks || e.description || '',
  }));

  return {
    success: true,
    awb,
    currentStatus: trackData.current_status || trackData.status || (events[events.length - 1]?.status ?? ''),
    currentLocation: trackData.current_location || trackData.location || (events[events.length - 1]?.location ?? ''),
    events,
  };
}
