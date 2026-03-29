/**
 * Indian Medicine Database — curated from open-source datasets
 * Source: github.com/junioralive/Indian-Medicine-Dataset (254K+ medicines)
 *
 * We store a compact top-5000 popular medicines list for client-side search.
 * Users can also type any name manually if not found.
 *
 * Medicine form → HSN code mapping (Chapter 30 of Indian Customs Tariff):
 * - Tablet/Capsule → 30049099 (Other medicaments, retail)
 * - Syrup/Liquid → 30049099
 * - Injection → 30049099
 * - Ointment/Cream/Gel (semi-liquid) → 30049099
 * - Drops (eye/ear/nasal) → 30049099
 * - Powder/Granules → 30049099
 * - Ayurvedic → 30049011 (Ayurvedic medicaments)
 * - Homeopathic → 30049019 (Homeopathic medicaments)
 */

export interface MedicineSuggestion {
  name: string;
  manufacturer: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'semi-liquid' | 'powder' | '';
  composition: string;
  type: 'allopathy' | 'homeopathy' | 'ayurvedic' | 'other' | '';
}

/** Map medicine type + form to HSN code */
export function getHsnCode(
  medicineType: string,
  _form?: string,
): string {
  switch (medicineType) {
    case 'ayurvedic': return '30049011';
    case 'homeopathy': return '30049019';
    default: return '30049099'; // Allopathy and other
  }
}

/** Detect medicine form from pack_size_label string */
export function detectForm(packLabel: string): MedicineSuggestion['form'] {
  const l = (packLabel || '').toLowerCase();
  if (l.includes('tablet') || l.includes('tab')) return 'tablet';
  if (l.includes('capsule') || l.includes('cap')) return 'capsule';
  if (l.includes('syrup') || l.includes('liquid') || l.includes('solution') || l.includes('suspension') || l.includes('drops') || l.includes('ml')) return 'liquid';
  if (l.includes('cream') || l.includes('ointment') || l.includes('gel') || l.includes('lotion')) return 'semi-liquid';
  if (l.includes('powder') || l.includes('sachet') || l.includes('granule')) return 'powder';
  return '';
}

/** Detect medicine type from the type field */
export function detectType(typeStr: string): MedicineSuggestion['type'] {
  const l = (typeStr || '').toLowerCase();
  if (l.includes('allopathy') || l.includes('allopathic')) return 'allopathy';
  if (l.includes('homeopathy') || l.includes('homoeopathy')) return 'homeopathy';
  if (l.includes('ayurvedic') || l.includes('ayurveda')) return 'ayurvedic';
  if (l) return 'other';
  return '';
}
