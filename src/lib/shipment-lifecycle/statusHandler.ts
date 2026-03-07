import { ShipmentRow, ShipmentStatus, ShipmentLeg } from './types';
import { getServiceRoleClient } from './supabaseAdmin';
import { dispatchStatusWhatsApp } from '@/lib/whatsapp/dispatcher';

const WAREHOUSE_ADDRESS = process.env.WAREHOUSE_ADDRESS ?? 'CourierX Warehouse';

/**
 * Dispatches side effects after a successful status update.
 * Called by updateShipmentStatus after the DB transaction commits.
 */
export async function handleStatusChange(
  shipment: ShipmentRow,
  newStatus: ShipmentStatus,
  newLeg: ShipmentLeg
): Promise<void> {
  // DELIVERED on DOMESTIC leg + warehouse address match → transition to COUNTER
  if (newStatus === 'DELIVERED' && newLeg === 'DOMESTIC') {
    if (shipment.destination_address.includes(WAREHOUSE_ADDRESS)) {
      const { updateShipmentStatus } = await import('./stateMachine');
      await updateShipmentStatus({
        shipmentId: shipment.id,
        newStatus: 'ARRIVED_AT_WAREHOUSE',
        newLeg: 'COUNTER',
        source: 'SYSTEM',
        metadata: { trigger: 'domestic_delivered_warehouse_match' },
        expectedVersion: shipment.version,
      });
    }
    return;
  }

  // INTL_OUT_FOR_DELIVERY → send SMS notification, set alert_sent=true
  if (newStatus === 'INTL_OUT_FOR_DELIVERY') {
    if (!shipment.alert_sent) {
      console.log(
        `[statusHandler] SMS notification: Shipment ${shipment.id} is out for international delivery. ` +
        `Recipient: ${shipment.recipient_name}, Phone: ${shipment.recipient_phone}`
      );

      // Send WhatsApp notification (fire-and-forget)
      dispatchStatusWhatsApp(shipment.id, newStatus).catch((err) => {
        console.error('[statusHandler] WhatsApp notification failed:', err);
      });

      const supabase = getServiceRoleClient();
      await supabase
        .from('shipments')
        .update({ alert_sent: true })
        .eq('id', shipment.id);
    }

    return;
  }

  // INTL_DELIVERED → COMPLETED leg transition is now handled automatically
  // by the state machine (auto-sets current_leg = 'COMPLETED' when
  // transitioning to INTL_DELIVERED), so no side-effect needed here.

  // Send WhatsApp notification for all meaningful status changes (fire-and-forget)
  dispatchStatusWhatsApp(shipment.id, newStatus).catch((err) => {
    console.error('[statusHandler] WhatsApp notification failed:', err);
  });
}
