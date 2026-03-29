/**
 * Fuel Surcharge Manager
 * 
 * Stores current fuel surcharge percentages for FedEx and Aramex.
 * Updated via cron-triggered web scraping from:
 * - FedEx: https://www.fedex.com/en-in/shipping/surcharges.html (weekly, every Monday)
 * - Aramex: https://www.aramex.com/in/en/services-solutions/fuel-surcharge (twice monthly, 1st & 16th)
 * 
 * The scraper runs as a Vercel cron job and stores results in Supabase.
 * This module reads from Supabase with a local cache to avoid repeated DB calls.
 */

import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

export interface FuelSurchargeData {
  fedexPercent: number;
  aramexPercent: number;
  fedexUpdatedAt: string;
  aramexUpdatedAt: string;
}

// Defaults based on latest scraped values (fallback if DB is unavailable)
const DEFAULTS: FuelSurchargeData = {
  fedexPercent: 48.0,   // As of March 30, 2026
  aramexPercent: 19.25,  // As of March 16-31, 2026
  fedexUpdatedAt: '2026-03-30',
  aramexUpdatedAt: '2026-03-16',
};

// In-memory cache (refreshed every 30 minutes)
let cache: FuelSurchargeData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get current fuel surcharge percentages.
 * Reads from Supabase with in-memory caching. Falls back to hardcoded defaults.
 */
export async function getFuelSurcharges(): Promise<FuelSurchargeData> {
  const now = Date.now();
  if (cache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['fedex_fuel_surcharge', 'aramex_fuel_surcharge']);

    if (!error && data && data.length > 0) {
      const result = { ...DEFAULTS };
      for (const row of data) {
        if (row.key === 'fedex_fuel_surcharge') {
          const parsed = JSON.parse(row.value);
          result.fedexPercent = parsed.percent;
          result.fedexUpdatedAt = parsed.updatedAt;
        }
        if (row.key === 'aramex_fuel_surcharge') {
          const parsed = JSON.parse(row.value);
          result.aramexPercent = parsed.percent;
          result.aramexUpdatedAt = parsed.updatedAt;
        }
      }
      cache = result;
      cacheTimestamp = now;
      return result;
    }
  } catch (e) {
    console.warn('[fuelSurcharge] Failed to read from DB, using defaults:', e);
  }

  cache = DEFAULTS;
  cacheTimestamp = now;
  return DEFAULTS;
}

/**
 * Synchronous getter for client-side use.
 * Returns cached value or defaults (no DB call).
 */
export function getFuelSurchargesSync(): FuelSurchargeData {
  return cache || DEFAULTS;
}

/**
 * Update fuel surcharge in Supabase (called by scraper cron job).
 */
export async function updateFuelSurcharge(
  carrier: 'fedex' | 'aramex',
  percent: number,
): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();
    const key = `${carrier}_fuel_surcharge`;
    const value = JSON.stringify({
      percent,
      updatedAt: new Date().toISOString().split('T')[0],
      scrapedAt: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      console.error(`[fuelSurcharge] Failed to update ${carrier}:`, error);
      return false;
    }

    // Invalidate cache
    cache = null;
    cacheTimestamp = 0;
    return true;
  } catch (e) {
    console.error(`[fuelSurcharge] Error updating ${carrier}:`, e);
    return false;
  }
}
