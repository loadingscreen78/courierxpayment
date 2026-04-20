/**
 * International Rate Calculator — based on Unified_Rate_Card.xlsx
 *
 * Calculation steps (from Calc_Logic sheet):
 * 1. Determine Zone & Carrier from country
 * 2. Billable Weight = max(actual, dimensional)  DIM = L×W×H / 5000
 * 3. Look up Base Rate from FedEx/Aramex rate tables (weight slab × zone)
 * 4. Fuel Surcharge = Base Rate × fuel % (carrier-specific, scraped live)
 * 5. Domestic Transit = billable weight × ₹80/kg
 * 6. Subtotal = Base + Fuel + Domestic Transit
 * 7. GST = Subtotal × 18%
 * 8. Grand Total = Subtotal + GST
 *
 * Non-account markup: ~33% on top of account price (account holders get 25% off)
 */

import { type Country, getCountryByCode, type RateZone, type FedExZone, type AramexZone } from './countries';

export type Carrier = 'DHL' | 'FedEx' | 'Aramex' | 'ShipGlobal';
export type ShipmentType = 'medicine' | 'document' | 'gift';

/** @deprecated Legacy interface kept for backward compatibility */
export interface ShippingRate {
  basePrice: number;
  weightRate: number;
  volumetricDivisor: number;
  fuelSurchargePercent: number;
  insurancePercent: number;
  handlingFee: number;
  customsClearanceFee: number;
}

export interface CourierOption {
  carrier: Carrier;
  serviceName: string;
  price: number;
  transitDays: { min: number; max: number };
  isRecommended: boolean;
  features: string[];
}

export interface RateCalculationResult {
  baseRate: number;
  weightCharge: number;
  fuelSurcharge: number;
  insurance: number;
  handlingFee: number;
  customsFee: number;
  exportClearance: number;
  subtotal: number;
  gst: number;
  total: number;
  carrier: Carrier;
  zone: RateZone;
  billableWeightKg: number;
  breakdown: { label: string; amount: number }[];
}

// ── Configuration ──
// Fuel surcharge defaults — overridden at runtime by fuelSurcharge.ts from DB
// FedEx: updated weekly every Monday (source: fedex.com/en-in/shipping/surcharges.html)
// Aramex: updated twice monthly (source: aramex.com/in/en/services-solutions/fuel-surcharge)
let FEDEX_FUEL_SURCHARGE_PERCENT = 48.0;  // Current as of March 2026
let ARAMEX_FUEL_SURCHARGE_PERCENT = 19.25; // Current as of March 16-31, 2026

const GST_RATE = 0.18;
const DOMESTIC_TRANSIT_PER_KG = 80; // ₹80 per kg for domestic leg (pickup to warehouse/airport)
const DIM_DIVISOR = 5000;

// Pricing model:
// costPrice = base + fuel + domestic transit (our cost from carrier + domestic leg)
// Account holder price = costPrice × 2.65
// Non-account (guest) price = costPrice × 3.53
const ACCOUNT_HOLDER_MULTIPLIER = 2.65;
const NON_ACCOUNT_MULTIPLIER = 3.53;

/** @deprecated Use NON_ACCOUNT_MULTIPLIER instead */
export const GUEST_MARKUP = NON_ACCOUNT_MULTIPLIER;

/** @deprecated Use ACCOUNT_HOLDER_MULTIPLIER instead */
export const COST_TO_SELLING_MULTIPLIER = NON_ACCOUNT_MULTIPLIER;

/** @deprecated Discount is now implicit in the multipliers */
export const ACCOUNT_DISCOUNT = (NON_ACCOUNT_MULTIPLIER - ACCOUNT_HOLDER_MULTIPLIER) / NON_ACCOUNT_MULTIPLIER; // ≈ 0.249

/**
 * Multiplier for domestic guest rates.
 * Domestic base rates (from NimbusPost) = account holder price.
 * Guest price = accountPrice × (3.53 / 2.65) ≈ accountPrice × 1.332
 */
