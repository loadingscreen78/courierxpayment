/**
 * Fuel Surcharge Scraper — Vercel Cron Job
 *
 * Scrapes current fuel surcharge percentages from:
 * - FedEx India: https://www.fedex.com/en-in/shipping/surcharges.html
 *   → Updated weekly every Monday
 *   → Looks for the current week's percentage in the surcharge table
 *
 * - Aramex India: https://www.aramex.com/in/en/services-solutions/fuel-surcharge
 *   → Updated twice monthly (1st-15th and 16th-31st)
 *   → Looks for the current period's percentage
 *
 * Schedule: Runs every 6 hours via Vercel cron (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateFuelSurcharge } from '@/lib/shipping/fuelSurcharge';

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow in dev without secret
  return authHeader === `Bearer ${cronSecret}`;
}

async function scrapeFedExSurcharge(): Promise<number | null> {
  try {
    const res = await fetch('https://www.fedex.com/en-in/shipping/surcharges.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error('[FedEx scraper] HTTP error:', res.status);
      return null;
    }

    const html = await res.text();

    // FedEx page shows current week's surcharge in a table row like:
    // "30 March, 2026 - 05 April, 2026 | $4.038 | 48.00%"
    // Look for percentage patterns near date ranges
    const percentPatterns = [
      // Match "XX.XX%" in table context
      /(\d{1,2}\s+\w+,?\s+\d{4})\s*[-–]\s*(\d{1,2}\s+\w+,?\s+\d{4})[^%]*?(\d+\.?\d*)\s*%/gi,
      // Simpler: just find the first prominent percentage (the current one)
      />\s*(\d+\.?\d*)\s*%\s*</g,
    ];

    // Try the date-range pattern first (most reliable)
    const dateRangeMatch = percentPatterns[0].exec(html);
    if (dateRangeMatch) {
      const percent = parseFloat(dateRangeMatch[3]);
      if (percent >= 5 && percent <= 80) {
        console.log(`[FedEx scraper] Found surcharge: ${percent}% (${dateRangeMatch[1]} - ${dateRangeMatch[2]})`);
        return percent;
      }
    }

    // Fallback: find all percentages and pick the first reasonable one
    const allPercents: number[] = [];
    let match;
    while ((match = percentPatterns[1].exec(html)) !== null) {
      const p = parseFloat(match[1]);
      if (p >= 10 && p <= 80) allPercents.push(p);
    }

    if (allPercents.length > 0) {
      // The first percentage on the page is typically the current surcharge
      console.log(`[FedEx scraper] Found percentages: ${allPercents.join(', ')}. Using first: ${allPercents[0]}%`);
      return allPercents[0];
    }

    console.warn('[FedEx scraper] Could not extract surcharge percentage from page');
    return null;
  } catch (e) {
    console.error('[FedEx scraper] Error:', e);
    return null;
  }
}

async function scrapeAramexSurcharge(): Promise<number | null> {
  try {
    const res = await fetch('https://www.aramex.com/in/en/services-solutions/fuel-surcharge', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error('[Aramex scraper] HTTP error:', res.status);
      return null;
    }

    const html = await res.text();

    // Aramex page shows a table like:
    // | March 2026 (16th–31st) | 19.25% |
    // | March 2026 (1st–15th) | 14.00% |
    // The first row is the most recent/current period

    // Match patterns like "19.25%" near month names
    const patterns = [
      // Match month + period + percentage
      /(\w+\s+\d{4})\s*\(([^)]+)\)\s*[|<>\s]*(\d+\.?\d*)\s*%/gi,
      // Simpler: find percentages in table rows
      />\s*(\d+\.?\d*)\s*%\s*</g,
    ];

    const periodMatch = patterns[0].exec(html);
    if (periodMatch) {
      const percent = parseFloat(periodMatch[3]);
      if (percent >= 1 && percent <= 50) {
        console.log(`[Aramex scraper] Found surcharge: ${percent}% (${periodMatch[1]} ${periodMatch[2]})`);
        return percent;
      }
    }

    // Fallback
    const allPercents: number[] = [];
    let match;
    while ((match = patterns[1].exec(html)) !== null) {
      const p = parseFloat(match[1]);
      if (p >= 1 && p <= 50) allPercents.push(p);
    }

    if (allPercents.length > 0) {
      console.log(`[Aramex scraper] Found percentages: ${allPercents.join(', ')}. Using first: ${allPercents[0]}%`);
      return allPercents[0];
    }

    console.warn('[Aramex scraper] Could not extract surcharge percentage from page');
    return null;
  } catch (e) {
    console.error('[Aramex scraper] Error:', e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, any> = { timestamp: new Date().toISOString() };

  // Scrape FedEx
  const fedexPercent = await scrapeFedExSurcharge();
  if (fedexPercent !== null) {
    const updated = await updateFuelSurcharge('fedex', fedexPercent);
    results.fedex = { percent: fedexPercent, saved: updated };
  } else {
    results.fedex = { error: 'Failed to scrape', saved: false };
  }

  // Scrape Aramex
  const aramexPercent = await scrapeAramexSurcharge();
  if (aramexPercent !== null) {
    const updated = await updateFuelSurcharge('aramex', aramexPercent);
    results.aramex = { percent: aramexPercent, saved: updated };
  } else {
    results.aramex = { error: 'Failed to scrape', saved: false };
  }

  console.log('[fuel-surcharge-scraper] Results:', JSON.stringify(results));

  return NextResponse.json({ success: true, results });
}
