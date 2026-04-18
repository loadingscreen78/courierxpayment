export type ShipmentLike = { status: string; current_status?: string };

export function filterActiveShipments<T extends ShipmentLike>(shipments: T[]): T[] {
  return shipments.filter((s) => {
    const status = (s.current_status || s.status || '').toUpperCase();
    return !['DELIVERED', 'CANCELLED', 'INTL_DELIVERED'].includes(status);
  });
}

export function filterDeliveredShipments<T extends ShipmentLike>(shipments: T[]): T[] {
  const delivered = (s: T) => {
    const status = (s.current_status || s.status || '').toUpperCase();
    return status === 'DELIVERED' || status === 'INTL_DELIVERED';
  };
  return shipments.filter(delivered);
}

export function filterCancelledShipments<T extends ShipmentLike>(shipments: T[]): T[] {
  return shipments.filter((s) => {
    const status = (s.current_status || s.status || '').toUpperCase();
    return status === 'CANCELLED';
  });
}