export const DOMESTIC_GUEST_MULTIPLIER = NON_ACCOUNT_MULTIPLIER / ACCOUNT_HOLDER_MULTIPLIER; // ≈ 1.332

/**
 * Update fuel surcharge percentages at runtime.
 * Called by the fuel surcharge module after reading from DB.
 */
export function setFuelSurcharges(fedex: number, aramex: number) {
  FEDEX_FUEL_SURCHARGE_PERCENT = fedex;
  ARAMEX_FUEL_SURCHARGE_PERCENT = aramex;
}

// ── FedEx Express Rate Table (₹ INR, rounded) ──
// Columns: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q
const FEDEX_ZONES: FedExZone[] = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];

// [weightKg, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q]
const FEDEX_RATES: number[][] = [
  [0.5,1073,897,1263,1489,1476,1087,1229,1521,1522,1324,1564,1269,1150,1742,1742,1743,1742],
  [1,1216,1062,1349,1553,1694,1244,1418,1731,1583,1591,1742,1463,1284,1848,1848,1848,1848],
  [1.5,1393,1284,1587,1830,2001,1413,1606,2038,1851,1772,1940,1658,1471,2058,2058,2059,2058],
  [2,1571,1506,1826,2107,2307,1582,1794,2344,2118,1953,2138,1852,1659,2269,2269,2269,2269],
  [2.5,1748,1729,2065,2385,2614,1751,1983,2651,2385,2134,2337,2047,1846,2479,2479,2479,2479],
  [3,2355,2042,2595,2423,2787,1756,2472,2780,2730,2589,2945,2542,2077,2909,2909,2909,2909],
  [3.5,2504,2130,2686,2575,2949,1886,2665,3030,2941,2769,3219,2740,2208,3179,3179,3179,3179],
  [4,2653,2219,2777,2726,3111,2017,2858,3280,3153,2950,3493,2939,2339,3450,3450,3449,3450],
  [4.5,2802,2308,2868,2878,3274,2147,3051,3529,3364,3130,3767,3137,2470,3720,3720,3720,3720],
  [5,2950,2397,2959,3030,3436,2278,3244,3779,3576,3311,4041,3335,2601,3991,3991,3990,3991],
  [5.5,3133,2848,4357,3160,4053,2454,3719,3892,3951,3987,4042,3828,3202,4724,4724,4724,4724],
  [6,3273,2981,4561,3290,4228,2571,3890,4005,4175,4205,4237,4005,3344,4952,4952,4951,4952],
  [6.5,3412,3114,4766,3420,4403,2689,4062,4118,4399,4422,4432,4182,3486,5180,5180,5179,5180],
  [7,3551,3247,4970,3550,4578,2806,4234,4231,4623,4639,4626,4359,3628,5407,5407,5407,5407],
  [7.5,3690,3380,5175,3680,4753,2924,4405,4344,4846,4856,4821,4536,3770,5635,5635,5635,5635],
  [8,4317,6133,5275,5990,5636,4321,4434,5744,5983,6513,8778,4575,4541,8778,8778,8778,8778],
  [8.5,4474,6366,5476,6194,5836,4488,4600,5890,6247,6792,9119,4747,4705,9119,9119,9120,9119],
  [9,4631,6598,5677,6399,6036,4655,4767,6036,6511,7071,9460,4919,4870,9460,9460,9461,9460],
  [9.5,4788,6830,5877,6603,6237,4822,4933,6181,6775,7349,9801,5091,5035,9801,9801,9802,9801],
  [10,4945,7062,6078,6808,6437,4988,5099,6327,7039,7628,10141,5263,5200,10141,10141,10143,10141],
  [10.5,5083,7283,6176,6978,6647,5208,5743,7028,7292,7967,10468,5926,5346,10468,10468,10470,10468],
  [11,5225,7503,6312,7149,6854,5404,5957,7264,7545,8282,10794,6147,5495,10795,10795,10797,10794],
  [11.5,5367,7723,6447,7320,7062,5600,6171,7501,7799,8597,11120,6367,5644,11121,11121,11124,11120],
  [12,5508,7944,6583,7490,7270,5797,6386,7737,8052,8911,11447,6587,5793,11448,11448,11451,11447],
  [12.5,5650,8164,6719,7661,7477,5993,6600,7973,8305,9226,11773,6807,5942,11775,11775,11778,11773],
  [13,5792,8384,6855,7832,7685,6190,6814,8209,8558,9541,12100,7027,6092,12101,12101,12105,12100],
  [13.5,5934,8604,6991,8003,7892,6386,7029,8445,8811,9855,12426,7248,6241,12428,12428,12432,12426],
  [14,6075,8825,7127,8173,8100,6583,7243,8681,9065,10170,12752,7468,6390,12755,12755,12759,12752],
  [14.5,6217,9045,7262,8344,8307,6779,7457,8917,9318,10485,13079,7688,6539,13081,13081,13086,13079],
  [15,6359,9265,7398,8515,8515,6976,7672,9153,9571,10800,13405,7908,6688,13408,13408,13413,13405],
  [15.5,6501,9486,7534,8686,8722,7172,7886,9390,9824,11114,13731,8128,6837,13735,13735,13740,13731],
  [16,6642,9706,7670,8856,8930,7369,8100,9626,10077,11429,14058,8349,6986,14061,14061,14067,14058],
  [16.5,6784,9926,7806,9027,9138,7565,8315,9862,10331,11744,14384,8569,7135,14388,14388,14394,14384],
  [17,6926,10147,7942,9198,9345,7761,8529,10098,10584,12059,14710,8789,7284,14715,14715,14721,14710],
  [17.5,7068,10367,8078,9368,9553,7958,8743,10334,10837,12373,15037,9009,7433,15041,15041,15048,15037],
  [18,7209,10587,8214,9539,9760,8154,8958,10570,11090,12688,15363,9229,7582,15368,15368,15375,15363],
  [18.5,7351,10808,8349,9710,9968,8351,9172,10806,11343,13003,15689,9450,7731,15694,15694,15702,15689],
  [19,7493,11028,8485,9881,10175,8547,9386,11042,11597,13318,16016,9670,7880,16021,16021,16029,16016],
  [19.5,7635,11248,8621,10051,10383,8744,9601,11278,11850,13632,16342,9890,8029,16348,16348,16356,16342],
  [20,7776,11469,8757,10222,10590,8940,9815,11515,12103,13947,16668,10110,8179,16674,16674,16683,16668],
  [20.5,7918,11689,8893,10393,10798,9137,10029,11751,12356,14262,16995,10330,8328,17001,17001,17009,16995],
  [21,8687,11887,9079,10654,11039,9160,10404,12969,12597,14583,17464,10679,9130,17470,17470,17479,17464],
  [21.5,8822,12096,9268,10909,11277,9358,10641,13241,12849,14903,17933,10922,9271,17939,17939,17949,17933],
  [22,8956,12305,9457,11164,11514,9555,10878,13513,13101,15224,18402,11166,9413,18407,18407,18419,18402],
  [22.5,9091,12514,9646,11418,11751,9752,11115,13785,13353,15544,18871,11410,9554,18876,18876,18888,18871],
  [23,9226,12723,9835,11673,11989,9949,11352,14056,13605,15865,19340,11654,9696,19345,19345,19358,19340],
  [23.5,9360,12933,10024,11928,12226,10146,11589,14328,13857,16186,19809,11897,9838,19814,19814,19828,19809],
  [24,9495,13142,10212,12182,12463,10344,11826,14600,14109,16506,20278,12141,9979,20283,20283,20297,20278],
  [24.5,9629,13351,10401,12437,12701,10541,12063,14872,14361,16827,20747,12385,10120,20751,20751,20767,20747],
  [25,9764,13560,10590,12692,12938,10738,12300,15144,14613,17148,21216,12629,10262,21220,21220,21237,21216],
];

