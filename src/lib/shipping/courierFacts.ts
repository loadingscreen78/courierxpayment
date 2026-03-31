/**
 * Courier facts and statistics for display in rate calculator and booking flow.
 * Sources: Official websites, annual reports, and industry publications (2025-2026).
 */

export interface CourierFact {
  name: string;
  fullName: string;
  founded: number;
  hq: string;
  type: 'international' | 'domestic';
  countriesOrPincodes: string;
  employees: string;
  fleet: string;
  dailyShipments: string;
  speciality: string;
  highlight: string;
  rating: number; // out of 5
}

// Sources cited inline. Content paraphrased for compliance with licensing restrictions.
// International carriers
// DHL: dhl.com, scribd.com/presentation/464835899
// FedEx: newsroom.fedex.com, wallstreetzen.com/stocks/us/nyse/fdx/statistics
// Aramex: wikiwand.com/en/articles/Aramex, bigship.direct/aramex-courier-guide

// Domestic carriers
// Delhivery: wikiwand.com/en/Delhivery, data-surfer.com/companies/delhivery, inventiva.co.in
// BlueDart: dcfmodeling.com, freepressjournal.in, equentis.com, businessabc.net
// DTDC: wikiwand.com/en/articles/DTDC, startuptalky.com/dtdc-success-story, nrbi.co
// Ecom Express: finology.in, canvasbusinessmodel.com, privatecircle.co
// Xpressbees: xpressbees.com, earnkaro.com, canvasbusinessmodel.com

export const COURIER_FACTS: Record<string, CourierFact> = {
  // ── International ──
  DHL: {
    name: 'DHL',
    fullName: 'DHL Express',
    founded: 1969,
    hq: 'Bonn, Germany',
    type: 'international',
    countriesOrPincodes: '220+ countries',
    employees: '590,000+',
    fleet: 'Dedicated air fleet, 260+ aircraft',
    dailyShipments: '1.8M+ daily',
    speciality: 'Express international delivery, temperature-controlled shipping',
    highlight: "World's largest logistics company by revenue",
    rating: 4.5,
  },
  FedEx: {
    name: 'FedEx',
    fullName: 'FedEx International Priority',
    founded: 1971,
    hq: 'Memphis, USA',
    type: 'international',
    countriesOrPincodes: '220+ countries',
    employees: '500,000+',
    fleet: '700+ aircraft, largest cargo airline',
    dailyShipments: '16M+ daily worldwide',
    speciality: 'Express priority, money-back guarantee',
    highlight: '$126B global economic impact in FY25',
    rating: 4.4,
  },
  Aramex: {
    name: 'Aramex',
    fullName: 'Aramex Express',
    founded: 1982,
    hq: 'Dubai, UAE',
    type: 'international',
    countriesOrPincodes: '70+ countries',
    employees: '18,000+',
    fleet: 'Ground + partner air network',
    dailyShipments: '500K+ daily',
    speciality: 'Middle East & South Asia specialist, Arabic support',
    highlight: 'First courier company founded in the Middle East',
    rating: 4.1,
  },

  // ── Domestic ──
  Delhivery: {
    name: 'Delhivery',
    fullName: 'Delhivery Ltd.',
    founded: 2011,
    hq: 'Gurgaon, India',
    type: 'domestic',
    countriesOrPincodes: '18,700+ pincodes',
    employees: '63,000+',
    fleet: '24 automated sort centers, 94 hubs, 2,880+ delivery centers',
    dailyShipments: '1.5M+ daily',
    speciality: 'Express parcel, part-truckload freight, supply chain',
    highlight: "India's #1 by shipment volume, 4B+ parcels delivered since inception",
    rating: 4.2,
  },
  'BlueDart': {
    name: 'BlueDart',
    fullName: 'Blue Dart Express Ltd.',
    founded: 1983,
    hq: 'Mumbai, India',
    type: 'domestic',
    countriesOrPincodes: '17,700+ pincodes',
    employees: '12,000+',
    fleet: '9 Boeing aircraft, 12,000+ vehicles, 2,347 facilities',
    dailyShipments: '14,000+ tonnes peak/day',
    speciality: 'Air express, time-definite delivery, DHL partnership',
    highlight: '49% market share in domestic air express, own aviation fleet',
    rating: 4.5,
  },
  DTDC: {
    name: 'DTDC',
    fullName: 'DTDC Express Ltd.',
    founded: 1990,
    hq: 'Bengaluru, India',
    type: 'domestic',
    countriesOrPincodes: '10,000+ pincodes',
    employees: '40,000+ field workforce',
    fleet: '570+ operating sites, 4,000+ franchise outlets',
    dailyShipments: '500K+ daily',
    speciality: 'Franchise-based network, deep Tier-2/3 reach',
    highlight: "India's largest franchise-based courier network since 1990",
    rating: 3.8,
  },
  'Ecom Express': {
    name: 'Ecom Express',
    fullName: 'Ecom Express Pvt. Ltd.',
    founded: 2012,
    hq: 'Gurgaon, India',
    type: 'domestic',
    countriesOrPincodes: '27,000+ pincodes',
    employees: '50,000+',
    fleet: 'Automated hubs, pan-India last-mile network',
    dailyShipments: '1M+ daily',
    speciality: 'E-commerce last-mile, 97% population coverage',
    highlight: '27% market share in 3PL shipments (FY24), acquired by Delhivery in 2025',
    rating: 3.9,
  },
  Xpressbees: {
    name: 'Xpressbees',
    fullName: 'Xpressbees Logistics',
    founded: 2015,
    hq: 'Pune, India',
    type: 'domestic',
    countriesOrPincodes: '19,000+ pincodes',
    employees: '20,000+ delivery partners',
    fleet: '260+ hubs, 4,500+ fulfillment centers',
    dailyShipments: '3M+ daily',
    speciality: 'E-commerce logistics, B2B shipping, cross-border',
    highlight: 'Fastest-growing Indian logistics unicorn, EBITDA positive FY24',
    rating: 3.9,
  },
};

/**
 * Look up courier facts by name (fuzzy match on courier_name from API).
 */
export function getCourierFacts(courierName: string): CourierFact | null {
  // Direct match
  if (COURIER_FACTS[courierName]) return COURIER_FACTS[courierName];

  // Fuzzy match: check if courier name contains any known key
  const lower = courierName.toLowerCase();
  for (const [key, fact] of Object.entries(COURIER_FACTS)) {
    if (lower.includes(key.toLowerCase())) return fact;
  }

  // Common aliases
  if (lower.includes('blue dart') || lower.includes('bluedart')) return COURIER_FACTS['BlueDart'];
  if (lower.includes('ecom')) return COURIER_FACTS['Ecom Express'];

  return null;
}
