import About from '@/views/About';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us — CourierX India\'s Only Person to Person Courier Booking Platform',
  description: 'Learn about CourierX, India\'s only person to person courier booking platform. Book domestic & international courier online for medicines, documents & gifts. Our mission, team, and commitment to fast, compliant, door-to-door delivery.',
  keywords: ['about courierx', 'person to person courier company India', 'courier booking platform India', 'personal courier service India', 'who is courierx', 'domestic courier India'],
  openGraph: {
    title: 'About CourierX — India\'s Person to Person Courier Booking Platform',
    description: 'India\'s only person to person courier booking platform. Domestic & international courier for medicines, documents & gifts.',
    url: 'https://courierx.in/about',
    type: 'website',
  },
  alternates: { canonical: 'https://courierx.in/about' },
};

export default function AboutPage() {
  return <About />;
}