// Per-kg rates for weight > 25kg (using 71+ tier for simplicity up to 71kg)
const FEDEX_PER_KG_71: number[] = [337.67,547.31,414.28,416.21,528.05,391.48,477.66,608.65,509.69,632.47,886.01,492.14,354.54,886.01,886.01,886.01,886.01];

// ── Aramex Rate Table (₹ INR, rounded) ──
// Columns: ME1(UAE), ME2(Bahrain/Kuwait), ME3(Saudi), ME4(Egypt/Jordan/Lebanon/Turkey/Yemen/Cyprus), Qatar, Oman
const ARAMEX_ZONES: AramexZone[] = ['ME1','ME2','ME3','ME4','Qatar','Oman'];

// [weightKg, ME1, ME2, ME3, ME4, Qatar, Oman]
const ARAMEX_RATES: number[][] = [
  [0.5,731,812,879,1077,812,812],
  [1,926,1029,972,1518,1029,1029],
  [1.5,1047,1267,1104,1964,1267,1267],
  [2,1172,1504,1238,2405,1504,1504],
  [2.5,1297,1741,1369,2846,1741,1741],
  [3,1741,2247,2038,3297,2247,2247],
  [3.5,1843,2478,2158,3727,2478,2478],
  [4,1944,2709,2278,4179,2709,2709],
  [4.5,2044,2940,2397,4619,2940,2940],
  [5,2146,3171,2517,5060,3171,3171],
  [5.5,3077,3033,3241,5533,3033,3033],
  [6,3210,3238,3380,6006,3238,3238],
  [6.5,3341,3443,3519,6479,3443,3443],
  [7,3474,3648,3659,6952,3648,3648],
  [7.5,3605,3755,3797,7424,3755,3755],
  [8,3736,3803,3936,7897,3803,3803],
  [8.5,3869,3889,4075,8370,3889,3889],
  [9,4000,3908,4215,8843,3908,3908],
  [9.5,4132,4087,4353,9316,4087,4087],
  [10,4263,4063,4492,9014,4063,4063],
  [10.5,4922,5162,5359,6397,5162,5162],
  [11,4913,5153,5349,6388,5153,5153],
  [11.5,5369,5631,5845,6978,5631,5631],
  [12,5360,5621,5836,6969,5621,5621],
  [12.5,5816,6099,6331,7559,6099,6099],
  [13,5806,6090,6322,7549,6090,6090],
  [13.5,6262,6568,6818,8140,6568,6568],
  [14,6253,6558,6808,8130,6558,6558],
  [14.5,6709,7036,7304,8720,7036,7036],
  [15,6699,7027,7294,8711,7027,7027],
  [15.5,6351,6902,6902,7891,6902,6902],
  [16,6342,6892,6892,7882,6892,6892],
  [16.5,6748,7332,7332,8384,7332,7332],
  [17,6738,7323,7323,8374,7323,7323],
  [17.5,7144,7763,7763,8876,7763,7763],
  [18,7135,7754,7754,8867,7754,7754],
  [18.5,7540,8194,8194,9369,8194,8194],
  [19,7531,8184,8184,9360,8184,8184],
  [19.5,7937,8625,8625,9862,8625,8625],
  [20,7927,8615,8615,9852,8615,8615],
  [20.5,7421,8085,8344,9604,8085,8085],
  [21,7602,8282,8547,9838,8282,8282],
  [21.5,7783,8479,8751,10072,8479,8479],
  [22,7964,8677,8954,10307,8677,8677],
  [22.5,8145,8874,9158,10541,8874,8874],
  [23,8326,9071,9361,10775,9071,9071],
  [23.5,8507,9268,9565,11009,9268,9268],
  [24,8688,9465,9768,11244,9465,9465],
  [24.5,8869,9662,9972,11478,9662,9662],
  [25,9050,9860,10169,11712,9860,9860],
];

