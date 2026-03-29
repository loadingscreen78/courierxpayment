/**
 * Adapter layer that transforms booking form data into the lifecycle API schema.
 *
 * Each helper is exported for isolated testing. The main entry point is
 * `adaptBookingData` which orchestrates all transformations.
 */

import { MedicineBookingData } from '@/views/MedicineBooking';
import { DocumentBookingData } from '@/views/DocumentBooking';
import { GiftBookingData } from '@/views/GiftBooking';
import { calculateInternationalShippingCost } from '@/lib/shipping/rateCalculator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Pickup address shape shared by all three booking forms. */
interface PickupAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

/** Consignee address shape shared by all three booking forms. */
interface ConsigneeAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  zipcode: string;
}

export interface AdapterInput {
  formData: MedicineBookingData | DocumentBookingData | GiftBookingData;
  shipmentType: 'medicine' | 'document' | 'gift';
  draftId?: string | null;
}

export interface AdaptedBookingRequest {
  bookingReferenceId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  originAddress: string;
  destinationAddress: string;
  destinationCountry: string;
  weightKg: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  declaredValue: number;
  shipmentType: 'medicine' | 'document' | 'gift';
  shippingCost: number;
  gstAmount: number;
  totalAmount: number;
  // Structured pickup address for Nimbus domestic leg booking
  pickupAddress?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

// ---------------------------------------------------------------------------
// Address formatting
// ---------------------------------------------------------------------------

/**
 * Format an address object into a single text string matching the legacy
 * service pattern:
 *   "{line1}, {line2}, {city}, {stateOrCountry} - {postcodeOrZip}"
 *
 * When `addressLine2` is empty the trailing comma is omitted.
 */
export function formatAddress(
  addr: PickupAddress | ConsigneeAddress,
): string {
  const line2Part = addr.addressLine2 ? addr.addressLine2 + ', ' : '';
  // Pickup addresses use `state` + `pincode`; consignee addresses use `country` + `zipcode`.
  const regionKey = 'state' in addr && (addr as PickupAddress).state
    ? (addr as PickupAddress).state
    : (addr as ConsigneeAddress).country;
  const postcodeKey = 'pincode' in addr && (addr as PickupAddress).pincode
    ? (addr as PickupAddress).pincode
    : (addr as ConsigneeAddress).zipcode;

  return `${addr.addressLine1}, ${line2Part}${addr.city}, ${regionKey} - ${postcodeKey}`;
}

// ---------------------------------------------------------------------------
// Booking reference ID
// ---------------------------------------------------------------------------

/**
 * Generate a booking reference ID.
 * - With a draftId: deterministic `draft-{draftId}` (supports idempotent retries).
 * - Without: unique `booking-{uuid}`.
 */
export function generateBookingReferenceId(draftId?: string | null): string {
  if (draftId) {
    return `draft-${draftId}`;
  }
  return `booking-${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Weight computation
// ---------------------------------------------------------------------------

/**
 * Compute the shipment weight in kg using the type-specific formula.
 *
 * - medicine: sum(unitCount × 0.05)  — 50 g per unit
 * - document: max(weight/1000, L×W×H/5000)  — actual vs volumetric
 * - gift:     sum(quantity × 0.5)  — 500 g per item
 */
export function computeWeightKg(
  formData: MedicineBookingData | DocumentBookingData | GiftBookingData,
  type: 'medicine' | 'document' | 'gift',
): number {
  switch (type) {
    case 'medicine': {
      const data = formData as MedicineBookingData;
      return data.medicines.reduce((sum, med) => sum + med.unitCount * 0.05, 0);
    }
    case 'document': {
      const data = formData as DocumentBookingData;
      const actualKg = data.weight / 1000;
      const volumetricKg = (data.length * data.width * data.height) / 5000;
      return Math.max(actualKg, volumetricKg);
    }
    case 'gift': {
      const data = formData as GiftBookingData;
      return data.items.reduce((sum, item) => sum + item.units * 0.5, 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Declared value computation
// ---------------------------------------------------------------------------

/**
 * Compute the declared value using the type-specific formula.
 *
 * - medicine: sum(unitCount × unitPrice)
 * - document: 0 (no commercial value)
 * - gift:     sum(units × unitPrice)  per item
 */
export function computeDeclaredValue(
  formData: MedicineBookingData | DocumentBookingData | GiftBookingData,
  type: 'medicine' | 'document' | 'gift',
): number {
  switch (type) {
    case 'medicine': {
      const data = formData as MedicineBookingData;
      return data.medicines.reduce((sum, med) => sum + med.unitCount * med.unitPrice, 0);
    }
    case 'document':
      return 0;
    case 'gift': {
      const data = formData as GiftBookingData;
      return data.items.reduce((sum, item) => sum + item.units * item.unitPrice, 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Cost computation
// ---------------------------------------------------------------------------

/**
 * Compute shipping costs using the real rate card (Unified_Rate_Card.xlsx).
 *
 * Uses FedEx/Aramex rate tables with zone-based lookup, fuel surcharge,
 * export clearance, and 18% GST — matching the Calc_Logic sheet exactly.
 *
 * Add-on costs are NOT included here — they are handled separately by the
 * booking form after the lifecycle API call.
 */
export function computeCosts(
  formData: MedicineBookingData | DocumentBookingData | GiftBookingData,
  type: 'medicine' | 'document' | 'gift',
): { shippingCost: number; gstAmount: number; totalAmount: number } {
  const weightKg = computeWeightKg(formData, type);
  const countryCode = formData.consigneeAddress.country;

  // Try dimensions if available (document type has them)
  let dimensions: { length: number; width: number; height: number } | undefined;
  if (type === 'document') {
    const doc = formData as DocumentBookingData;
    dimensions = { length: doc.length, width: doc.width, height: doc.height };
  }

  const result = calculateInternationalShippingCost(countryCode, weightKg, dimensions);

  if (result) {
    return {
      shippingCost: Math.round(result.shippingCost),
      gstAmount: Math.round(result.gstAmount),
      totalAmount: Math.round(result.totalAmount),
    };
  }

  // Fallback if country not found in rate card (shouldn't happen for served countries)
  const fallbackBase = 2500 + Math.ceil(weightKg) * 300;
  const fallbackGst = Math.round(fallbackBase * 0.18);
  return {
    shippingCost: fallbackBase,
    gstAmount: fallbackGst,
    totalAmount: fallbackBase + fallbackGst,
  };
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

/**
 * Transform booking form data into a payload that conforms to the lifecycle
 * API's `bookingRequestSchema`.
 */
export function adaptBookingData(input: AdapterInput): AdaptedBookingRequest {
  const { formData, shipmentType, draftId } = input;

  const bookingReferenceId = generateBookingReferenceId(draftId);
  const originAddress = formatAddress(formData.pickupAddress as PickupAddress);
  const destinationAddress = formatAddress(
    formData.consigneeAddress as ConsigneeAddress,
  );
  const weightKg = computeWeightKg(formData, shipmentType);
  const declaredValue = computeDeclaredValue(formData, shipmentType);
  const costs = computeCosts(formData, shipmentType);

  const result: AdaptedBookingRequest = {
    bookingReferenceId,
    recipientName: formData.consigneeAddress.fullName,
    recipientPhone: formData.consigneeAddress.phone.replace(/[\s\-().]/g, '') || '0000000000',
    originAddress,
    destinationAddress,
    destinationCountry: formData.consigneeAddress.country,
    weightKg,
    declaredValue,
    shipmentType,
    shippingCost: costs.shippingCost,
    gstAmount: costs.gstAmount,
    totalAmount: costs.totalAmount,
    pickupAddress: {
      fullName: (formData.pickupAddress as PickupAddress).fullName,
      phone: (formData.pickupAddress as PickupAddress).phone.replace(/[\s\-().]/g, ''),
      addressLine1: (formData.pickupAddress as PickupAddress).addressLine1,
      addressLine2: (formData.pickupAddress as PickupAddress).addressLine2 || '',
      city: (formData.pickupAddress as PickupAddress).city,
      state: (formData.pickupAddress as PickupAddress).state,
      pincode: (formData.pickupAddress as PickupAddress).pincode,
    },
  };

  // Include email when present
  if (formData.consigneeAddress.email) {
    result.recipientEmail = formData.consigneeAddress.email;
  }

  // Include dimensions for document shipments
  if (shipmentType === 'document') {
    const doc = formData as DocumentBookingData;
    result.dimensions = {
      lengthCm: doc.length,
      widthCm: doc.width,
      heightCm: doc.height,
    };
  }

  return result;
}
