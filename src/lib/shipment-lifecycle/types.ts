export type ShipmentLeg = 'DOMESTIC' | 'COUNTER' | 'INTERNATIONAL' | 'COMPLETED';

export type ShipmentStatus =
  // Booking phase (DOMESTIC leg)
  | 'PENDING'
  | 'BOOKING_CONFIRMED'
  // Domestic tracking phase (DOMESTIC leg)
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  // Counter/warehouse phase (COUNTER leg)
  | 'ARRIVED_AT_WAREHOUSE'
  | 'QUALITY_CHECKED'
  | 'PACKAGED'
  | 'DISPATCH_APPROVED'
  // International phase (INTERNATIONAL leg)
  | 'DISPATCHED'
  | 'IN_INTERNATIONAL_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'INTL_OUT_FOR_DELIVERY'
  | 'INTL_DELIVERED'
  // Terminal
  | 'FAILED'
  | 'CANCELLED';

export type TimelineSource = 'NIMBUS' | 'INTERNAL' | 'SIMULATION' | 'SYSTEM';

export interface ShipmentRow {
  id: string;
  user_id: string;
  current_leg: ShipmentLeg;
  current_status: ShipmentStatus;
  domestic_awb: string | null;
  international_awb: string | null;
  version: number;
  booking_reference_id: string | null;
  alert_sent: boolean;
  origin_address: string;
  destination_address: string;
  destination_country: string;
  recipient_name: string;
  recipient_phone: string | null;
  weight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  leg: ShipmentLeg;
  source: TimelineSource;
  metadata: Record<string, unknown>;
  created_at: string;
}