const ARAMEX_PER_KG_71: number[] = [317.02,358.02,364.30,444.78,358.02,358.02];

// ── Rate Lookup Functions ──

function lookupFedExRate(weightKg: number, zone: FedExZone): number {
  const zoneIdx = FEDEX_ZONES.indexOf(zone);
  if (zoneIdx === -1) return 0;

  // Round weight UP to nearest 0.5 kg slab
  const slabWeight = Math.ceil(weightKg * 2) / 2;

  // Find the matching slab in the rate table
  for (const row of FEDEX_RATES) {
    if (row[0] >= slabWeight) {
      return row[zoneIdx + 1]; // +1 because index 0 is weight
    }
  }

  // Weight exceeds table — use last slab + per-kg rate for excess
  const lastRow = FEDEX_RATES[FEDEX_RATES.length - 1];
  const lastWeight = lastRow[0];
  const lastRate = lastRow[zoneIdx + 1];
  const excessKg = slabWeight - lastWeight;
  if (excessKg <= 0) return lastRate;
  return lastRate + excessKg * FEDEX_PER_KG_71[zoneIdx];
}

function lookupAramexRate(weightKg: number, zone: AramexZone): number {
  const zoneIdx = ARAMEX_ZONES.indexOf(zone);
  if (zoneIdx === -1) return 0;

  const slabWeight = Math.ceil(weightKg * 2) / 2;

  for (const row of ARAMEX_RATES) {
    if (row[0] >= slabWeight) {
      return row[zoneIdx + 1];
    }
  }

  const lastRow = ARAMEX_RATES[ARAMEX_RATES.length - 1];
  const lastWeight = lastRow[0];
  const lastRate = lastRow[zoneIdx + 1];
  const excessKg = slabWeight - lastWeight;
  if (excessKg <= 0) return lastRate;
  return lastRate + excessKg * ARAMEX_PER_KG_71[zoneIdx];
}

