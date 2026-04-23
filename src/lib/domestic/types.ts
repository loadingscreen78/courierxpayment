/**
 * Types for the Domestic Shipping panel.
 * Documents: up to 1 kg
 * Gifts/Duty: up to 60 kg, max ₹49,000 declared value
 */

export type DomesticShipmentType = 'document' | 'gift' | 'laptop';

export interface DomesticAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface DomesticBookingData {
  shipmentType: DomesticShipmentType;
  // Package details
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  contentDescription: string;
  // Declarations
  prohibitedItemsConfirmed: boolean;
  // Addresses
  pickupAddress: DomesticAddress;
  deliveryAddress: DomesticAddress;
  // Selected courier
  selectedCourier: CourierOption | null;
}

export type CourierMode = 'surface' | 'air';

export interface CourierOption {
  courier_company_id: number;
  courier_name: string;
  freight_charge: number;       // actual NimbusPost cost
  customer_price: number;       // marked-up total (shipping + GST)
  shipping_charge: number;      // marked-up base shipping (before GST)
  gst_amount: number;           // 18% GST on shipping_charge
  estimated_delivery_days: number;
  etd: string;                  // estimated delivery date string
  rating: number;
  rto_charges: number;
  cod: boolean;
  cod_charges: number;
  pickup_availability: boolean;
  is_recommended: boolean;
  mode: CourierMode;            // 'surface' or 'air'
}

export interface RateCheckRequest {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  shipmentType: DomesticShipmentType;
}

export interface RateCheckResponse {
  success: boolean;
  couriers: CourierOption[];
  error?: string;
}

export interface DomesticBookRequest {
  shipmentType: DomesticShipmentType;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  contentDescription: string;
  pickupAddress: DomesticAddress;
  deliveryAddress: DomesticAddress;
  selectedCourier: {
    courier_company_id: number;
    courier_name: string;
    customer_price: number;
    shipping_charge: number;
    gst_amount: number;
  };
}

export interface DomesticBookResponse {
  success: boolean;
  shipment?: {
    id: string;
    awb: string;
    tracking_number: string;
    label_url?: string;
  };
  error?: string;
}

// Weight slabs for documents
export const DOCUMENT_WEIGHT_SLABS = [
  { label: '250g', value: 0.25 },
  { label: '500g', value: 0.5 },
  { label: '750g', value: 0.75 },
  { label: '1 kg', value: 1.0 },
];

// Constraints
export const DOMESTIC_LIMITS = {
  document: { maxWeightKg: 1, maxValue: 49000 },
  gift: { maxWeightKg: 12, maxValue: 49000 },
  laptop: { maxWeightKg: 5, maxValue: 100000 },
} as const;

export const MARKUP_MULTIPLIER = 2.65;
