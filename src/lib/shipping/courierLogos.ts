/**
 * Central courier logo mapping.
 * Returns the public path to the logo for a given courier name.
 */

export function getCourierLogo(courierName: string): string | null {
  const name = (courierName || '').toLowerCase();

  if (name.includes('dhl')) return '/logos/dhl.png';
  if (name.includes('fedex') || name.includes('fed ex')) return '/logos/fedex.jpg';
  if (name.includes('bluedart') || name.includes('blue dart')) return '/logos/bluedart.png';
  if (name.includes('delhivery')) return '/logos/delhivery.svg';
  if (name.includes('xpressbees') || name.includes('xpress bees')) return '/logos/xpressbees.png';
  if (name.includes('ekart')) return '/logos/ekart.png';
  if (name.includes('dtdc')) return '/logos/dtdc.svg';
  if (name.includes('aramex')) return '/logos/aramex.svg';
  if (name.includes('shipglobal') || name.includes('ship global')) return '/logos/shipglobal.svg';

  return null;
}

/** Background color to use behind a courier logo (for contrast) */
export function getCourierLogoBg(courierName: string): string {
  const name = (courierName || '').toLowerCase();
  if (name.includes('dhl')) return 'bg-yellow-400';
  if (name.includes('fedex') || name.includes('fed ex')) return 'bg-white';
  if (name.includes('bluedart') || name.includes('blue dart')) return 'bg-white';
  if (name.includes('delhivery')) return 'bg-red-600';
  if (name.includes('xpressbees')) return 'bg-orange-500';
  if (name.includes('ekart')) return 'bg-white';
  if (name.includes('dtdc')) return 'bg-red-600';
  if (name.includes('aramex')) return 'bg-orange-500';
  if (name.includes('shipglobal')) return 'bg-blue-600';
  return 'bg-muted';
}