// ── Main Rate Calculation ──

export interface CalculateRateParams {
  destinationCountryCode: string;
  shipmentType: ShipmentType;
  weightGrams: number;
  dimensions?: { length: number; width: number; height: number };
  declaredValue?: number;
}

export const calculateVolumetricWeight = (
  length: number, width: number, height: number, divisor: number = DIM_DIVISOR
): number => (length * width * height) / divisor;

export const calculateRate = (
  params: CalculateRateParams,
  isGuest: boolean = false,
): RateCalculationResult | null => {
  const country = getCountryByCode(params.destinationCountryCode);
  if (!country || !country.isServed) return null;

  const actualWeightKg = params.weightGrams / 1000;
  let billableWeightKg = actualWeightKg;

  if (params.dimensions) {
    const dimWeight = calculateVolumetricWeight(
      params.dimensions.length, params.dimensions.width, params.dimensions.height
    );
    billableWeightKg = Math.max(actualWeightKg, dimWeight);
  }

  // Minimum billable weight: 0.5 kg
  billableWeightKg = Math.max(billableWeightKg, 0.5);

  // Look up base rate based on carrier
  let baseRate: number;
  const carrier: Carrier = country.carrier === 'Aramex' ? 'Aramex' : 'FedEx';

  if (carrier === 'Aramex') {
    baseRate = lookupAramexRate(billableWeightKg, country.rateZone as AramexZone);
  } else {
    baseRate = lookupFedExRate(billableWeightKg, country.rateZone as FedExZone);
  }

  if (baseRate === 0) return null;

  // Apply multiplier to base rate ONLY
  const multiplier = isGuest ? NON_ACCOUNT_MULTIPLIER : ACCOUNT_HOLDER_MULTIPLIER;
  const markedUpBase = Math.round(baseRate * multiplier);

  // Fuel Surcharge (carrier-specific, on original base rate)
  const fuelPercent = carrier === 'Aramex' ? ARAMEX_FUEL_SURCHARGE_PERCENT : FEDEX_FUEL_SURCHARGE_PERCENT;
  const fuelSurcharge = Math.round(baseRate * fuelPercent / 100);

  // Domestic transit cost (pickup to warehouse/airport) — ₹80 per kg
  const domesticTransit = Math.round(Math.max(billableWeightKg, 1) * DOMESTIC_TRANSIT_PER_KG);

  // Subtotal = marked up base + surcharges
  const subtotal = markedUpBase + fuelSurcharge + domesticTransit;

  // GST @ 18% on subtotal
  const gst = Math.round(subtotal * GST_RATE);
  
  // Total — no GST charged (below GST threshold)
  const total = subtotal;

  // Calculate savings for guests
  const accountMarkedUpBase = Math.round(baseRate * ACCOUNT_HOLDER_MULTIPLIER);
  const accountSubtotal = accountMarkedUpBase + fuelSurcharge + domesticTransit;
  const accountTotal = accountSubtotal;
  const savings = isGuest ? (total - accountTotal) : 0;

  return {
    baseRate: markedUpBase,
    weightCharge: 0,
    fuelSurcharge,
    insurance: 0,
    handlingFee: 0,
    customsFee: 0,
    exportClearance: domesticTransit,
    subtotal,
    gst: 0,
    total,
    carrier,
    zone: country.rateZone,
    billableWeightKg,
    breakdown: [
      { label: 'Base rate', amount: markedUpBase },
      { label: `Fuel surcharge (${fuelPercent}%)`, amount: fuelSurcharge },
      { label: 'Domestic transit', amount: domesticTransit },
    ],
  };
};

