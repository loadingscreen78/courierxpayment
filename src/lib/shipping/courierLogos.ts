/**
 * Central courier logo mapping.
 * Returns the public path to the logo for a given courier name.
 * Matching is case-insensitive and checks for substrings.
 */

export function getCourierLogo(courierName: string): string | null {
  const name = (courierName || '').toLowerCase().replace(/[\s\-_]/g, '');

  if (name.includes('dhl')) return '/logos/dhl.svg';
  if (name.includes('fedex') || name.includes('fedx')) return '/logos/fedex.svg';
  if (name.includes('bluedart') || name.includes('bluedart')) return '/logos/bluedart.png';
  if (name.includes('delhivery')) return '/logos/delhivery.webp';
  if (name.includes('xpressbees')) return '/logos/xpressbees.png';
  if (name.includes('ekart')) return '/logos/ekart.png';
  if (name.includes('dtdc')) return '/logos/dtdc.svg';
  if (name.includes('aramex')) return '/logos/aramex.svg';
  if (name.includes('shipglobal')) return '/logos/shipglobal.svg';
  if (name.includes('shadowfax') || name.includes('shadowfax')) return null;

  return null;
}
