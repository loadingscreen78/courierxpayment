import { ShipmentLeg, ShipmentStatus } from './types';

export const ALLOWED_TRANSITIONS: Record<ShipmentLeg, Partial<Record<ShipmentStatus, ShipmentStatus[]>>> = {
  DOMESTIC: {
    PENDING: ['BOOKING_CONFIRMED', 'FAILED', 'CANCELLED'],
    BOOKING_CONFIRMED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
    IN_TRANSIT: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  },
  COUNTER: {
    PENDING: ['BOOKING_CONFIRMED', 'FAILED', 'CANCELLED'],
    BOOKING_CONFIRMED: ['ARRIVED_AT_WAREHOUSE', 'CANCELLED'],
    ARRIVED_AT_WAREHOUSE: ['QUALITY_CHECKED', 'CANCELLED'],
    QUALITY_CHECKED: ['PACKAGED', 'CANCELLED'],
    PACKAGED: ['DISPATCH_APPROVED', 'CANCELLED'],
    DISPATCH_APPROVED: ['DISPATCHED'],
  },
  INTERNATIONAL: {
    DISPATCHED: ['IN_INTERNATIONAL_TRANSIT'],
    IN_INTERNATIONAL_TRANSIT: ['CUSTOMS_CLEARANCE'],
    CUSTOMS_CLEARANCE: ['INTL_OUT_FOR_DELIVERY'],
    INTL_OUT_FOR_DELIVERY: ['INTL_DELIVERED'],
  },
  COMPLETED: {},
};

export function isTransitionAllowed(
  leg: ShipmentLeg,
  fromStatus: ShipmentStatus,
  toStatus: ShipmentStatus
): boolean {
  const legTransitions = ALLOWED_TRANSITIONS[leg];
  const allowed = legTransitions?.[fromStatus];
  return allowed?.includes(toStatus) ?? false;
}
