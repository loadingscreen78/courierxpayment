import { ShipmentStatus, ShipmentLeg, TimelineSource } from './types';

export interface StatusDisplayInfo {
  label: string;
  dotColor: string;
  badgeVariant: string;
}

export const STATUS_LABEL_MAP: Record<ShipmentStatus, StatusDisplayInfo> = {
  PENDING:                  { label: 'Pending',                          dotColor: 'bg-gray-500',   badgeVariant: 'secondary' },
  BOOKING_CONFIRMED:        { label: 'Booking Confirmed & AWB Generated',  dotColor: 'bg-blue-500',   badgeVariant: 'default' },
  PICKED_UP:                { label: 'Picked Up',                        dotColor: 'bg-blue-500',   badgeVariant: 'default' },
  IN_TRANSIT:               { label: 'In Transit',                       dotColor: 'bg-blue-500',   badgeVariant: 'default' },
  OUT_FOR_DELIVERY:         { label: 'Out for Delivery',                 dotColor: 'bg-blue-500',   badgeVariant: 'default' },
  DELIVERED:                { label: 'Delivered (Domestic)',              dotColor: 'bg-green-500',  badgeVariant: 'success' },
  ARRIVED_AT_WAREHOUSE:     { label: 'Arrived at CourierX Warehouse',    dotColor: 'bg-amber-500',  badgeVariant: 'warning' },
  QUALITY_CHECKED:          { label: 'Quality Check Completed',          dotColor: 'bg-amber-500',  badgeVariant: 'warning' },
  PACKAGED:                 { label: 'Shipment Packaged',                dotColor: 'bg-amber-500',  badgeVariant: 'warning' },
  DISPATCH_APPROVED:        { label: 'Dispatch Approved',                dotColor: 'bg-green-500',  badgeVariant: 'success' },
  DISPATCHED:               { label: 'Dispatched Internationally',       dotColor: 'bg-purple-500', badgeVariant: 'default' },
  IN_INTERNATIONAL_TRANSIT: { label: 'In International Transit',         dotColor: 'bg-purple-500', badgeVariant: 'default' },
  CUSTOMS_CLEARANCE:        { label: 'Customs Clearance',                dotColor: 'bg-purple-500', badgeVariant: 'default' },
  INTL_OUT_FOR_DELIVERY:    { label: 'Out for Delivery (International)', dotColor: 'bg-purple-500', badgeVariant: 'default' },
  INTL_DELIVERED:           { label: 'Delivered',                        dotColor: 'bg-green-500',  badgeVariant: 'success' },
  FAILED:                   { label: 'Failed',                           dotColor: 'bg-red-500',    badgeVariant: 'destructive' },
  CANCELLED:                { label: 'Cancelled',                        dotColor: 'bg-red-500',    badgeVariant: 'destructive' },
};

export const LEG_LABEL_MAP: Record<ShipmentLeg, string> = {
  DOMESTIC: 'Domestic Transit',
  COUNTER: 'Warehouse Processing',
  INTERNATIONAL: 'International Journey',
  COMPLETED: 'Completed',
};

export const SOURCE_LABEL_MAP: Record<TimelineSource, { label: string; color: string }> = {
  NIMBUS:     { label: 'Domestic Tracking', color: 'text-blue-400' },
  INTERNAL:   { label: 'Warehouse',         color: 'text-amber-400' },
  SIMULATION: { label: 'International',     color: 'text-purple-400' },
  SYSTEM:     { label: 'System',            color: 'text-gray-400' },
};

export function getStatusLabel(status: ShipmentStatus): string {
  return STATUS_LABEL_MAP[status]?.label ?? status;
}

export function getStatusDotColor(status: ShipmentStatus): string {
  return STATUS_LABEL_MAP[status]?.dotColor ?? 'bg-gray-500';
}

export function getLegLabel(leg: ShipmentLeg): string {
  return LEG_LABEL_MAP[leg] ?? leg;
}

export function formatTimelineDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
