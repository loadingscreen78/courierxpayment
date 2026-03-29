// Country database with zone and carrier mapping from Unified Rate Card
// Zone codes: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q (FedEx)
//             ME1, ME2, ME3, ME4, Qatar, Oman (Aramex)

export type Region = 'americas' | 'europe' | 'middle-east' | 'asia-pacific' | 'africa';
export type FedExZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q';
export type AramexZone = 'ME1' | 'ME2' | 'ME3' | 'ME4' | 'Qatar' | 'Oman';
export type RateZone = FedExZone | AramexZone;
export type CarrierType = 'Fedex' | 'Aramex';

// Keep legacy ShippingZone for backward compat (mapped from new zones)
export type ShippingZone = 1 | 2 | 3 | 4 | 5 | 6;

export interface Country {
  code: string;
  name: string;
  region: Region;
  zone: ShippingZone; // legacy zone for transit days etc
  rateZone: RateZone; // actual rate lookup zone
  carrier: CarrierType;
  currency: string;
  phoneCode: string;
  isServed: boolean;
  notServedReason?: string;
  flag: string;
}

// Map rate zones to legacy shipping zones for transit day estimation
function legacyZone(rateZone: RateZone): ShippingZone {
  const map: Record<string, ShippingZone> = {
    'ME1': 1, 'ME2': 1, 'ME3': 1, 'ME4': 1, 'Qatar': 1, 'Oman': 1,
    'A': 2, 'B': 2, 'C': 2, 'D': 2,
    'E': 2, 'H': 2,
    'F': 3, 'I': 3,
    'G': 4, 'L': 4, 'J': 4,
    'K': 5,
    'M': 6, 'N': 6, 'O': 6, 'P': 6, 'Q': 6,
  };
  return map[rateZone] || 6;
}

function regionFromZone(rateZone: RateZone, name: string): Region {
  if (['ME1','ME2','ME3','ME4','Qatar','Oman'].includes(rateZone)) return 'middle-east';
  // Some ME4 countries are in different regions but carrier is Aramex
  const africaCountries = ['Algeria','Angola','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde','Central African Republic','Chad','Comoros','Ivory Coast','Djibouti','Equatorial Guinea','Eritrea','Ethiopia','Gabon','Gambia','Ghana','Guinea-Bissau','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Réunion','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Swaziland','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe','the Democratic Republic of the Congo','Republic of the Congo'];
  const americasCountries = ['Argentina','Bahamas','Barbados','Belize','Bermuda','Bolivia','Brazil','Canada','Cayman Islands','Chile','Colombia','Costa Rica','Cuba','Dominican Republic','Ecuador','El Salvador','Guatemala','Guyana','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Paraguay','Peru','Puerto Rico','Suriname','Trinidad and Tobago','United States','Uruguay','Venezuela','Anguilla','Antigua and Barbuda','Aruba','Curaçao','Dominica','Falkland Islands (Malvinas)','French Guiana','Grenada','Guadeloupe','Martinique','Montserrat','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Sint Maarten (Dutch part)','Turks and Caicos Islands','U.S. Virgin Islands','Virgin Islands','Saint Barthélemy','Saint Martin (French part)','Saint Pierre and Miquelon'];
  const europeCountries = ['Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Czech Republic','Denmark','Estonia','Faroe Islands','Finland','France','Germany','Gibraltar','Greece','Greenland','Hungary','Iceland','Ireland','Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Macedonia','Malta','Moldova','Monaco','Montenegro','Netherlands','Norway','Poland','Portugal','Romania','Russia','San Marino','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Ukraine','United Kingdom','Holy See (Vatican City State)','Aland Islands'];
  const oceaniaCountries = ['Australia','New Zealand','Fiji','Papua New Guinea','New Caledonia','French Polynesia','Samoa','Tonga','Vanuatu','Solomon Islands','Cook Islands','Guam','Kiribati','Marshall Islands','Micronesia','Nauru','Niue','Norfolk Island','Northern Mariana Islands','Palau','Pitcairn','Tokelau','Tuvalu','Wallis and Futuna','American Samoa'];
  if (africaCountries.includes(name)) return 'africa';
  if (americasCountries.includes(name)) return 'americas';
  if (europeCountries.includes(name)) return 'europe';
  if (oceaniaCountries.includes(name)) return 'asia-pacific';
  return 'asia-pacific';
}