// ── Courier Options ──

export const getCourierOptions = (
  params: CalculateRateParams,
  isGuest: boolean = false,
): CourierOption[] => {
  const country = getCountryByCode(params.destinationCountryCode);
  if (!country || !country.isServed) return [];

  const result = calculateRate(params, isGuest);
  if (!result) return [];

  const carrier = result.carrier;
  const baseTransit = getBaseTransitDays(country.zone);

  const options: CourierOption[] = [
    {
      carrier,
      serviceName: carrier === 'Aramex' ? 'Aramex Express' : 'FedEx International Priority',
      price: result.total,
      transitDays: baseTransit,
      isRecommended: true,
      features: carrier === 'Aramex'
        ? ['Door-to-door delivery', 'Real-time tracking', 'Local Middle East expertise', 'Arabic support']
        : ['Express delivery', 'Real-time tracking', 'Money-back guarantee', 'Custom clearance support'],
    },
  ];

  return options;
};

function getBaseTransitDays(zone: number): { min: number; max: number } {
  const transitDays: Record<number, { min: number; max: number }> = {
    1: { min: 3, max: 5 },
    2: { min: 4, max: 7 },
    3: { min: 5, max: 8 },
    4: { min: 5, max: 9 },
    5: { min: 6, max: 10 },
    6: { min: 7, max: 12 },
  };
  return transitDays[zone] || { min: 7, max: 14 };
}

// CSB IV compliance check
export const checkCSBIVCompliance = (declaredValue: number): {
  isCompliant: boolean;
  message?: string;
} => {
  const CSB_IV_LIMIT = 25000;
  if (declaredValue > CSB_IV_LIMIT) {
    return {
      isCompliant: false,
      message: `Declared value exceeds CSB IV limit of ₹${CSB_IV_LIMIT.toLocaleString()}. Please contact us for assistance.`,
    };
  }
  return { isCompliant: true };
};

/**
 * Calculate international shipping cost for authenticated booking flows.
 * Used by bookingAdapter.ts for medicine/document/gift bookings.
 */
export function calculateInternationalShippingCost(
  destinationCountryCode: string,
  weightKg: number,
  dimensions?: { length: number; width: number; height: number },
): { shippingCost: number; gstAmount: number; totalAmount: number } | null {
  const result = calculateRate({
    destinationCountryCode,
    shipmentType: 'gift', // shipment type doesn't affect rate — rates are weight/zone based
    weightGrams: weightKg * 1000,
    dimensions,
  }, false);

  if (!result) return null;

  return {
    shippingCost: result.subtotal,
    gstAmount: result.gst,
    totalAmount: result.total,
  };
}
