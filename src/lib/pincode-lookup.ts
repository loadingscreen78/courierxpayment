// Indian PIN Code lookup — data.gov.in API (All India Pincode Directory) with local fallback
export interface PincodeData {
  city: string;
  state: string;
  district: string;
  area: string;
}

// data.gov.in API response shape
export interface DataGovPincodeRecord {
  circlename: string;
  regionname: string;
  divisionname: string;
  officename: string;
  pincode: string;
  officetype: string;
  deliverystatus: string;
  districtname: string;
  statename: string;
  telephone: string;
  relatedsuboffice: string;
  relatedheadoffice: string;
  longitude: string;
  latitude: string;
}

export interface DataGovPincodeResponse {
  status: string;
  total: number;
  count: number;
  limit: number;
  offset: number;
  records: DataGovPincodeRecord[];
}

// Legacy shape kept for backward compat (India Post API)
export interface PincodeResponse {
  Status: string;
  PostOffice: Array<{
    Name: string;
    District: string;
    State: string;
    Block: string;
    Division: string;
    Region: string;
    Circle: string;
    Country: string;
  }> | null;
}

// ---------------------------------------------------------------------------
// Local pincode-to-state mapping (first 2 digits → state)
// Based on India Post's official pincode allocation.
// Used as a reliable fallback when the India Post API is down.
// ---------------------------------------------------------------------------
const PINCODE_PREFIX_TO_STATE: Record<string, string> = {
  '11': 'Delhi', '12': 'Haryana', '13': 'Haryana',
  '14': 'Punjab', '15': 'Punjab', '16': 'Punjab',
  '17': 'Himachal Pradesh', '18': 'Jammu and Kashmir', '19': 'Jammu and Kashmir',
  '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh',
  '23': 'Uttar Pradesh', '24': 'Uttar Pradesh', '25': 'Uttar Pradesh',
  '26': 'Uttarakhand', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
  '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan',
  '33': 'Rajasthan', '34': 'Rajasthan',
  '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat', '39': 'Gujarat',
  '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra',
  '43': 'Maharashtra', '44': 'Maharashtra', '45': 'Madhya Pradesh',
  '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',
  '50': 'Telangana', '51': 'Andhra Pradesh', '52': 'Andhra Pradesh',
  '53': 'Andhra Pradesh', '54': 'Andhra Pradesh', '55': 'Andhra Pradesh',
  '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
  '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu',
  '63': 'Tamil Nadu', '64': 'Tamil Nadu',
  '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
  '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal',
  '73': 'West Bengal', '74': 'West Bengal',
  '75': 'Odisha', '76': 'Odisha', '77': 'Odisha',
  '78': 'Assam', '79': 'Arunachal Pradesh',
  '80': 'Bihar', '81': 'Bihar', '82': 'Bihar', '83': 'Bihar', '84': 'Bihar',
  '85': 'Jharkhand',
  '86': 'Jharkhand',
  '90': 'Manipur', '91': 'Mizoram', '92': 'Nagaland',
  '93': 'Tripura', '94': 'Meghalaya', '95': 'Sikkim',
  '10': 'Delhi',
  '35': 'Gujarat',
  '65': 'Tamil Nadu', '66': 'Kerala',
};

/**
 * Resolve state from pincode using the local prefix map.
 * Returns null only if the prefix is truly unknown.
 */
export function getStateFromPincode(pincode: string): string | null {
  if (!pincode || pincode.length < 2) return null;
  const prefix = pincode.slice(0, 2);
  return PINCODE_PREFIX_TO_STATE[prefix] || null;
}

/**
 * Lookup pincode via data.gov.in All India Pincode Directory API.
 * Falls back to local prefix mapping if the API is unavailable.
 */
export async function lookupPincode(pincode: string): Promise<PincodeData | null> {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    return null;
  }

  // Try data.gov.in API first (with timeout)
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const url = `https://api.data.gov.in/resource/all-india-pincode-directory-till-last-month?api-key=${apiKey}&format=json&limit=10&filters%5Bpincode%5D=${pincode}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      const data: DataGovPincodeResponse = await response.json();

      if (data?.records?.length) {
        const record = data.records[0];
        const stateName = record.statename || '';
        const districtName = record.districtname || '';
        const officeName = record.officename || '';
        return {
          city: districtName || stateName,
          state: stateName,
          district: districtName,
          area: officeName,
        };
      }
    } catch (error) {
      console.warn('[pincode-lookup] data.gov.in API failed, using local fallback:', (error as Error).message);
    }
  }

  // Fallback: local prefix-based state resolution
  const state = getStateFromPincode(pincode);
  if (state) {
    return {
      city: '',
      state,
      district: '',
      area: '',
    };
  }

  return null;
}

// Indian states list
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Major cities by state for dropdown
export const CITIES_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Kadapa', 'Anantapur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu', 'Along'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Bihar Sharif', 'Arrah'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh', 'Jagdalpur'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Nadiad'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Palampur', 'Baddi'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davangere', 'Bellary', 'Shimoga', 'Tumkur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar', 'Sri Ganganagar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Noida'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur'],
  'Andaman and Nicobar Islands': ['Port Blair', 'Car Nicobar'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
  'Delhi': ['New Delhi', 'Delhi'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};
