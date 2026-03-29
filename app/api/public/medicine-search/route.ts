/**
 * Medicine Search API
 * Searches the Indian Medicine Dataset (254K+ medicines) from GitHub.
 * The CSV is fetched once and cached in memory for fast subsequent searches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectForm, detectType } from '@/lib/medicine/medicineData';

interface MedicineRecord {
  name: string;
  manufacturer: string;
  type: string;
  packSize: string;
  composition1: string;
  composition2: string;
}

// In-memory cache of parsed medicine data
let medicineCache: MedicineRecord[] | null = null;
let cacheLoadPromise: Promise<MedicineRecord[]> | null = null;

const CSV_URL = 'https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/indian_medicine_data.csv';

async function loadMedicineData(): Promise<MedicineRecord[]> {
  if (medicineCache) return medicineCache;
  if (cacheLoadPromise) return cacheLoadPromise;

  cacheLoadPromise = (async () => {
    try {
      console.log('[medicine-search] Fetching medicine dataset...');
      const res = await fetch(CSV_URL, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const lines = text.split('\n');
      const records: MedicineRecord[] = [];

      // Skip header row, parse CSV
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parse (handles quoted fields)
        const fields = parseCSVLine(line);
        if (fields.length < 8) continue;

        const discontinued = fields[3]?.toUpperCase();
        if (discontinued === 'TRUE') continue; // Skip discontinued

        records.push({
          name: fields[1] || '',
          manufacturer: fields[5] || '',
          type: fields[6] || '',
          packSize: fields[7] || '',
          composition1: fields[8] || '',
          composition2: fields[9] || '',
        });
      }

      console.log(`[medicine-search] Loaded ${records.length} medicines`);
      medicineCache = records;
      return records;
    } catch (e) {
      console.error('[medicine-search] Failed to load dataset:', e);
      cacheLoadPromise = null;
      return [];
    }
  })();

  return cacheLoadPromise;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const data = await loadMedicineData();
  const lowerQuery = query.toLowerCase();

  // Search by name (prefix match first, then contains)
  const prefixMatches: typeof data = [];
  const containsMatches: typeof data = [];

  for (const med of data) {
    const lowerName = med.name.toLowerCase();
    if (lowerName.startsWith(lowerQuery)) {
      prefixMatches.push(med);
      if (prefixMatches.length >= 10) break;
    } else if (containsMatches.length < 10 && lowerName.includes(lowerQuery)) {
      containsMatches.push(med);
    }
  }

  const combined = [...prefixMatches, ...containsMatches].slice(0, 10);

  const results = combined.map(med => ({
    name: med.name,
    manufacturer: med.manufacturer,
    form: detectForm(med.packSize, med.name),
    type: detectType(med.type),
    composition: [med.composition1, med.composition2].filter(Boolean).join(' + '),
  }));

  return NextResponse.json(
    { results },
    { headers: { 'Cache-Control': 'public, s-maxage=3600' } },
  );
}
