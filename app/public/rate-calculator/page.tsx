import PublicRateCalculator from '@/views/PublicRateCalculator';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calculate Rate & Transit Time — Domestic & International Shipping | CourierX',
  description: 'Calculate shipping rates and transit times for domestic and international shipments from India. Compare carriers, get instant quotes for documents, parcels & gifts.',
  keywords: ['shipping rate calculator', 'transit time calculator', 'domestic courier rates India', 'international courier rates India', 'compare shipping rates', 'DHL rates India', 'FedEx rates India', 'courier cost calculator'],
  alternates: { canonical: 'https://courierx.in/public/rate-calculator' },
};

export default function PublicRateCalculatorPage() {
  return <PublicRateCalculator />;
}