// Flag emoji from ISO code
function flag(code: string): string {
  if (!code || code.length < 2) return '🏳️';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// Phone codes (common ones)
const phoneCodes: Record<string, string> = {
  AF:'+93',AX:'+358',AL:'+355',DZ:'+213',AS:'+1',AD:'+376',AO:'+244',AI:'+1',AG:'+1',AR:'+54',AM:'+374',AW:'+297',AU:'+61',AT:'+43',AZ:'+994',BS:'+1',BH:'+973',BD:'+880',BB:'+1',BY:'+375',BE:'+32',BZ:'+501',BJ:'+229',BM:'+1',BT:'+975',BO:'+591',BA:'+387',BW:'+267',BR:'+55',BN:'+673',BG:'+359',BF:'+226',BI:'+257',KH:'+855',CM:'+237',CA:'+1',CV:'+238',KY:'+1',CF:'+236',TD:'+235',CL:'+56',CN:'+86',CO:'+57',KM:'+269',CK:'+682',CR:'+506',HR:'+385',CU:'+53',CW:'+599',CY:'+357',CZ:'+420',DK:'+45',DJ:'+253',DM:'+1',DO:'+1',EC:'+593',EG:'+20',SV:'+503',GQ:'+240',ER:'+291',EE:'+372',ET:'+251',FK:'+500',FO:'+298',FJ:'+679',FI:'+358',FR:'+33',GF:'+594',PF:'+689',GA:'+241',GM:'+220',GE:'+995',DE:'+49',GH:'+233',GI:'+350',GR:'+30',GL:'+299',GD:'+1',GP:'+590',GU:'+1',GT:'+502',GG:'+44',GW:'+245',GN:'+224',GY:'+592',HT:'+509',VA:'+39',HN:'+504',HK:'+852',HU:'+36',IS:'+354',ID:'+62',IQ:'+964',IE:'+353',IM:'+44',IL:'+972',IT:'+39',CI:'+225',JM:'+1',JP:'+81',JE:'+44',JO:'+962',KZ:'+7',KE:'+254',KI:'+686',KR:'+82',KW:'+965',KG:'+996',LA:'+856',LV:'+371',LB:'+961',LS:'+266',LR:'+231',LY:'+218',LI:'+423',LT:'+370',LU:'+352',MO:'+853',MK:'+389',MG:'+261',MW:'+265',MY:'+60',MV:'+960',ML:'+223',MT:'+356',MH:'+692',MQ:'+596',MR:'+222',MU:'+230',YT:'+262',MX:'+52',FM:'+691',MD:'+373',MC:'+377',MN:'+976',ME:'+382',MS:'+1',MA:'+212',MZ:'+258',MM:'+95',NR:'+674',NP:'+977',NL:'+31',NC:'+687',NZ:'+64',NI:'+505',NE:'+227',NG:'+234',NU:'+683',NF:'+672',MP:'+1',NO:'+47',OM:'+968',PK:'+92',PW:'+680',PS:'+970',PA:'+507',PG:'+675',PY:'+595',PE:'+51',PH:'+63',PN:'+64',PL:'+48',PT:'+351',PR:'+1',QA:'+974',RE:'+262',RO:'+40',RU:'+7',RW:'+250',BL:'+590',SH:'+290',KN:'+1',LC:'+1',MF:'+590',PM:'+508',VC:'+1',WS:'+685',SM:'+378',ST:'+239',SA:'+966',SN:'+221',RS:'+381',SC:'+248',SL:'+232',SG:'+65',SX:'+1',SK:'+421',SI:'+386',SB:'+677',SO:'+252',ZA:'+27',GS:'+500',SS:'+211',ES:'+34',LK:'+94',SD:'+249',SR:'+597',SJ:'+47',SZ:'+268',SE:'+46',CH:'+41',SY:'+963',TW:'+886',TJ:'+992',TZ:'+255',TH:'+66',TL:'+670',TG:'+228',TK:'+690',TO:'+676',TT:'+1',TN:'+216',TR:'+90',TM:'+993',TC:'+1',TV:'+688',VI:'+1',UG:'+256',UA:'+380',AE:'+971',GB:'+44',US:'+1',UY:'+598',UZ:'+998',VU:'+678',VE:'+58',VN:'+84',WF:'+681',EH:'+212',YE:'+967',ZM:'+260',ZW:'+263',CD:'+243',CG:'+242',
};

// Currencies
const currencies: Record<string, string> = {
  AF:'AFN',AX:'EUR',AL:'ALL',DZ:'DZD',AS:'USD',AD:'EUR',AO:'AOA',AI:'XCD',AG:'XCD',AR:'ARS',AM:'AMD',AW:'AWG',AU:'AUD',AT:'EUR',AZ:'AZN',BS:'BSD',BH:'BHD',BD:'BDT',BB:'BBD',BY:'BYN',BE:'EUR',BZ:'BZD',BJ:'XOF',BM:'BMD',BT:'BTN',BO:'BOB',BA:'BAM',BW:'BWP',BR:'BRL',BN:'BND',BG:'BGN',BF:'XOF',BI:'BIF',KH:'KHR',CM:'XAF',CA:'CAD',CV:'CVE',KY:'KYD',CF:'XAF',TD:'XAF',CL:'CLP',CN:'CNY',CO:'COP',KM:'KMF',CK:'NZD',CR:'CRC',HR:'EUR',CU:'CUP',CW:'ANG',CY:'EUR',CZ:'CZK',DK:'DKK',DJ:'DJF',DM:'XCD',DO:'DOP',EC:'USD',EG:'EGP',SV:'USD',GQ:'XAF',ER:'ERN',EE:'EUR',ET:'ETB',FK:'FKP',FO:'DKK',FJ:'FJD',FI:'EUR',FR:'EUR',GF:'EUR',PF:'XPF',GA:'XAF',GM:'GMD',GE:'GEL',DE:'EUR',GH:'GHS',GI:'GIP',GR:'EUR',GL:'DKK',GD:'XCD',GP:'EUR',GU:'USD',GT:'GTQ',GG:'GBP',GW:'XOF',GN:'GNF',GY:'GYD',HT:'HTG',VA:'EUR',HN:'HNL',HK:'HKD',HU:'HUF',IS:'ISK',ID:'IDR',IQ:'IQD',IE:'EUR',IM:'GBP',IL:'ILS',IT:'EUR',CI:'XOF',JM:'JMD',JP:'JPY',JE:'GBP',JO:'JOD',KZ:'KZT',KE:'KES',KI:'AUD',KR:'KRW',KW:'KWD',KG:'KGS',LA:'LAK',LV:'EUR',LB:'LBP',LS:'LSL',LR:'LRD',LY:'LYD',LI:'CHF',LT:'EUR',LU:'EUR',MO:'MOP',MK:'MKD',MG:'MGA',MW:'MWK',MY:'MYR',MV:'MVR',ML:'XOF',MT:'EUR',MH:'USD',MQ:'EUR',MR:'MRU',MU:'MUR',YT:'EUR',MX:'MXN',FM:'USD',MD:'MDL',MC:'EUR',MN:'MNT',ME:'EUR',MS:'XCD',MA:'MAD',MZ:'MZN',MM:'MMK',NR:'AUD',NP:'NPR',NL:'EUR',NC:'XPF',NZ:'NZD',NI:'NIO',NE:'XOF',NG:'NGN',NU:'NZD',NF:'AUD',MP:'USD',NO:'NOK',OM:'OMR',PK:'PKR',PW:'USD',PS:'ILS',PA:'PAB',PG:'PGK',PY:'PYG',PE:'PEN',PH:'PHP',PN:'NZD',PL:'PLN',PT:'EUR',PR:'USD',QA:'QAR',RE:'EUR',RO:'RON',RU:'RUB',RW:'RWF',BL:'EUR',SH:'SHP',KN:'XCD',LC:'XCD',MF:'EUR',PM:'EUR',VC:'XCD',WS:'WST',SM:'EUR',ST:'STN',SA:'SAR',SN:'XOF',RS:'RSD',SC:'SCR',SL:'SLL',SG:'SGD',SX:'ANG',SK:'EUR',SI:'EUR',SB:'SBD',SO:'SOS',ZA:'ZAR',GS:'GBP',SS:'SSP',ES:'EUR',LK:'LKR',SD:'SDG',SR:'SRD',SJ:'NOK',SZ:'SZL',SE:'SEK',CH:'CHF',SY:'SYP',TW:'TWD',TJ:'TJS',TZ:'TZS',TH:'THB',TL:'USD',TG:'XOF',TK:'NZD',TO:'TOP',TT:'TTD',TN:'TND',TR:'TRY',TM:'TMT',TC:'USD',TV:'AUD',VI:'USD',UG:'UGX',UA:'UAH',AE:'AED',GB:'GBP',US:'USD',UY:'UYU',UZ:'UZS',VU:'VUV',VE:'VES',VN:'VND',WF:'XPF',EH:'MAD',YE:'YER',ZM:'ZMW',ZW:'ZWL',CD:'CDF',CG:'XAF',
};

// ── Master country-zone-carrier data from Unified_Rate_Card.xlsx ──
// Each entry: [Country, ISO Code, RateZone, Carrier]
const COUNTRY_ZONE_DATA: [string, string, RateZone, CarrierType][] = [
  ['Afghanistan','AF','C','Fedex'],
  ['Albania','AL','I','Fedex'],
  ['Algeria','DZ','O','Fedex'],
  ['American Samoa','AS','E','Fedex'],
  ['Andorra','AD','I','Fedex'],
  ['Angola','AO','O','Fedex'],
  ['Anguilla','AI','J','Fedex'],
  ['Antigua and Barbuda','AG','J','Fedex'],
  ['Argentina','AR','J','Fedex'],
  ['Armenia','AM','I','Fedex'],
  ['Aruba','AW','J','Fedex'],
  ['Australia','AU','E','Fedex'],
  ['Austria','AT','I','Fedex'],
  ['Azerbaijan','AZ','I','Fedex'],
  ['Bahamas','BS','J','Fedex'],
  ['United Arab Emirates','AE','ME1','Aramex'],
  ['Bangladesh','BD','B','Fedex'],
  ['Barbados','BB','J','Fedex'],
  ['Belgium','BE','F','Fedex'],
  ['Belize','BZ','J','Fedex'],
  ['Benin','BJ','Q','Fedex'],
  ['Bermuda','BM','J','Fedex'],
  ['Bhutan','BT','B','Fedex'],
  ['Bolivia','BO','J','Fedex'],
  ['Bosnia and Herzegovina','BA','I','Fedex'],
  ['Botswana','BW','P','Fedex'],
  ['Brazil','BR','J','Fedex'],
  ['Brunei Darussalam','BN','E','Fedex'],
  ['Bulgaria','BG','I','Fedex'],
  ['Burkina Faso','BF','Q','Fedex'],
  ['Burundi','BI','Q','Fedex'],
  ['Cambodia','KH','E','Fedex'],
  ['Cameroon','CM','Q','Fedex'],
  ['Canada','CA','L','Fedex'],
  ['Cape Verde','CV','Q','Fedex'],
  ['Cayman Islands','KY','J','Fedex'],
  ['Central African Republic','CF','N','Fedex'],
  ['Chad','TD','N','Fedex'],
  ['Chile','CL','J','Fedex'],
  ['China','CN','D','Fedex'],
  ['Colombia','CO','J','Fedex'],
  ['Comoros','KM','J','Fedex'],
  ['Cook Islands','CK','E','Fedex'],
  ['Costa Rica','CR','J','Fedex'],
  ['Croatia','HR','I','Fedex'],
  ['Bahrain','BH','ME2','Aramex'],
  ['Czech Republic','CZ','I','Fedex'],
  ['Denmark','DK','F','Fedex'],
  ['Djibouti','DJ','N','Fedex'],
  ['Dominica','DM','J','Fedex'],
  ['Dominican Republic','DO','J','Fedex'],
  ['Ecuador','EC','J','Fedex'],
  ['Cyprus','CY','ME4','Aramex'],
  ['El Salvador','SV','J','Fedex'],
  ['Equatorial Guinea','GQ','Q','Fedex'],
  ['Eritrea','ER','N','Fedex'],
  ['Estonia','EE','I','Fedex'],
  ['Ethiopia','ET','N','Fedex'],
  ['Faroe Islands','FO','F','Fedex'],
  ['Fiji','FJ','E','Fedex'],
  ['Finland','FI','I','Fedex'],
  ['France','FR','F','Fedex'],
  ['French Guiana','GF','J','Fedex'],
  ['French Polynesia','PF','E','Fedex'],
  ['Gabon','GA','Q','Fedex'],
  ['Gambia','GM','Q','Fedex'],
  ['Georgia','GE','I','Fedex'],
  ['Germany','DE','F','Fedex'],
  ['Ghana','GH','O','Fedex'],
  ['Gibraltar','GI','I','Fedex'],
  ['Greece','GR','I','Fedex'],
  ['Greenland','GL','F','Fedex'],
  ['Grenada','GD','J','Fedex'],
  ['Guadeloupe','GP','J','Fedex'],
  ['Guam','GU','E','Fedex'],
  ['Guatemala','GT','J','Fedex'],
  ['Guinea-Bissau','GW','Q','Fedex'],
  ['Guinea','GN','Q','Fedex'],
  ['Guyana','GY','J','Fedex'],
  ['Haiti','HT','J','Fedex'],
  ['Honduras','HN','J','Fedex'],
  ['Hong Kong','HK','D','Fedex'],
  ['Hungary','HU','I','Fedex'],
  ['Iceland','IS','I','Fedex'],
  ['Indonesia','ID','E','Fedex'],
  ['Iraq','IQ','C','Fedex'],
  ['Ireland','IE','I','Fedex'],
  ['Israel','IL','I','Fedex'],
  ['Italy','IT','F','Fedex'],
  ['Ivory Coast','CI','O','Fedex'],
  ['Jamaica','JM','J','Fedex'],
  ['Japan','JP','H','Fedex'],
  ['Egypt','EG','ME4','Aramex'],
  ['Kazakhstan','KZ','I','Fedex'],
  ['Kenya','KE','N','Fedex'],
  ['Jordan','JO','ME4','Aramex'],
  ['Kyrgyzstan','KG','I','Fedex'],
  ['Laos','LA','J','Fedex'],
  ['Latvia','LV','I','Fedex'],
  ['Kuwait','KW','ME2','Aramex'],
  ['Lesotho','LS','P','Fedex'],
  ['Liberia','LR','Q','Fedex'],
  ['Liechtenstein','LI','F','Fedex'],
  ['Lithuania','LT','I','Fedex'],
  ['Luxembourg','LU','F','Fedex'],
  ['Macau','MO','J','Fedex'],
  ['Macedonia','MK','I','Fedex'],
  ['Madagascar','MG','Q','Fedex'],
  ['Malawi','MW','Q','Fedex'],
  ['Malaysia','MY','E','Fedex'],
  ['Maldives','MV','B','Fedex'],
  ['Mali','ML','Q','Fedex'],
  ['Malta','MT','I','Fedex'],
  ['Marshall Islands','MH','E','Fedex'],
  ['Mauritania','MR','Q','Fedex'],
  ['Mauritius','MU','N','Fedex'],
  ['Mexico','MX','G','Fedex'],
  ['Micronesia','FM','E','Fedex'],
  ['Moldova','MD','I','Fedex'],
  ['Monaco','MC','I','Fedex'],
  ['Mongolia','MN','E','Fedex'],
  ['Montenegro','ME','I','Fedex'],
  ['Morocco','MA','O','Fedex'],
  ['Mozambique','MZ','Q','Fedex'],
  ['Myanmar','MM','C','Fedex'],
  ['Namibia','NA','P','Fedex'],
  ['Nepal','NP','B','Fedex'],
  ['Netherlands','NL','F','Fedex'],
  ['New Caledonia','NC','E','Fedex'],
  ['New Zealand','NZ','E','Fedex'],
  ['Nicaragua','NI','J','Fedex'],
  ['Niger','NE','Q','Fedex'],
  ['Nigeria','NG','O','Fedex'],
  ['Norway','NO','I','Fedex'],
  ['Lebanon','LB','ME4','Aramex'],
  ['Oman','OM','Oman','Aramex'],
  ['Palestine','PS','C','Fedex'],
  ['Panama','PA','J','Fedex'],
  ['Papua New Guinea','PG','E','Fedex'],
  ['Paraguay','PY','J','Fedex'],
  ['Peru','PE','J','Fedex'],
  ['Philippines','PH','E','Fedex'],
  ['Poland','PL','I','Fedex'],
  ['Portugal','PT','I','Fedex'],
  ['Puerto Rico','PR','J','Fedex'],
  ['Qatar','QA','Qatar','Aramex'],
  ['Romania','RO','I','Fedex'],
  ['Russia','RU','I','Fedex'],
  ['Rwanda','RW','P','Fedex'],
  ['Samoa','WS','E','Fedex'],
  ['San Marino','SM','J','Fedex'],
  ['Saudi Arabia','SA','ME3','Aramex'],
  ['Senegal','SN','Q','Fedex'],
  ['Serbia','RS','I','Fedex'],
  ['Seychelles','SC','O','Fedex'],
  ['Sierra Leone','SL','Q','Fedex'],
  ['Singapore','SG','B','Fedex'],
  ['Slovakia','SK','I','Fedex'],
  ['Slovenia','SI','I','Fedex'],
  ['Solomon Islands','SB','E','Fedex'],
  ['South Africa','ZA','K','Fedex'],
  ['South Korea','KR','E','Fedex'],
  ['South Sudan','SS','N','Fedex'],
  ['Spain','ES','F','Fedex'],
  ['Sri Lanka','LK','B','Fedex'],
  ['Suriname','SR','J','Fedex'],
  ['Swaziland','SZ','P','Fedex'],
  ['Sweden','SE','I','Fedex'],
  ['Switzerland','CH','F','Fedex'],
  ['Syria','SY','C','Fedex'],
  ['Taiwan','TW','E','Fedex'],
  ['Tajikistan','TJ','J','Fedex'],
  ['Tanzania','TZ','N','Fedex'],
  ['Thailand','TH','D','Fedex'],
  ['Timor-Leste','TL','E','Fedex'],
  ['Togo','TG','Q','Fedex'],
  ['Tonga','TO','E','Fedex'],
  ['Trinidad and Tobago','TT','J','Fedex'],
  ['Tunisia','TN','Q','Fedex'],
  ['Turkmenistan','TM','C','Fedex'],
  ['Turkey','TR','ME4','Aramex'],
  ['United Kingdom','GB','F','Fedex'],
  ['United States','US','G','Fedex'],
  ['Uruguay','UY','J','Fedex'],
  ['Uzbekistan','UZ','I','Fedex'],
  ['Vanuatu','VU','E','Fedex'],
  ['Venezuela','VE','J','Fedex'],
  ['Vietnam','VN','E','Fedex'],
  ['Yemen','YE','ME4','Aramex'],
  ['Zambia','ZM','P','Fedex'],
  ['Zimbabwe','ZW','P','Fedex'],
];

// Not-served countries (sanctions, conflict, limited access)
const NOT_SERVED: Record<string, string> = {
  'AF': 'Limited courier access',
  'IQ': 'Limited courier access',
  'SY': 'Limited courier access',
  'YE': 'Limited courier access',
  'SS': 'Limited courier access',
  'SO': 'Limited courier access',
  'CU': 'Trade restrictions',
  'KP': 'International sanctions',
  'IR': 'International sanctions',
  'SD': 'International sanctions',
  'VE': 'Banking restrictions',
  'LY': 'Limited courier access',
  'ER': 'Limited courier access',
  'TM': 'Limited courier access',
  'PS': 'Limited courier access',
};

export const countries: Country[] = COUNTRY_ZONE_DATA.map(([name, code, rateZone, carrier]) => ({
  code,
  name,
  region: regionFromZone(rateZone, name),
  zone: legacyZone(rateZone),
  rateZone,
  carrier,
  currency: currencies[code] || 'USD',
  phoneCode: phoneCodes[code] || '+1',
  isServed: !NOT_SERVED[code],
  ...(NOT_SERVED[code] ? { notServedReason: NOT_SERVED[code] } : {}),
  flag: flag(code),
}));

// Helper functions
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code === code);
};

export const getServedCountries = (): Country[] => {
  return countries.filter(c => c.isServed).sort((a, b) => a.name.localeCompare(b.name));
};

export const getNotServedCountries = (): Country[] => {
  return countries.filter(c => !c.isServed);
};

export const getCountriesByRegion = (region: Region): Country[] => {
  return countries.filter(c => c.region === region);
};

export const getCountriesByZone = (zone: ShippingZone): Country[] => {
  return countries.filter(c => c.zone === zone);
};

export const searchCountries = (query: string): Country[] => {
  const lowerQuery = query.toLowerCase();
  return countries.filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.code.toLowerCase().includes(lowerQuery)
  );
};

export const regionLabels: Record<Region, string> = {
  'americas': 'Americas',
  'europe': 'Europe',
  'middle-east': 'Middle East',
  'asia-pacific': 'Asia Pacific',
  'africa': 'Africa',
};
