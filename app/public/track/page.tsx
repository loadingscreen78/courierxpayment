import { Suspense } from 'react';
import PublicTracking from '@/views/PublicTracking';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Shipment — Real-Time International & Domestic Package Tracking',
  description: 'Track your international or domestic shipment in real-time. Enter your AWB or tracking number to get live updates on package location, customs status, and estimated delivery date.',
  keywords: ['track shipment', 'package tracking', 'courier tracking India', 'AWB tracking', 'international shipment tracking', 'DHL tracking India', 'FedEx tracking India', 'shipment status'],
  alternates: { canonical: 'https://courierx.in/public/track' },
};

export default function PublicTrackPage() {
  return (
    <Suspense>
      <PublicTracking />
    </Suspense>
  );
}
