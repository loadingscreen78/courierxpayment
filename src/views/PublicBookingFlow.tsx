"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CircleNotch, UserPlus, Pill, FileText, Gift, Truck, Globe, User, Envelope, Phone, MapPin, Info, AirplaneTilt, Warning, X, IdentificationCard, Upload, IdentificationBadge, House, Plus, Trash, MagnifyingGlass, CaretUpDown, Check, PencilSimple, CaretDown, CaretRight, ShieldCheck, EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MedicineNameSearch } from '@/components/booking/medicine/MedicineNameSearch';
import { getHsnCode } from '@/lib/medicine/medicineData';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getCourierOptions, calculateRate, type CourierOption } from '@/lib/shipping/rateCalculator';
import { getAllCountriesForDropdown, getCountryByCode } from '@/lib/shipping/countries';
import GuestSummaryStep from '@/components/guest-booking/GuestSummaryStep';
import AadhaarKycUpload from '@/components/guest-booking/AadhaarKycUpload';
import { usePincodeLookup } from '@/hooks/usePincodeLookup';
import { useAadhaarOcr } from '@/hooks/useAadhaarOcr';
import { INDIAN_STATES } from '@/lib/pincode-lookup';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type FlowMode = 'international' | 'domestic';

interface PublicBookingFlowProps {
  mode: FlowMode;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const internationalRateSchema = z.object({
  shipmentType: z.enum(['medicine', 'document', 'gift'], { required_error: 'Select shipment type' }),
  destinationCountry: z.string().min(2, 'Select destination country'),
  weightGrams: z.coerce.number().min(100, 'Min 100g').max(10000, 'Max 10 kg for guest booking'),
  lengthCm: z.coerce.number().min(1, 'Required').max(150),
  widthCm: z.coerce.number().min(1, 'Required').max(150),
  heightCm: z.coerce.number().min(1, 'Required').max(150),
  declaredValue: z.coerce.number().optional().default(1000),
  prohibitedItemsConfirmed: z.boolean().refine(val => val === true, { message: 'You must confirm your package does not contain prohibited items' }),
}).superRefine((data, ctx) => {
  if (data.shipmentType === 'document') {
    if (data.weightGrams > 1000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max 1 kg', path: ['weightGrams'] });
  }
});

const domesticRateSchema = z.object({
  shipmentType: z.enum(['document', 'gift'], { required_error: 'Select shipment type' }),
  pickupPincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  deliveryPincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  weightKg: z.coerce.number().min(0.1, 'Min 0.1 kg').max(30, 'Max 30 kg'),
  lengthCm: z.coerce.number().min(1, 'Required').max(150),
  widthCm: z.coerce.number().min(1, 'Required').max(150),
  heightCm: z.coerce.number().min(1, 'Required').max(150),
  declaredValue: z.coerce.number().min(0).max(49000, 'Max ₹49,000'),
}).superRefine((data, ctx) => {
  if (data.shipmentType === 'document') {
    if (data.weightKg > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max 1 kg', path: ['weightKg'] });
    if (data.declaredValue > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max ₹100 declared value', path: ['declaredValue'] });
  }
  if (data.shipmentType === 'gift') {
    if (data.weightKg > 30) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Gift/Parcel max 30 kg', path: ['weightKg'] });
    if (data.declaredValue > 49000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Max declared value ₹49,000', path: ['declaredValue'] });
  }
});

const senderReceiverSchema = z.object({
  senderName: z.string().min(2, 'Required'),
  senderPhone: z.string().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Valid Indian phone required'),
  senderEmail: z.string().email('Valid email required'),
  senderAddress: z.string().min(5, 'Required'),
  senderCity: z.string().min(2, 'Required'),
  senderState: z.string().min(2, 'Required'),
  senderPincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit pincode'),
  receiverName: z.string().min(2, 'Required'),
  receiverPhone: z.string().min(5, 'Required'),
  receiverEmail: z.string().email('Valid email required'),
  receiverAddress: z.string().min(5, 'Required'),
  receiverCity: z.string().min(2, 'Required'),
  receiverState: z.string().min(1, 'Required'),
  receiverZipcode: z.string().min(3, 'Required'),
  contentDescription: z.string().min(3, 'Describe contents'),
});

type InternationalRateValues = z.infer<typeof internationalRateSchema>;
type DomesticRateValues = z.infer<typeof domesticRateSchema>;
type SenderReceiverValues = z.infer<typeof senderReceiverSchema>;

const shipmentTypeOptions = {
  international: [
    { value: 'medicine' as const, label: 'Medicine', icon: Pill, desc: 'Prescription medicines (CSB-IV)' },
    { value: 'document' as const, label: 'Document', icon: FileText, desc: 'Documents & certificates' },
    { value: 'gift' as const, label: 'Gift / Personal', icon: Gift, desc: 'Gifts, clothing, food' },
  ],
  domestic: [
    { value: 'document' as const, label: 'Document', icon: FileText, desc: 'Documents & paperwork' },
    { value: 'gift' as const, label: 'Gift / Parcel', icon: Gift, desc: 'Gifts, clothing, items' },
  ],
};

// ── Document Types for International Document Shipping ──
const DOCUMENT_TYPE_OPTIONS = [
  { label: 'Legal Documents', value: 'Legal Documents', hsn: '49070030' },
  { label: 'Educational Certificates', value: 'Educational Certificates', hsn: '49070010' },
  { label: 'Government Documents', value: 'Government Documents', hsn: '49070030' },
  { label: 'Medical Records', value: 'Medical Records', hsn: '49070090' },
  { label: 'Business Contracts', value: 'Business Contracts', hsn: '49070030' },
  { label: 'Property Documents', value: 'Property Documents', hsn: '49070030' },
  { label: 'Tax Documents', value: 'Tax Documents', hsn: '49070030' },
  { label: 'Other', value: 'Other', hsn: '49070090' },
];

// Default HSN code for documents
const DOCUMENT_HSN_CODE = '49070030';

// ── Gift Item Subtypes with 8-digit HSN codes ──
const GIFT_ITEM_SUBTYPES: Record<string, Array<{ label: string; value: string; hsn: string }>> = {
  clothing: [
    { label: 'T-Shirts (Knitted)', value: 'tshirt-knitted', hsn: '61091000' },
    { label: 'Shirts (Men, Woven)', value: 'shirt-men-woven', hsn: '62052000' },
    { label: 'Blouses (Women, Woven)', value: 'blouse-women-woven', hsn: '62064000' },
    { label: 'Trousers / Pants (Men)', value: 'trousers-men', hsn: '62034200' },
    { label: 'Dresses (Women)', value: 'dress-women', hsn: '62044400' },
    { label: 'Sarees', value: 'saree', hsn: '52091100' },
    { label: 'Kurta / Kurti', value: 'kurta', hsn: '62114300' },
    { label: 'Jackets / Blazers', value: 'jacket', hsn: '62033200' },
    { label: 'Sweaters / Pullovers', value: 'sweater', hsn: '61101100' },
    { label: 'Shawls / Scarves', value: 'shawl', hsn: '62142000' },
    { label: 'Socks / Hosiery', value: 'socks', hsn: '61159600' },
    { label: 'Undergarments', value: 'undergarments', hsn: '61071100' },
    { label: 'Sportswear / Activewear', value: 'sportswear', hsn: '61121100' },
    { label: 'Baby Clothing', value: 'baby-clothing', hsn: '61119000' },
    { label: 'Other Clothing', value: 'other-clothing', hsn: '62114990' },
  ],
  electronics: [
    { label: 'Laptop / Notebook', value: 'laptop', hsn: '84713020' },
    { label: 'Tablet / iPad', value: 'tablet', hsn: '84713010' },
    { label: 'Mobile Phone / Smartphone', value: 'mobile', hsn: '85171200' },
    { label: 'Headphones / Earphones', value: 'headphones', hsn: '85183000' },
    { label: 'Smartwatch / Wearable', value: 'smartwatch', hsn: '91021200' },
    { label: 'Power Bank', value: 'powerbank', hsn: '85076000' },
    { label: 'Camera', value: 'camera', hsn: '85258090' },
    { label: 'USB / Storage Device', value: 'usb-storage', hsn: '85235100' },
    { label: 'Charger / Adapter', value: 'charger', hsn: '85044090' },
    { label: 'Speaker / Bluetooth Speaker', value: 'speaker', hsn: '85182200' },
    { label: 'Keyboard / Mouse', value: 'keyboard-mouse', hsn: '84716060' },
    { label: 'Other Electronics', value: 'other-electronics', hsn: '85437099' },
  ],
  food: [
    { label: 'Spices (Turmeric, Cumin, etc.)', value: 'spices', hsn: '09109100' },
    { label: 'Pepper / Chilli', value: 'pepper-chilli', hsn: '09042110' },
    { label: 'Tea (Packaged)', value: 'tea', hsn: '09024010' },
    { label: 'Coffee (Packaged)', value: 'coffee', hsn: '09012110' },
    { label: 'Chocolates', value: 'chocolates', hsn: '18069000' },
    { label: 'Sweets / Mithai', value: 'sweets', hsn: '17049090' },
    { label: 'Biscuits / Cookies', value: 'biscuits', hsn: '19053100' },
    { label: 'Namkeen / Snacks', value: 'namkeen', hsn: '19059090' },
    { label: 'Pickles / Chutneys', value: 'pickles', hsn: '20019090' },
    { label: 'Dry Fruits / Nuts', value: 'dry-fruits', hsn: '08013100' },
    { label: 'Instant Noodles / Ready Meals', value: 'instant-food', hsn: '19023010' },
    { label: 'Health Supplements', value: 'supplements', hsn: '21069099' },
    { label: 'Honey', value: 'honey', hsn: '04090000' },
    { label: 'Papad / Fryums', value: 'papad', hsn: '19059040' },
    { label: 'Other Packaged Food', value: 'other-food', hsn: '21069099' },
  ],
  cosmetics: [
    { label: 'Skincare (Face Cream, Lotion)', value: 'skincare', hsn: '33049990' },
    { label: 'Makeup (Foundation, Lipstick)', value: 'makeup', hsn: '33041000' },
    { label: 'Perfume / Eau de Toilette', value: 'perfume', hsn: '33030010' },
    { label: 'Deodorant / Body Spray', value: 'deodorant', hsn: '33072000' },
    { label: 'Shampoo', value: 'shampoo', hsn: '33051000' },
    { label: 'Hair Oil / Serum', value: 'hair-oil', hsn: '33059090' },
    { label: 'Soap / Body Wash', value: 'soap', hsn: '34011190' },
    { label: 'Sunscreen', value: 'sunscreen', hsn: '33049910' },
    { label: 'Nail Polish / Nail Care', value: 'nail-polish', hsn: '33043000' },
    { label: 'Kajal / Eyeliner', value: 'kajal', hsn: '33042000' },
    { label: 'Toothpaste / Oral Care', value: 'toothpaste', hsn: '33061000' },
    { label: 'Other Personal Care', value: 'other-cosmetics', hsn: '33079090' },
  ],
  handicraft: [
    { label: 'Wooden Carving / Sculpture', value: 'wood-carving', hsn: '44201000' },
    { label: 'Brass / Metal Artwork', value: 'brass-art', hsn: '74181090' },
    { label: 'Painting (Handmade)', value: 'painting', hsn: '97011000' },
    { label: 'Marble / Stone Craft', value: 'marble-craft', hsn: '68029990' },
    { label: 'Pottery / Terracotta', value: 'pottery', hsn: '69139000' },
    { label: 'Textile Handicraft (Embroidery)', value: 'textile-craft', hsn: '58109200' },
    { label: 'Bamboo / Cane Craft', value: 'bamboo-craft', hsn: '46021900' },
    { label: 'Papier-Mâché', value: 'papier-mache', hsn: '48239090' },
    { label: 'Lacquerware', value: 'lacquerware', hsn: '44209090' },
    { label: 'Other Handicraft', value: 'other-handicraft', hsn: '97019000' },
  ],
  books: [
    { label: 'Printed Books (Fiction / Non-Fiction)', value: 'printed-books', hsn: '49011010' },
    { label: 'Educational / Textbooks', value: 'textbooks', hsn: '49011020' },
    { label: 'Religious / Spiritual Books', value: 'religious-books', hsn: '49019900' },
    { label: 'Notebooks / Diaries', value: 'notebooks', hsn: '48201010' },
    { label: 'Pens (Ballpoint / Fountain)', value: 'pens', hsn: '96081000' },
    { label: 'Pencils / Crayons', value: 'pencils', hsn: '96091010' },
    { label: 'Art Supplies (Paints, Brushes)', value: 'art-supplies', hsn: '96032100' },
    { label: 'Greeting Cards', value: 'greeting-cards', hsn: '49090010' },
    { label: 'Calendars / Posters', value: 'calendars', hsn: '49100010' },
    { label: 'Other Stationery', value: 'other-stationery', hsn: '48209090' },
  ],
  toys: [
    { label: 'Soft Toys / Stuffed Animals', value: 'soft-toys', hsn: '95030030' },
    { label: 'Action Figures / Dolls', value: 'dolls', hsn: '95030020' },
    { label: 'Building Blocks / LEGO', value: 'building-blocks', hsn: '95030090' },
    { label: 'Board Games / Puzzles', value: 'board-games', hsn: '95049090' },
    { label: 'Remote Control Toys', value: 'rc-toys', hsn: '95030010' },
    { label: 'Educational Toys', value: 'educational-toys', hsn: '95030090' },
    { label: 'Video Game Console', value: 'game-console', hsn: '95041000' },
    { label: 'Video Game Cartridge / Disc', value: 'game-disc', hsn: '95049010' },
    { label: 'Outdoor Play Equipment', value: 'outdoor-toys', hsn: '95030010' },
    { label: 'Other Toys / Games', value: 'other-toys', hsn: '95030090' },
  ],
  jewelry: [
    { label: 'Necklace / Chain', value: 'necklace', hsn: '71171990' },
    { label: 'Earrings', value: 'earrings', hsn: '71171990' },
    { label: 'Bangles / Bracelets', value: 'bangles', hsn: '71171910' },
    { label: 'Rings', value: 'rings', hsn: '71171990' },
    { label: 'Anklets', value: 'anklets', hsn: '71179090' },
    { label: 'Brooch / Pin', value: 'brooch', hsn: '71179090' },
    { label: 'Hair Accessories', value: 'hair-accessories', hsn: '71179090' },
    { label: 'Jewelry Set', value: 'jewelry-set', hsn: '71171990' },
    { label: 'Other Imitation Jewelry', value: 'other-jewelry', hsn: '71179090' },
  ],
  household: [
    { label: 'Stainless Steel Utensils', value: 'ss-utensils', hsn: '73239390' },
    { label: 'Copper / Brass Utensils', value: 'copper-utensils', hsn: '74181020' },
    { label: 'Ceramic Tableware', value: 'ceramic-tableware', hsn: '69120010' },
    { label: 'Porcelain Tableware', value: 'porcelain-tableware', hsn: '69111010' },
    { label: 'Glassware', value: 'glassware', hsn: '70134990' },
    { label: 'Bed Linen / Bedsheets', value: 'bed-linen', hsn: '63021010' },
    { label: 'Towels', value: 'towels', hsn: '63026000' },
    { label: 'Curtains', value: 'curtains', hsn: '63039200' },
    { label: 'Carpet / Rug', value: 'carpet', hsn: '57021090' },
    { label: 'Candles / Decorative Items', value: 'candles', hsn: '34060010' },
    { label: 'Photo Frames', value: 'photo-frames', hsn: '44140000' },
    { label: 'Other Household Items', value: 'other-household', hsn: '73239990' },
  ],
  other: [
    { label: 'Bags / Handbags (Leather)', value: 'bags-leather', hsn: '42022100' },
    { label: 'Bags / Handbags (Textile)', value: 'bags-textile', hsn: '42022290' },
    { label: 'Wallets / Purses', value: 'wallets', hsn: '42023100' },
    { label: 'Belts (Leather)', value: 'belts', hsn: '42031000' },
    { label: 'Shoes / Footwear (Leather)', value: 'shoes-leather', hsn: '64035190' },
    { label: 'Shoes / Footwear (Rubber/Plastic)', value: 'shoes-rubber', hsn: '64029990' },
    { label: 'Sandals / Chappals', value: 'sandals', hsn: '64041900' },
    { label: 'Sunglasses', value: 'sunglasses', hsn: '90041000' },
    { label: 'Watches', value: 'watches', hsn: '91019090' },
    { label: 'Umbrella', value: 'umbrella', hsn: '66019100' },
    { label: 'Other Items', value: 'other-misc', hsn: '99080000' },
  ],
};

// ── Common HSN Codes for International Shipping ──
const COMMON_HSN_CODES = [
  { code: '3004', desc: 'Medicaments (mixed or unmixed)' },
  { code: '3003', desc: 'Medicaments (unmixed, for retail)' },
  { code: '3006', desc: 'Pharmaceutical preparations' },
  { code: '4901', desc: 'Printed books, brochures' },
  { code: '4907', desc: 'Stamps, cheque forms, certificates' },
  { code: '4911', desc: 'Printed matter (catalogues, posters)' },
  { code: '6109', desc: 'T-shirts, singlets, tank tops (knitted)' },
  { code: '6110', desc: 'Jerseys, pullovers, cardigans (knitted)' },
  { code: '6104', desc: 'Women suits, dresses, skirts (knitted)' },
  { code: '6103', desc: 'Men suits, jackets, trousers (knitted)' },
  { code: '6204', desc: 'Women suits, dresses (not knitted)' },
  { code: '6203', desc: 'Men suits, jackets (not knitted)' },
  { code: '6205', desc: 'Men shirts (not knitted)' },
  { code: '6206', desc: 'Women blouses, shirts (not knitted)' },
  { code: '6402', desc: 'Footwear (rubber/plastic outer sole)' },
  { code: '6403', desc: 'Footwear (leather outer sole)' },
  { code: '6911', desc: 'Tableware, kitchenware (porcelain)' },
  { code: '7113', desc: 'Jewelry (precious metal)' },
  { code: '7117', desc: 'Imitation jewelry' },
  { code: '8471', desc: 'Computers, laptops, tablets' },
  { code: '8517', desc: 'Telephones, smartphones' },
  { code: '8528', desc: 'Monitors, TVs, projectors' },
  { code: '8523', desc: 'Storage media (USB, SD cards)' },
  { code: '9503', desc: 'Toys, puzzles, models' },
  { code: '9504', desc: 'Video game consoles, accessories' },
  { code: '3304', desc: 'Beauty/makeup preparations' },
  { code: '3305', desc: 'Hair care preparations' },
  { code: '3307', desc: 'Perfumes, deodorants' },
  { code: '1704', desc: 'Sugar confectionery (sweets)' },
  { code: '1806', desc: 'Chocolate preparations' },
  { code: '1905', desc: 'Bread, pastry, biscuits' },
  { code: '0910', desc: 'Spices (ginger, turmeric, curry)' },
  { code: '0904', desc: 'Pepper, chillies' },
  { code: '2106', desc: 'Food preparations (supplements)' },
  { code: '4202', desc: 'Bags, suitcases, wallets' },
  { code: '4203', desc: 'Leather articles (belts, gloves)' },
  { code: '6302', desc: 'Bed linen, table linen' },
  { code: '5702', desc: 'Carpets, rugs (woven)' },
  { code: '9701', desc: 'Paintings, drawings (handmade)' },
  { code: '4420', desc: 'Wood marquetry, caskets, statuettes' },
  { code: '6912', desc: 'Ceramic tableware (non-porcelain)' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PublicBookingFlow({ mode }: PublicBookingFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isInternational = mode === 'international';
  const countries = getAllCountriesForDropdown();

  // Steps: 1=rate form, 2=rate results, 3=sender/receiver details
  const [step, setStep] = useState(1);
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
  const [rateFormData, setRateFormData] = useState<InternationalRateValues | DomesticRateValues | null>(null);
  const [guestCouriers, setGuestCouriers] = useState<CourierOption[]>([]);
  const [accountCouriers, setAccountCouriers] = useState<CourierOption[]>([]);
  const [domesticCouriers, setDomesticCouriers] = useState<any[]>([]);
  const [isDomesticLoading, setIsDomesticLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderReceiverData, setSenderReceiverData] = useState<any>(null);
  const [addressSubStep, setAddressSubStep] = useState<'pickup' | 'sender' | 'receiver' | 'content'>('pickup');
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [passportIdentity, setPassportIdentity] = useState<File | null>(null);
  const [passportAddress, setPassportAddress] = useState<File | null>(null);
  const [contentItems, setContentItems] = useState<Array<{ name: string; type: string; hsnCode: string; qty: number; unitPrice: number }>>([
    { name: '', type: '', hsnCode: '', qty: 1, unitPrice: 0 },
  ]);
  const [expandedItemIndex, setExpandedItemIndex] = useState<number>(0);
  const [prescriptionDocs, setPrescriptionDocs] = useState<File[]>([]);
  const [pharmacyBillDocs, setPharmacyBillDocs] = useState<File[]>([]);
  const [intlZipLookup, setIntlZipLookup] = useState<{ loading: boolean; city: string; state: string; error: string }>({ loading: false, city: '', state: '', error: '' });
  const [showWeightLimitModal, setShowWeightLimitModal] = useState(false);

  // ── Aadhaar OCR state ──
  const { ocrResult, isProcessing: ocrProcessing, ocrError, processAadhaar, clearOcr } = useAadhaarOcr();
  const [extractedAadhaarNumber, setExtractedAadhaarNumber] = useState('');
  const [isUnderAge, setIsUnderAge] = useState(false);

  // ── Email OTP verification state ──
  const [emailOtpState, setEmailOtpState] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified'>('idle');
  const [emailOtpCode, setEmailOtpCode] = useState(['', '', '', '', '', '']);
  const [emailOtpToken, setEmailOtpToken] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
  const [emailOtpAttempts, setEmailOtpAttempts] = useState(0);

  // ── International rate form ──
  const intlForm = useForm<InternationalRateValues>({
    resolver: zodResolver(internationalRateSchema),
    defaultValues: { shipmentType: undefined, destinationCountry: '', weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10, declaredValue: 1000, prohibitedItemsConfirmed: false },
  });

  // ── Domestic rate form ──
  const domForm = useForm<DomesticRateValues>({
    resolver: zodResolver(domesticRateSchema),
    defaultValues: { shipmentType: undefined, pickupPincode: '', deliveryPincode: '', weightKg: undefined as any, lengthCm: undefined as any, widthCm: undefined as any, heightCm: undefined as any, declaredValue: undefined as any },
  });

  // ── Sender/Receiver form ──
  const detailsForm = useForm<SenderReceiverValues>({
    resolver: zodResolver(senderReceiverSchema),
    defaultValues: {
      senderName: '', senderPhone: '', senderEmail: '', senderAddress: '', senderCity: '', senderState: '', senderPincode: '',
      receiverName: '', receiverPhone: '', receiverEmail: '', receiverAddress: '', receiverCity: '', receiverState: '', receiverZipcode: '',
      contentDescription: '',
    },
  });

  // Watch shipment type to conditionally render document-specific fields
  const watchedIntlType = intlForm.watch('shipmentType');
  const isDocumentIntl = watchedIntlType === 'document';
  const isMedicineFlow = isInternational && rateFormData && 'shipmentType' in rateFormData && rateFormData.shipmentType === 'medicine';
  const isDocumentFlow = isInternational && rateFormData && 'shipmentType' in rateFormData && rateFormData.shipmentType === 'document';
  const isGiftFlow = isInternational && rateFormData && 'shipmentType' in rateFormData && rateFormData.shipmentType === 'gift';
  // All international guest flows require Aadhaar KYC
  const requiresAadhaarKyc = isInternational && (isMedicineFlow || isDocumentFlow || isGiftFlow);
  const destinationCountryInfo = isInternational && rateFormData && 'destinationCountry' in rateFormData
    ? getCountryByCode((rateFormData as InternationalRateValues).destinationCountry) : null;

  // Watch domestic shipment type
  const watchedDomType = domForm.watch('shipmentType');
  const isDocumentDom = watchedDomType === 'document';

  // ── Pre-fill from rate calculator localStorage data ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem('publicRateCalcData');
      if (!raw) return;
      const data = JSON.parse(raw);
      // Only use data less than 30 minutes old
      if (Date.now() - (data.timestamp || 0) > 30 * 60 * 1000) return;

      if (!isInternational && data.mode === 'domestic') {
        if (data.pickupPincode) domForm.setValue('pickupPincode', data.pickupPincode);
        if (data.deliveryPincode) domForm.setValue('deliveryPincode', data.deliveryPincode);
        if (data.shipmentType) domForm.setValue('shipmentType', data.shipmentType);
        if (data.weightKg) domForm.setValue('weightKg', data.weightKg);
        if (data.lengthCm) domForm.setValue('lengthCm', data.lengthCm);
        if (data.widthCm) domForm.setValue('widthCm', data.widthCm);
        if (data.heightCm) domForm.setValue('heightCm', data.heightCm);
      }
      // Clean up after reading
      localStorage.removeItem('publicRateCalcData');
    } catch { /* ignore parse errors */ }
  }, [isInternational, domForm]);

  // ── Pincode lookups for domestic rate form (step 1) ──
  const ratePickupPin = domForm.watch('pickupPincode');
  const rateDeliveryPin = domForm.watch('deliveryPincode');
  const pickupLookup = usePincodeLookup(!isInternational ? ratePickupPin : '');
  const deliveryLookup = usePincodeLookup(!isInternational ? rateDeliveryPin : '');

  // ── Volumetric weight calculation (NimbusPost formula: L×W×H / 5000) ──
  const watchedLength = domForm.watch('lengthCm');
  const watchedWidth = domForm.watch('widthCm');
  const watchedHeight = domForm.watch('heightCm');
  const watchedWeight = domForm.watch('weightKg');
  const volumetricWeight = (watchedLength && watchedWidth && watchedHeight)
    ? Number(((watchedLength * watchedWidth * watchedHeight) / 5000).toFixed(2))
    : 0;
  const chargeableWeight = Math.max(Number(watchedWeight) || 0, volumetricWeight);

  // ── Pincode auto-fill for domestic ──
  // For domestic: pre-fill sender pincode from pickupPincode, receiver from deliveryPincode
  const domesticPickupPincode = !isInternational ? (rateFormData as DomesticRateValues)?.pickupPincode || '' : '';
  const domesticDeliveryPincode = !isInternational ? (rateFormData as DomesticRateValues)?.deliveryPincode || '' : '';

  // Watch the actual pincode fields for lookup
  const senderPincodeValue = detailsForm.watch('senderPincode');
  const receiverPincodeValue = detailsForm.watch('receiverZipcode');

  // India Post lookups — sender is always Indian pickup address
  const senderLookup = usePincodeLookup(senderPincodeValue);
  const receiverLookup = usePincodeLookup(!isInternational ? receiverPincodeValue : '');

  // Auto-fill pincodes when entering step 3 for domestic
  useEffect(() => {
    if (step === 3 && !isInternational && domesticPickupPincode) {
      const currentSenderPin = detailsForm.getValues('senderPincode');
      if (!currentSenderPin) {
        detailsForm.setValue('senderPincode', domesticPickupPincode);
      }
    }
    if (step === 3 && !isInternational && domesticDeliveryPincode) {
      const currentReceiverPin = detailsForm.getValues('receiverZipcode');
      if (!currentReceiverPin) {
        detailsForm.setValue('receiverZipcode', domesticDeliveryPincode);
      }
    }
  }, [step, isInternational, domesticPickupPincode, domesticDeliveryPincode, detailsForm]);

  // Auto-fill city/state from lookup results
  useEffect(() => {
    if (senderLookup.district) {
      const currentCity = detailsForm.getValues('senderCity');
      if (!currentCity) detailsForm.setValue('senderCity', senderLookup.district);
    }
    if (senderLookup.state) {
      detailsForm.setValue('senderState', senderLookup.state);
    }
  }, [senderLookup.district, senderLookup.state, detailsForm]);

  useEffect(() => {
    if (receiverLookup.district && !isInternational) {
      const currentCity = detailsForm.getValues('receiverCity');
      if (!currentCity) detailsForm.setValue('receiverCity', receiverLookup.district);
    }
  }, [receiverLookup.district, isInternational, detailsForm]);

  // ── International zip code lookup (zippopotam.us) ──
  const receiverZip = detailsForm.watch('receiverZipcode');
  useEffect(() => {
    if (!isInternational || !destinationCountryInfo || !receiverZip || receiverZip.length < 3) {
      setIntlZipLookup({ loading: false, city: '', state: '', error: '' });
      return;
    }
    const countryCode = destinationCountryInfo.code.toLowerCase();
    const timer = setTimeout(async () => {
      setIntlZipLookup(prev => ({ ...prev, loading: true, error: '' }));
      try {
        const res = await fetch(`https://api.zippopotam.us/${countryCode}/${receiverZip}`);
        if (res.ok) {
          const data = await res.json();
          const place = data.places?.[0];
          if (place) {
            const city = place['place name'] || '';
            const state = place['state'] || place['state abbreviation'] || '';
            setIntlZipLookup({ loading: false, city, state, error: '' });
            if (city) detailsForm.setValue('receiverCity', city);
            if (state) detailsForm.setValue('receiverState', state);
          } else {
            setIntlZipLookup({ loading: false, city: '', state: '', error: '' });
          }
        } else {
          setIntlZipLookup({ loading: false, city: '', state: '', error: '' });
        }
      } catch {
        setIntlZipLookup({ loading: false, city: '', state: '', error: '' });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [receiverZip, isInternational, destinationCountryInfo, detailsForm]);

  // ── Handle international rate calculation ──
  const handleIntlRateSubmit = (values: InternationalRateValues) => {
    const guest = getCourierOptions({
      destinationCountryCode: values.destinationCountry,
      shipmentType: values.shipmentType,
      weightGrams: values.weightGrams,
      dimensions: { length: values.lengthCm, width: values.widthCm, height: values.heightCm },
      declaredValue: values.declaredValue,
    }, true);

    const account = getCourierOptions({
      destinationCountryCode: values.destinationCountry,
      shipmentType: values.shipmentType,
      weightGrams: values.weightGrams,
      dimensions: { length: values.lengthCm, width: values.widthCm, height: values.heightCm },
      declaredValue: values.declaredValue,
    }, false);

    setGuestCouriers(guest);
    setAccountCouriers(account);
    setRateFormData(values);
    setStep(2);
  };

  // ── Handle domestic rate calculation ──
  const handleDomRateSubmit = async (values: DomesticRateValues) => {
    setIsDomesticLoading(true);
    setRateFormData(values);
    try {
      const res = await fetch('/api/domestic/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupPincode: values.pickupPincode,
          deliveryPincode: values.deliveryPincode,
          weightKg: values.weightKg,
          lengthCm: values.lengthCm,
          widthCm: values.widthCm,
          heightCm: values.heightCm,
          declaredValue: values.declaredValue,
          shipmentType: values.shipmentType,
          isGuest: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDomesticCouriers(data.couriers || []);
        setStep(2);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch rates', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setIsDomesticLoading(false);
    }
  };

  // ── Select a courier and go to details ──
  const handleSelectCourier = (courier: any) => {
    setSelectedCourier(courier);
    setStep(3);
  };

  // ── Submit sender/receiver and go to summary ──
  const handleFinalSubmit = (values: SenderReceiverValues) => {
    setSenderReceiverData(values);
    setStep(4);
  };

  // ── Aadhaar OCR processing + auto-fill ──
  const handleAadhaarProcess = useCallback(async () => {
    if (!aadhaarFront) return;
    const result = await processAadhaar(aadhaarFront, aadhaarBack);
    if (!result) return;

    // Age gate: block if under 18
    if (result.age !== null && result.age < 18) {
      setIsUnderAge(true);
      return;
    }
    setIsUnderAge(false);

    // Store extracted Aadhaar number for summary page auto-fill
    if (result.aadhaarNumber) {
      setExtractedAadhaarNumber(result.aadhaarNumber);
    }

    // Auto-fill sender form fields from OCR (only if currently empty or user hasn't typed)
    if (result.name) {
      const current = detailsForm.getValues('senderName');
      if (!current) detailsForm.setValue('senderName', result.name);
    }
    if (result.address) {
      const current = detailsForm.getValues('senderAddress');
      if (!current) detailsForm.setValue('senderAddress', result.address);
    }
    if (result.city) {
      const current = detailsForm.getValues('senderCity');
      if (!current) detailsForm.setValue('senderCity', result.city);
    }
    if (result.state) {
      detailsForm.setValue('senderState', result.state);
    }
    if (result.pincode) {
      const current = detailsForm.getValues('senderPincode');
      // For international flows, pincode isn't locked from rate form
      if (!current || isInternational) detailsForm.setValue('senderPincode', result.pincode);
    }
    if (result.phone) {
      const current = detailsForm.getValues('senderPhone');
      if (!current) detailsForm.setValue('senderPhone', result.phone);
    }
  }, [aadhaarFront, aadhaarBack, processAadhaar, detailsForm, isInternational]);

  // ── One-click rectify: overwrite sender fields with OCR data ──
  const handleRectifyFromAadhaar = useCallback(() => {
    if (!ocrResult) return;
    if (ocrResult.name) detailsForm.setValue('senderName', ocrResult.name);
    if (ocrResult.address) detailsForm.setValue('senderAddress', ocrResult.address);
    if (ocrResult.city) detailsForm.setValue('senderCity', ocrResult.city);
    if (ocrResult.state) detailsForm.setValue('senderState', ocrResult.state);
    if (ocrResult.pincode) detailsForm.setValue('senderPincode', ocrResult.pincode);
    if (ocrResult.phone) detailsForm.setValue('senderPhone', ocrResult.phone);
  }, [ocrResult, detailsForm]);

  // ── Validate pickup address fields before sliding to sender ──
  const handlePickupNext = async () => {
    const pickupFields = ['senderName', 'senderPhone', 'senderAddress', 'senderCity', 'senderState', 'senderPincode'] as const;
    const result = await detailsForm.trigger(pickupFields);
    if (result) setAddressSubStep('sender');
  };

  // ── Validate sender fields before sliding to receiver ──
  const handleSenderNext = async () => {
    const senderFields = ['senderName', 'senderPhone', 'senderEmail'] as const;
    const result = await detailsForm.trigger(senderFields);
    if (!result) return;
    // Block if under 18
    if (isUnderAge) {
      toast({ title: 'Age Restriction', description: 'Sender must be 18 years or older to book a shipment.', variant: 'destructive' });
      return;
    }
    // Require email verification for international flows
    if (isInternational && emailOtpState !== 'verified') {
      toast({ title: 'Email not verified', description: 'Please verify your email address before continuing.', variant: 'destructive' });
      return;
    }
    setAddressSubStep('receiver');
  };

  // ── Email OTP refs for auto-focus ──
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Send email OTP ──
  const handleSendEmailOtp = useCallback(async () => {
    const email = detailsForm.getValues('senderEmail');
    const valid = await detailsForm.trigger('senderEmail');
    if (!valid || !email) return;

    setEmailOtpState('sending');
    setEmailOtpError('');
    setEmailOtpCode(['', '', '', '', '', '']);
    setEmailOtpAttempts(0);

    try {
      const res = await fetch('/api/auth/guest-email-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setEmailOtpError(data.error || 'Failed to send code');
        setEmailOtpState('idle');
        return;
      }

      setEmailOtpToken(data.otpToken);
      setEmailOtpState('sent');
      // Start 60s cooldown for resend
      setEmailOtpCooldown(60);
      const timer = setInterval(() => {
        setEmailOtpCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      // Auto-focus first OTP input
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch {
      setEmailOtpError('Network error. Please try again.');
      setEmailOtpState('idle');
    }
  }, [detailsForm, toast]);

  // ── Handle OTP digit input ──
  const handleOtpDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...emailOtpCode];
    newCode[index] = value;
    setEmailOtpCode(newCode);
    setEmailOtpError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are filled (regardless of which digit was last)
    if (newCode.every(d => d)) {
      setTimeout(() => verifyEmailOtpRef.current(newCode.join('')), 50);
    }
  }, [emailOtpCode]);

  // ── Handle OTP paste ──
  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newCode = [...emailOtpCode];
    for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i];
    setEmailOtpCode(newCode);
    // Focus the next empty or last
    const nextEmpty = newCode.findIndex(d => !d);
    otpInputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    // Auto-verify if complete
    if (pasted.length === 6) {
      setTimeout(() => verifyEmailOtpRef.current(pasted), 50);
    }
  }, [emailOtpCode]);

  // ── Handle backspace navigation ──
  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !emailOtpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }, [emailOtpCode]);

  // ── Verify OTP (with 5-attempt rate limit) ──
  const verifyEmailOtp = useCallback(async (code: string) => {
    const email = detailsForm.getValues('senderEmail');
    if (!email || !emailOtpToken) return;

    if (emailOtpAttempts >= 5) {
      setEmailOtpError('Too many attempts. Please request a new code.');
      setEmailOtpState('sent');
      setEmailOtpCode(['', '', '', '', '', '']);
      return;
    }

    setEmailOtpState('verifying');
    setEmailOtpError('');
    setEmailOtpAttempts(prev => prev + 1);

    try {
      const res = await fetch('/api/auth/guest-email-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code, otpToken: emailOtpToken }),
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        const remaining = 5 - (emailOtpAttempts + 1);
        setEmailOtpError(remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many attempts. Please request a new code.');
        setEmailOtpState('sent');
        setEmailOtpCode(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }

      setEmailOtpState('verified');
      toast({ title: 'Email verified ✓', description: 'Your email has been verified successfully.' });
    } catch {
      setEmailOtpError('Verification failed. Please try again.');
      setEmailOtpState('sent');
    }
  }, [detailsForm, emailOtpToken, emailOtpAttempts, toast]);

  // Ref to always have latest verifyEmailOtp for use in callbacks
  const verifyEmailOtpRef = useRef(verifyEmailOtp);
  useEffect(() => { verifyEmailOtpRef.current = verifyEmailOtp; }, [verifyEmailOtp]);

  // ── Validate receiver fields before sliding to content ──
  const handleReceiverNext = async () => {
    const receiverFields = ['receiverName', 'receiverPhone', 'receiverEmail', 'receiverAddress', 'receiverCity', 'receiverState', 'receiverZipcode'] as const;
    const result = await detailsForm.trigger(receiverFields);
    if (result) setAddressSubStep('content');
  };

  // ── Region-specific address format guidance ──
  const getAddressGuidance = () => {
    if (!destinationCountryInfo) return 'Street address, building, apartment/unit number';
    switch (destinationCountryInfo.region) {
      case 'middle-east': return 'Building name/number, Street, Area/District, City. Include P.O. Box if available.';
      case 'americas': return 'Street number + Street name, Apt/Suite, City, State/Province, ZIP code';
      case 'europe': return 'Street name + number, Postal code, City, Country. Include apartment/floor if applicable.';
      case 'asia-pacific': return 'Block/Building, Street, District/Ward, City/Province, Postal code';
      case 'africa': return 'Street address, Suburb/Area, City, Postal code. Include landmarks if possible.';
      default: return 'Full street address with building, city, and postal code';
    }
  };

  const handleBack = () => {
    if (step === 1) router.push('/public/book');
    else setStep(step - 1);
  };

  const stepLabels = ['Shipment Details', 'Select Rate', 'Sender & Receiver', 'Summary & Pay'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img alt="CourierX" src="/logo.svg" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/auth')} className="rounded-xl text-sm">Sign In</Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/open-account')} className="rounded-xl text-sm gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Open Account — Save 52%
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-8 space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {isInternational ? <Globe className="h-6 w-6 text-blue-600" weight="duotone" /> : <Truck className="h-6 w-6 text-green-600" weight="duotone" />}
              {isInternational ? 'International Shipping' : 'Domestic Shipping'}
            </h1>
            <p className="text-muted-foreground text-sm">Guest booking — standard rates apply</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors mb-1 ${i + 1 <= step ? 'bg-coke-red' : 'bg-muted'}`} />
              <p className={`text-xs ${i + 1 <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</p>
            </div>
          ))}
        </div>

        {/* ═══════════════ STEP 1: Rate Calculator Form ═══════════════ */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-semibold text-lg">Enter shipment details to get rates</h2>

              {isInternational ? (
                <Form {...intlForm}>
                  <form onSubmit={intlForm.handleSubmit(handleIntlRateSubmit)} className="space-y-4">
                    {/* Shipment Type */}
                    <FormField control={intlForm.control} name="shipmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you shipping?</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {shipmentTypeOptions.international.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                field.value === opt.value
                                  ? 'border-coke-red bg-coke-red/5 ring-1 ring-coke-red/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <opt.icon className={`h-5 w-5 mb-1 ${field.value === opt.value ? 'text-coke-red' : 'text-muted-foreground'}`} weight="duotone" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Destination */}
                    <FormField control={intlForm.control} name="destinationCountry" render={({ field }) => {
                      const selectedCountry = countries.find(c => c.code === field.value);
                      return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Destination Country</FormLabel>
                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" role="combobox" aria-expanded={countryOpen} className="w-full justify-between font-normal">
                                {selectedCountry ? (
                                  <span>{selectedCountry.flag} {selectedCountry.name}</span>
                                ) : (
                                  <span className="text-muted-foreground">Search or select country...</span>
                                )}
                                <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search country..." />
                              <CommandList>
                                <CommandEmpty>No country found.</CommandEmpty>
                                <CommandGroup>
                                  {countries.map(c => (
                                    <CommandItem
                                      key={c.code}
                                      value={`${c.name} ${c.code}`}
                                      disabled={!c.isServed}
                                      onSelect={() => { field.onChange(c.code); setCountryOpen(false); }}
                                      className="flex items-center justify-between"
                                    >
                                      <span>{c.flag} {c.name}</span>
                                      {!c.isServed ? (
                                        <span className="text-xs text-muted-foreground ml-2">{c.notServedReason || 'Rate not available'}</span>
                                      ) : field.value === c.code ? (
                                        <Check className="h-4 w-4 text-coke-red" />
                                      ) : null}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                      );
                    }} />

                    {/* Weight */}
                    <FormField control={intlForm.control} name="weightGrams" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          {isDocumentIntl ? (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="500">Up to 500g</SelectItem>
                                <SelectItem value="1000">Up to 1 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              onValueChange={(v) => {
                                if (v === 'over10') {
                                  setShowWeightLimitModal(true);
                                } else {
                                  field.onChange(Number(v));
                                }
                              }}
                              value={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="500">Up to 500g</SelectItem>
                                <SelectItem value="1000">Up to 1 kg</SelectItem>
                                <SelectItem value="1500">Up to 1.5 kg</SelectItem>
                                <SelectItem value="2000">Up to 2 kg</SelectItem>
                                <SelectItem value="2500">Up to 2.5 kg</SelectItem>
                                <SelectItem value="3000">Up to 3 kg</SelectItem>
                                <SelectItem value="3500">Up to 3.5 kg</SelectItem>
                                <SelectItem value="4000">Up to 4 kg</SelectItem>
                                <SelectItem value="4500">Up to 4.5 kg</SelectItem>
                                <SelectItem value="5000">Up to 5 kg</SelectItem>
                                <SelectItem value="5500">Up to 5.5 kg</SelectItem>
                                <SelectItem value="6000">Up to 6 kg</SelectItem>
                                <SelectItem value="6500">Up to 6.5 kg</SelectItem>
                                <SelectItem value="7000">Up to 7 kg</SelectItem>
                                <SelectItem value="7500">Up to 7.5 kg</SelectItem>
                                <SelectItem value="8000">Up to 8 kg</SelectItem>
                                <SelectItem value="8500">Up to 8.5 kg</SelectItem>
                                <SelectItem value="9000">Up to 9 kg</SelectItem>
                                <SelectItem value="9500">Up to 9.5 kg</SelectItem>
                                <SelectItem value="10000">Up to 10 kg</SelectItem>
                                <SelectItem value="over10" className="text-coke-red font-medium">More than 10 kg →</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />

                    {/* Dimensions */}
                    <div>
                      <p className="text-sm font-medium mb-2">Package Dimensions (cm)</p>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField control={intlForm.control} name="lengthCm" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} type="number" placeholder="Length" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={intlForm.control} name="widthCm" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} type="number" placeholder="Width" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={intlForm.control} name="heightCm" render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} type="number" placeholder="Height" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Prohibited Items Confirmation */}
                    <FormField control={intlForm.control} name="prohibitedItemsConfirmed" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border p-4 bg-muted/30">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            I confirm this package does not contain prohibited items
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Gold, silver, precious metals, chemicals, narcotics, batteries, currency, physical cash, credit/debit cards, or any restricted substances.
                          </p>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )} />

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-5">
                      Calculate Rates <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              ) : (
                /* ── Domestic form ── */
                <Form {...domForm}>
                  <form onSubmit={domForm.handleSubmit(handleDomRateSubmit)} className="space-y-4">
                    {/* Shipment Type */}
                    <FormField control={domForm.control} name="shipmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you shipping?</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {shipmentTypeOptions.domestic.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                field.value === opt.value
                                  ? 'border-coke-red bg-coke-red/5 ring-1 ring-coke-red/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <opt.icon className={`h-5 w-5 mb-1 ${field.value === opt.value ? 'text-coke-red' : 'text-muted-foreground'}`} weight="duotone" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Pincodes with city/state display */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={domForm.control} name="pickupPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Pincode</FormLabel>
                          <FormControl><Input {...field} placeholder="110001" maxLength={6} /></FormControl>
                          {pickupLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                          {pickupLookup.state && <p className="text-xs text-candlestick-green">📍 {pickupLookup.district}, {pickupLookup.state}</p>}
                          {pickupLookup.error && <p className="text-xs text-destructive">{pickupLookup.error}</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={domForm.control} name="deliveryPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Pincode</FormLabel>
                          <FormControl><Input {...field} placeholder="400001" maxLength={6} /></FormControl>
                          {deliveryLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                          {deliveryLookup.state && <p className="text-xs text-candlestick-green">📍 {deliveryLookup.district}, {deliveryLookup.state}</p>}
                          {deliveryLookup.error && <p className="text-xs text-destructive">{deliveryLookup.error}</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Weight + Value */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={domForm.control} name="weightKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          {isDocumentDom ? (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.5">Up to 500g</SelectItem>
                                <SelectItem value="1">Up to 1 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.5">Up to 500g</SelectItem>
                                <SelectItem value="1">Up to 1 kg</SelectItem>
                                <SelectItem value="2">Up to 2 kg</SelectItem>
                                <SelectItem value="5">Up to 5 kg</SelectItem>
                                <SelectItem value="10">Up to 10 kg</SelectItem>
                                <SelectItem value="15">Up to 15 kg</SelectItem>
                                <SelectItem value="20">Up to 20 kg</SelectItem>
                                <SelectItem value="25">Up to 25 kg</SelectItem>
                                <SelectItem value="30">Up to 30 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={domForm.control} name="declaredValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Declared Value (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder={isDocumentDom ? 'Max ₹100' : 'Max ₹49,000'} max={isDocumentDom ? 100 : 49000} />
                          </FormControl>
                          {isDocumentDom && <p className="text-xs text-muted-foreground">Documents cannot exceed ₹100 declared value</p>}
                          {!isDocumentDom && <p className="text-xs text-muted-foreground">Maximum ₹49,000 for gift/parcel shipments</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Dimensions with measurement instructions */}
                    <div>
                      <p className="text-sm font-medium mb-1">Package Dimensions (cm)</p>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 mb-3">
                        <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" weight="fill" />
                          <span>Measure the outer dimensions of your packed box using a measuring tape. Enter the longest side as Length, the next as Width, and the shortest as Height. Courier charges are based on the higher of actual weight or volumetric weight (L×W×H ÷ 5000).</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField control={domForm.control} name="lengthCm" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Length</FormLabel><FormControl><Input {...field} type="number" placeholder="cm" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={domForm.control} name="widthCm" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Width</FormLabel><FormControl><Input {...field} type="number" placeholder="cm" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={domForm.control} name="heightCm" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Height</FormLabel><FormControl><Input {...field} type="number" placeholder="cm" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      {volumetricWeight > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                          <p>Volumetric weight: <span className="font-medium">{volumetricWeight} kg</span> ({watchedLength}×{watchedWidth}×{watchedHeight} ÷ 5000)</p>
                          {chargeableWeight > (Number(watchedWeight) || 0) && (
                            <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Warning className="h-3 w-3" weight="fill" />
                              Volumetric weight exceeds actual weight — courier will charge for <span className="font-semibold">{chargeableWeight} kg</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-5" disabled={isDomesticLoading}>
                      {isDomesticLoading ? <><CircleNotch className="h-4 w-4 animate-spin" /> Fetching Rates...</> : <>Calculate Rates <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════ STEP 2: Rate Results ═══════════════ */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Account savings banner */}
            <div className="rounded-xl border border-candlestick-green/30 bg-candlestick-green/5 p-4">
              <p className="text-sm">
                💡 <span className="font-medium">Account holders pay up to 52% less</span> on these same routes.{' '}
                <button onClick={() => router.push('/open-account')} className="text-coke-red hover:underline font-semibold">Open a free account →</button>
              </p>
            </div>

            <h2 className="font-semibold text-lg">Available Rates</h2>
            <p className="text-sm text-muted-foreground">Select a courier to proceed with booking. Prices include GST.</p>

            {isInternational ? (
              guestCouriers.length === 0 ? (
                /* ── Animated no-service for international ── */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="bg-card rounded-2xl border border-border p-8 text-center space-y-4"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto"
                  >
                    <AirplaneTilt className="h-8 w-8 text-amber-500" weight="duotone" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3 className="font-semibold text-lg">No Service Available</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                      No courier options available for this route. Try a different destination or weight.
                    </p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Try Different Route
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/contact')}>
                      Contact Support
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {guestCouriers.map((option, idx) => {
                    const accountPrice = accountCouriers[idx]?.price ?? option.price;
                    const savings = option.price - accountPrice;
                    const isComingSoon = false; // All returned carriers are active
                    const rateBreakdown = rateFormData ? calculateRate({
                      destinationCountryCode: (rateFormData as InternationalRateValues).destinationCountry,
                      shipmentType: (rateFormData as InternationalRateValues).shipmentType,
                      weightGrams: (rateFormData as InternationalRateValues).weightGrams,
                      dimensions: { length: (rateFormData as InternationalRateValues).lengthCm, width: (rateFormData as InternationalRateValues).widthCm, height: (rateFormData as InternationalRateValues).heightCm },
                      declaredValue: (rateFormData as InternationalRateValues).declaredValue,
                    }, true) : null;

                    return (
                      <div key={option.carrier} className={`bg-card rounded-xl border border-border overflow-hidden transition-colors ${isComingSoon ? 'opacity-60' : 'hover:border-coke-red/30'}`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base">{option.carrier}</h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{option.serviceName}</span>
                                {option.isRecommended && !isComingSoon && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-candlestick-green/10 text-candlestick-green font-medium">Best Value</span>
                                )}
                                {isComingSoon && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 font-medium">Available Soon</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{option.transitDays.min}–{option.transitDays.max} days delivery</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {option.features.slice(0, 3).map(f => (
                                  <span key={f} className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">{f}</span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-2xl font-bold">₹{option.price.toLocaleString('en-IN')}</p>
                              {savings > 0 && !isComingSoon && (
                                <p className="text-xs text-candlestick-green mt-0.5">
                                  With account: <span className="font-semibold">₹{accountPrice.toLocaleString('en-IN')}</span>
                                </p>
                              )}
                              {isComingSoon ? (
                                <Button size="sm" variant="outline" className="mt-2 opacity-50" disabled>
                                  Available Soon
                                </Button>
                              ) : (
                                <Button size="sm" className="mt-2 bg-coke-red hover:bg-red-600 text-white" onClick={() => handleSelectCourier(option)}>
                                  Book Now
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Rate breakdown (show for first/recommended) */}
                        {rateBreakdown && idx === 0 && (
                          <div className="border-t border-border bg-muted/30 px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Rate Breakdown</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {rateBreakdown.breakdown.map(item => (
                                <div key={item.label} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="font-medium">₹{item.amount.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-border">
                              <span>Total</span>
                              <span>₹{rateBreakdown.total.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ── Domestic rate results ── */
              (() => {
                // For documents: show only air services, fallback to Delhivery Surface
                const isDocType = rateFormData && 'shipmentType' in rateFormData && rateFormData.shipmentType === 'document';
                let filteredDomestic = domesticCouriers;
                if (isDocType) {
                  const airOnly = domesticCouriers.filter((c: any) => c.mode === 'air');
                  if (airOnly.length > 0) {
                    filteredDomestic = airOnly;
                  } else {
                    // Fallback: Delhivery Surface
                    const delhiverySurface = domesticCouriers.filter((c: any) =>
                      c.courier_name?.toLowerCase().includes('delhivery') && c.mode === 'surface'
                    );
                    filteredDomestic = delhiverySurface;
                  }
                }

                return filteredDomestic.length === 0 ? (
                  /* ── Animated no-service component ── */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="bg-card rounded-2xl border border-border p-8 text-center space-y-4"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto"
                    >
                      <AirplaneTilt className="h-8 w-8 text-amber-500" weight="duotone" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="font-semibold text-lg">No Service Available</h3>
                      <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                        {isDocType
                          ? 'No air courier services are available for document shipments on this route right now.'
                          : 'No couriers available for this route.'}
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col sm:flex-row gap-2 justify-center pt-2"
                    >
                      <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Try Different Route
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push('/contact')}>
                        Contact Support
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {isDocType && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                        <AirplaneTilt className="h-4 w-4 shrink-0" weight="fill" />
                        <span>Showing air service rates for document shipments</span>
                      </div>
                    )}
                    {filteredDomestic.map((c: any) => (
                    <div key={c.courier_company_id} className="bg-card rounded-xl border border-border p-4 hover:border-coke-red/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{c.courier_name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{c.mode}</span>
                            {c.is_recommended && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-candlestick-green/10 text-candlestick-green font-medium">Cheapest</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{c.estimated_delivery_days} days delivery</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-bold">₹{c.customer_price?.toLocaleString('en-IN')}</p>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Base: ₹{c.shipping_charge?.toLocaleString('en-IN')} + GST: ₹{c.gst_amount?.toLocaleString('en-IN')}
                          </div>
                          <Button size="sm" className="mt-2 bg-coke-red hover:bg-red-600 text-white" onClick={() => handleSelectCourier(c)}>
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()
            )}
          </motion.div>
        )}

        {/* ═══════════════ STEP 3: Sender & Receiver Details (4-Step Slider) ═══════════════ */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {/* Selected courier summary */}
            {selectedCourier && (
              <div className="bg-muted/50 rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Courier</p>
                  <p className="font-semibold">{(selectedCourier as any).carrier || (selectedCourier as any).courier_name}</p>
                </div>
                <p className="text-xl font-bold">₹{((selectedCourier as any).price || (selectedCourier as any).customer_price)?.toLocaleString('en-IN')}</p>
              </div>
            )}

            {/* Sub-step indicator — 4 steps */}
            <div className="flex items-center gap-2">
              {(['pickup', 'sender', 'receiver', 'content'] as const).map((s, i) => {
                const stepOrder = ['pickup', 'sender', 'receiver', 'content'];
                const currentIdx = stepOrder.indexOf(addressSubStep);
                const labels = ['Pickup Details', 'Sender / KYC', 'Receiver', 'Contents'];
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      s === addressSubStep ? 'bg-coke-red text-white' :
                      currentIdx > i ? 'bg-candlestick-green text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {currentIdx > i ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline ${s === addressSubStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {labels[i]}
                    </span>
                    {i < 3 && <div className="flex-1 h-px bg-border" />}
                  </div>
                );
              })}
            </div>

            <Form {...detailsForm}>
              <form onSubmit={detailsForm.handleSubmit(handleFinalSubmit)}>
                {/* Slider container */}
                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">
                    {/* ── Step 1: Pickup Address ── */}
                    {addressSubStep === 'pickup' && (
                      <motion.div key="pickup" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                            <House className="h-5 w-5 text-orange-600" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Indian Pickup Address</h3>
                            <p className="text-xs text-muted-foreground">Where should we collect the shipment from?</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="senderName" render={({ field }) => (
                              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} placeholder="Sender name" className="h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="senderPhone" render={({ field }) => (
                              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="+91 98765 43210" className="h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                          <FormField control={detailsForm.control} name="senderAddress" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Address (House/Flat No, Street, Locality)</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. 42, MG Road, Lajpat Nagar" className="h-11" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={detailsForm.control} name="senderPincode" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pincode</FormLabel>
                              <FormControl><Input {...field} placeholder="110001" maxLength={6} readOnly={!isInternational && !!domesticPickupPincode} className={`h-11 ${!isInternational && domesticPickupPincode ? 'bg-muted' : ''}`} /></FormControl>
                              {senderLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                              {senderLookup.error && <p className="text-xs text-destructive">{senderLookup.error}</p>}
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="senderCity" render={({ field }) => (
                              <FormItem>
                                <FormLabel>City / District</FormLabel>
                                {senderLookup.areas.length > 0 ? (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {senderLookup.district && <SelectItem value={senderLookup.district}>{senderLookup.district} (District)</SelectItem>}
                                      {senderLookup.areas.filter(a => a !== senderLookup.district).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <FormControl><Input {...field} placeholder="City" className="h-11" /></FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="senderState" render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                {senderLookup.state ? (
                                  <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted text-sm font-medium">{senderLookup.state}</div>
                                ) : (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                                    <SelectContent>{INDIAN_STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                                  </Select>
                                )}
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          {senderLookup.state && senderLookup.district && (
                            <p className="text-xs text-candlestick-green flex items-center gap-1">📍 {senderLookup.district}, {senderLookup.state}</p>
                          )}
                        </div>
                        <Button type="button" onClick={handlePickupNext} className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-5">
                          Next: Sender Details <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}

                    {/* ── Step 2: Sender Details + Aadhaar (for medicine) ── */}
                    {addressSubStep === 'sender' && (
                      <motion.div key="sender" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-coke-red/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-coke-red" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Sender Details</h3>
                            <p className="text-xs text-muted-foreground">{requiresAadhaarKyc ? 'Name and details as per Aadhaar card' : 'Your contact information'}</p>
                          </div>
                        </div>
                        {isMedicineFlow && (
                          <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/20 p-3 text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2">
                            <IdentificationCard className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>Sender name must match your Aadhaar card exactly. This is required for medicine customs clearance under CSB-IV.</span>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="senderName" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isMedicineFlow ? 'Full Name (as per Aadhaar)' : 'Full Name'}</FormLabel>
                                <FormControl><Input {...field} placeholder={isMedicineFlow ? 'Name exactly as on Aadhaar' : 'Sender name'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="senderPhone" render={({ field }) => (
                              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="+91 98765 43210" className="h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                          <FormField control={detailsForm.control} name="senderEmail" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="sender@email.com"
                                    className={`h-11 flex-1 ${emailOtpState === 'verified' ? 'border-candlestick-green bg-candlestick-green/5' : ''}`}
                                    readOnly={emailOtpState === 'verified'}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // Reset verification if email changes
                                      if (emailOtpState !== 'idle') {
                                        setEmailOtpState('idle');
                                        setEmailOtpCode(['', '', '', '', '', '']);
                                        setEmailOtpToken('');
                                        setEmailOtpError('');
                                      }
                                    }}
                                  />
                                </FormControl>
                                {isInternational && emailOtpState === 'verified' ? (
                                  <div className="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-candlestick-green/10 border border-candlestick-green/30 text-candlestick-green shrink-0">
                                    <ShieldCheck className="h-4 w-4" weight="fill" />
                                    <span className="text-xs font-semibold">Verified</span>
                                  </div>
                                ) : isInternational && emailOtpState !== 'sent' && emailOtpState !== 'verifying' ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSendEmailOtp}
                                    disabled={emailOtpState === 'sending' || !field.value}
                                    className="shrink-0 h-11 gap-1.5 border-coke-red/30 text-coke-red hover:bg-coke-red/5 hover:text-coke-red"
                                  >
                                    {emailOtpState === 'sending' ? (
                                      <><CircleNotch className="h-4 w-4 animate-spin" /> Sending...</>
                                    ) : (
                                      <><EnvelopeSimple className="h-4 w-4" weight="duotone" /> Verify Email</>
                                    )}
                                  </Button>
                                ) : null}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />

                          {/* ── Email OTP Input Section ── */}
                          {isInternational && (emailOtpState === 'sent' || emailOtpState === 'verifying') && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-xl border border-coke-red/20 bg-gradient-to-b from-coke-red/[0.03] to-transparent p-5 space-y-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-coke-red/10 flex items-center justify-center">
                                    <EnvelopeSimple className="h-4 w-4 text-coke-red" weight="fill" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">Enter verification code</p>
                                    <p className="text-[11px] text-muted-foreground">We sent a 6-digit code to <span className="font-medium text-foreground">{detailsForm.getValues('senderEmail')}</span></p>
                                  </div>
                                </div>

                                {/* OTP Input Boxes */}
                                <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                                  {emailOtpCode.map((digit, i) => (
                                    <input
                                      key={i}
                                      ref={(el) => { otpInputRefs.current[i] = el; }}
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={1}
                                      value={digit}
                                      onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                      disabled={emailOtpState === 'verifying' || emailOtpAttempts >= 5}
                                      className={`w-11 h-12 text-center text-lg font-bold rounded-lg border-2 bg-background outline-none transition-all duration-200
                                        ${digit ? 'border-coke-red/50 text-foreground' : 'border-border text-muted-foreground'}
                                        ${emailOtpState === 'verifying' ? 'opacity-50' : ''}
                                        focus:border-coke-red focus:ring-2 focus:ring-coke-red/20`}
                                      aria-label={`Digit ${i + 1}`}
                                    />
                                  ))}
                                </div>

                                {/* Verifying spinner */}
                                {emailOtpState === 'verifying' && (
                                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <CircleNotch className="h-4 w-4 animate-spin text-coke-red" />
                                    <span>Verifying...</span>
                                  </div>
                                )}

                                {/* Error message */}
                                {emailOtpError && (
                                  <div className="flex items-center justify-center gap-1.5 text-xs text-destructive">
                                    <Warning className="h-3.5 w-3.5" weight="fill" />
                                    <span>{emailOtpError}</span>
                                  </div>
                                )}

                                {/* Resend link */}
                                <div className="flex items-center justify-center">
                                  {emailOtpCooldown > 0 ? (
                                    <p className="text-xs text-muted-foreground">Resend code in <span className="font-semibold text-foreground">{emailOtpCooldown}s</span></p>
                                  ) : (
                                    <button type="button" onClick={handleSendEmailOtp} className="text-xs text-coke-red hover:text-coke-red/80 font-medium transition-colors">
                                      Didn't receive it? Resend code
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Verified success banner */}
                          {isInternational && emailOtpState === 'verified' && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-lg bg-candlestick-green/10 border border-candlestick-green/30 px-4 py-2.5 flex items-center gap-2.5">
                                <ShieldCheck className="h-5 w-5 text-candlestick-green" weight="fill" />
                                <span className="text-sm font-medium text-candlestick-green">Email verified successfully</span>
                              </div>
                            </motion.div>
                          )}

                          {/* Aadhaar KYC Upload — for all international flows */}
                          {requiresAadhaarKyc && (
                            <AadhaarKycUpload
                              aadhaarFront={aadhaarFront}
                              aadhaarBack={aadhaarBack}
                              onFrontChange={setAadhaarFront}
                              onBackChange={setAadhaarBack}
                              ocrResult={ocrResult}
                              isProcessing={ocrProcessing}
                              ocrError={ocrError}
                              onProcess={handleAadhaarProcess}
                              isUnderAge={isUnderAge}
                            />
                          )}

                          {/* Aadhaar-extracted sender address fields */}
                          {requiresAadhaarKyc && (
                            <div className="space-y-3 pt-1">
                              <p className="text-xs font-medium text-muted-foreground">Sender Address (as per Aadhaar)</p>
                              <FormField control={detailsForm.control} name="senderAddress" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Address</FormLabel>
                                  <FormControl><Input {...field} placeholder="Auto-filled from Aadhaar or enter manually" className="h-11" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-3 gap-3">
                                <FormField control={detailsForm.control} name="senderCity" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl><Input {...field} placeholder="City" className="h-11" /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={detailsForm.control} name="senderState" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="State" /></SelectTrigger></FormControl>
                                      <SelectContent>{INDIAN_STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={detailsForm.control} name="senderPincode" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Pincode</FormLabel>
                                    <FormControl><Input {...field} placeholder="110001" maxLength={6} className="h-11" /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                              </div>
                            </div>
                          )}

                          {/* One-click rectify: sync sender fields with Aadhaar data */}
                          {requiresAadhaarKyc && ocrResult && !isUnderAge && (
                            <div className="flex justify-end">
                              <Button type="button" variant="outline" size="sm" onClick={handleRectifyFromAadhaar} className="gap-1.5 text-xs">
                                <IdentificationCard className="h-3.5 w-3.5" weight="duotone" />
                                Sync with Aadhaar
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setAddressSubStep('pickup')} className="flex-1 gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Pickup
                          </Button>
                          <Button type="button" onClick={handleSenderNext} disabled={isUnderAge} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-2">
                            Next: Receiver <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 3: Receiver Details + Passport (for medicine) ── */}
                    {addressSubStep === 'receiver' && (
                      <motion.div key="receiver" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-blue-600" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Receiver Details</h3>
                            <p className="text-xs text-muted-foreground">{isInternational ? 'Delivery address abroad' : 'Delivery address in India'}</p>
                          </div>
                        </div>
                        {isMedicineFlow && (
                          <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                            <IdentificationBadge className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>Receiver name must match their passport exactly. Address should follow the destination country format.</span>
                          </div>
                        )}
                        {isInternational && destinationCountryInfo && (
                          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                            <span>Address format for {destinationCountryInfo.name}: {getAddressGuidance()}</span>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={detailsForm.control} name="receiverName" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isMedicineFlow ? 'Full Name (as per Passport)' : 'Full Name'}</FormLabel>
                                <FormControl><Input {...field} placeholder={isMedicineFlow ? 'Name exactly as on passport' : 'Receiver name'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="receiverPhone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone (with country code)</FormLabel>
                                <FormControl><Input {...field} placeholder={destinationCountryInfo?.phoneCode ? `${destinationCountryInfo.phoneCode} ...` : 'Phone number'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={detailsForm.control} name="receiverEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="receiver@email.com" className="h-11" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={detailsForm.control} name="receiverAddress" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Address</FormLabel>
                              <FormControl><Textarea {...field} placeholder={getAddressGuidance()} rows={2} className="resize-none" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className={`grid ${isInternational ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                            <FormField control={detailsForm.control} name="receiverCity" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isInternational ? 'City' : 'City / District'}</FormLabel>
                                {!isInternational && receiverLookup.areas.length > 0 ? (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {receiverLookup.district && <SelectItem value={receiverLookup.district}>{receiverLookup.district} (District)</SelectItem>}
                                      {receiverLookup.areas.filter(a => a !== receiverLookup.district).map(a => (
                                        <SelectItem key={a} value={a}>{a}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <FormControl><Input {...field} placeholder="City" className="h-11" /></FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )} />
                            {isInternational && (
                              <FormField control={detailsForm.control} name="receiverState" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State / Province</FormLabel>
                                  <FormControl><Input {...field} placeholder="State or Province" className="h-11" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            )}
                            <FormField control={detailsForm.control} name="receiverZipcode" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isInternational ? 'Zip / Postal Code' : 'Pincode'}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={isInternational ? 'Zipcode' : '400001'} maxLength={isInternational ? 10 : 6} readOnly={!isInternational && !!domesticDeliveryPincode} className={`h-11 ${!isInternational && domesticDeliveryPincode ? 'bg-muted' : ''}`} />
                                </FormControl>
                                {isInternational && intlZipLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                                {isInternational && intlZipLookup.city && <p className="text-xs text-candlestick-green">📍 {intlZipLookup.city}{intlZipLookup.state ? `, ${intlZipLookup.state}` : ''}</p>}
                                {!isInternational && receiverLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                                {!isInternational && receiverLookup.state && <p className="text-xs text-candlestick-green">{receiverLookup.district}, {receiverLookup.state}</p>}
                                {!isInternational && receiverLookup.error && <p className="text-xs text-destructive">{receiverLookup.error}</p>}
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          {/* Passport Upload - Medicine only */}
                          {isMedicineFlow && (
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-2">
                                <IdentificationBadge className="h-5 w-5 text-blue-600" weight="duotone" />
                                <h4 className="font-semibold text-sm">Receiver Passport Upload</h4>
                              </div>
                              <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs space-y-1">
                                <p className="font-medium text-blue-900 dark:text-blue-200">How to capture a clear passport photo:</p>
                                <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-0.5">
                                  <li>Open passport flat on a well-lit surface</li>
                                  <li>Capture the full page without cutting edges</li>
                                  <li>Name, photo, and passport number must be clearly readable</li>
                                  <li>Address page: capture the page with the current address</li>
                                </ul>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Identity Page (Photo side)</label>
                                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 p-4 cursor-pointer transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPassportIdentity(e.target.files[0]); }} />
                                    {passportIdentity ? (
                                      <div className="text-center"><IdentificationBadge className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" /><p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p><p className="text-xs text-muted-foreground truncate max-w-[120px]">{passportIdentity.name}</p></div>
                                    ) : (
                                      <div className="text-center"><Upload className="h-6 w-6 text-blue-500 mx-auto" weight="duotone" /><p className="text-xs font-medium text-blue-600">Upload Identity</p><p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p></div>
                                    )}
                                  </label>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Address Page</label>
                                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 p-4 cursor-pointer transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPassportAddress(e.target.files[0]); }} />
                                    {passportAddress ? (
                                      <div className="text-center"><IdentificationBadge className="h-8 w-8 text-candlestick-green mx-auto" weight="duotone" /><p className="text-xs font-medium text-candlestick-green mt-1">Uploaded</p><p className="text-xs text-muted-foreground truncate max-w-[120px]">{passportAddress.name}</p></div>
                                    ) : (
                                      <div className="text-center"><Upload className="h-6 w-6 text-blue-500 mx-auto" weight="duotone" /><p className="text-xs font-medium text-blue-600">Upload Address</p><p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p></div>
                                    )}
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setAddressSubStep('sender')} className="flex-1 gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Sender
                          </Button>
                          <Button type="button" onClick={handleReceiverNext} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-2">
                            Next: Contents <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Content Items Slide ── */}
                    {addressSubStep === 'content' && (
                      <motion.div
                        key="content"
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-2xl border border-border p-8 lg:p-10 space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-purple-600" weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">Shipment Contents</h3>
                            <p className="text-xs text-muted-foreground">{isMedicineFlow ? 'Add each medicine for customs declaration' : isDocumentFlow ? 'Document details for customs declaration' : isInternational ? 'Add each item for customs declaration' : 'Describe what you are shipping'}</p>
                          </div>
                        </div>

                        {/* Item list */}
                        <div className="space-y-4">
                          {isDocumentFlow ? (
                            /* ── Document Flow: simplified single-item view ── */
                            <div className="rounded-lg border border-border p-4 space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground">Document</p>
                              <div>
                                <label className="text-xs font-medium">Document Type</label>
                                <Select value={contentItems[0]?.type || ''} onValueChange={(v) => { const dt = DOCUMENT_TYPE_OPTIONS.find(d => d.value === v); const arr = [...contentItems]; arr[0] = { ...arr[0], name: v, type: v, hsnCode: dt?.hsn || DOCUMENT_HSN_CODE, qty: 1, unitPrice: 1 }; setContentItems(arr); }}>
                                  <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Select document type" /></SelectTrigger>
                                  <SelectContent>
                                    {DOCUMENT_TYPE_OPTIONS.map(dt => (
                                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium">Shipment Value</label>
                                  <div className="flex items-center h-10 mt-1 px-3 rounded-md border border-input bg-muted/50 text-sm">
                                    $1
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium">HSN Code</label>
                                  <div className="flex items-center h-10 mt-1 px-3 rounded-md border border-input bg-muted/50 text-sm font-mono">
                                    {contentItems[0]?.hsnCode || DOCUMENT_HSN_CODE}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                          /* ── Medicine / Gift flow: multi-item view with collapsible items ── */
                          contentItems.map((item, idx) => {
                            const isExpanded = expandedItemIndex === idx;
                            const itemTotal = item.qty * item.unitPrice;
                            
                            // Collapsed view for items that aren't being edited
                            if (!isExpanded && item.name.trim()) {
                              return (
                                <div key={idx} className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <CaretRight className="h-4 w-4 text-muted-foreground shrink-0" weight="bold" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.type && `${item.type} · `}Qty: {item.qty}{item.unitPrice > 0 && ` · ₹${itemTotal.toLocaleString('en-IN')}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button type="button" onClick={() => setExpandedItemIndex(idx)} className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors" title="Edit">
                                      <PencilSimple className="h-4 w-4" weight="bold" />
                                    </button>
                                    {contentItems.length > 1 && (
                                      <button type="button" onClick={() => { setContentItems(prev => prev.filter((_, i) => i !== idx)); if (expandedItemIndex >= contentItems.length - 1) setExpandedItemIndex(Math.max(0, contentItems.length - 2)); }} className="text-destructive hover:text-destructive/80 p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Delete">
                                        <Trash className="h-4 w-4" weight="bold" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            
                            // Expanded view (editing form)
                            return (
                            <div key={idx} className="rounded-lg border border-border p-4 space-y-3 relative">
                              <div className="flex items-center justify-between">
                                <button type="button" onClick={() => item.name.trim() ? setExpandedItemIndex(-1) : undefined} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                  <CaretDown className="h-3.5 w-3.5" weight="bold" />
                                  {isMedicineFlow ? `Medicine ${idx + 1}` : `Item ${idx + 1}`}
                                </button>
                                {contentItems.length > 1 && (
                                  <button type="button" onClick={() => { setContentItems(prev => prev.filter((_, i) => i !== idx)); if (expandedItemIndex >= contentItems.length - 1) setExpandedItemIndex(Math.max(0, contentItems.length - 2)); }} className="text-destructive hover:text-destructive/80 p-1">
                                    <Trash className="h-4 w-4" weight="bold" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium">{isMedicineFlow ? 'Medicine Name' : 'Item Name'}</label>
                                  {isMedicineFlow ? (
                                    <div className="mt-1">
                                      <MedicineNameSearch
                                        value={item.name}
                                        onChange={(name) => { const arr = [...contentItems]; arr[idx].name = name; setContentItems(arr); }}
                                        onSelect={(suggestion) => {
                                          const arr = [...contentItems];
                                          arr[idx].name = suggestion.name;
                                          if (suggestion.form) arr[idx].type = suggestion.form;
                                          arr[idx].hsnCode = suggestion.hsnCode;
                                          setContentItems(arr);
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <Input value={item.name} onChange={(e) => { const arr = [...contentItems]; arr[idx].name = e.target.value; setContentItems(arr); }} placeholder="e.g. Cotton T-Shirt" className="h-10 mt-1" />
                                  )}
                                </div>
                                <div>
                                  <label className="text-xs font-medium">{isMedicineFlow ? 'Medicine Type' : 'Type of Item'}</label>
                                  {isMedicineFlow ? (
                                    <Select value={item.type} onValueChange={(v) => { const arr = [...contentItems]; arr[idx].type = v; setContentItems(arr); }}>
                                      <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="tablet">Tablet</SelectItem>
                                        <SelectItem value="capsule">Capsule</SelectItem>
                                        <SelectItem value="powder">Powder</SelectItem>
                                        <SelectItem value="liquid">Liquid</SelectItem>
                                        <SelectItem value="semi-liquid">Semi-Liquid / Gel</SelectItem>
                                        <SelectItem value="cream">Cream / Ointment</SelectItem>
                                        <SelectItem value="injection">Injection / Vial</SelectItem>
                                        <SelectItem value="inhaler">Inhaler</SelectItem>
                                        <SelectItem value="drops">Drops (Eye/Ear/Nasal)</SelectItem>
                                        <SelectItem value="syrup">Syrup</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Select value={item.type} onValueChange={(v) => { const arr = [...contentItems]; arr[idx].type = v; arr[idx].hsnCode = ''; setContentItems(arr); }}>
                                      <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="clothing">Clothing & Apparel</SelectItem>
                                        <SelectItem value="electronics">Electronics</SelectItem>
                                        <SelectItem value="food">Branded Packaged Food</SelectItem>
                                        <SelectItem value="cosmetics">Cosmetics & Personal Care</SelectItem>
                                        <SelectItem value="handicraft">Handicraft & Art</SelectItem>
                                        <SelectItem value="books">Books & Stationery</SelectItem>
                                        <SelectItem value="toys">Toys & Games</SelectItem>
                                        <SelectItem value="jewelry">Imitation Jewelry</SelectItem>
                                        <SelectItem value="household">Household Items</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                              {/* Conditional Subtype dropdown — appears when a type is selected */}
                              {!isMedicineFlow && item.type && GIFT_ITEM_SUBTYPES[item.type] && (
                                <div>
                                  <label className="text-xs font-medium">Sub Type</label>
                                  <Select value={GIFT_ITEM_SUBTYPES[item.type]?.find(s => s.hsn === item.hsnCode)?.value || ''} onValueChange={(v) => { const sub = GIFT_ITEM_SUBTYPES[item.type]?.find(s => s.value === v); if (sub) { const arr = [...contentItems]; arr[idx].hsnCode = sub.hsn; setContentItems(arr); } }}>
                                    <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Select sub type" /></SelectTrigger>
                                    <SelectContent>
                                      {GIFT_ITEM_SUBTYPES[item.type].map(sub => (
                                        <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-medium">HSN Code</label>
                                  <div className="relative">
                                    <Input list={`hsn-list-${idx}`} value={item.hsnCode} onChange={(e) => { const arr = [...contentItems]; arr[idx].hsnCode = e.target.value; setContentItems(arr); }} placeholder="Search or type HSN" className="h-10 mt-1" />
                                    <datalist id={`hsn-list-${idx}`}>
                                      {COMMON_HSN_CODES.map(h => (
                                        <option key={h.code} value={h.code}>{h.code} - {h.desc}</option>
                                      ))}
                                    </datalist>
                                  </div>
                                  {item.hsnCode && COMMON_HSN_CODES.find(h => h.code === item.hsnCode) && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{COMMON_HSN_CODES.find(h => h.code === item.hsnCode)?.desc}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Quantity</label>
                                  <Input type="number" min={1} value={item.qty} onChange={(e) => { const arr = [...contentItems]; arr[idx].qty = Number(e.target.value) || 1; setContentItems(arr); }} className="h-10 mt-1" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium">{isMedicineFlow ? 'Price per Unit (₹)' : 'Unit Price (₹)'}</label>
                                  <Input type="number" min={0} value={item.unitPrice || ''} onChange={(e) => { const arr = [...contentItems]; arr[idx].unitPrice = Number(e.target.value) || 0; setContentItems(arr); }} placeholder={isMedicineFlow ? 'MRP per unit' : '500'} className="h-10 mt-1" />
                                </div>
                              </div>
                            </div>
                            );
                          })
                          )}
                        </div>

                        {/* Add item button — hidden for document flow */}
                        {!isDocumentFlow && (() => {
                          const totalValue = contentItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
                          const isOverLimit = totalValue > 25000;
                          return (
                          <Button type="button" variant="outline" onClick={() => {
                            const newIdx = contentItems.length;
                            setContentItems(prev => [...prev, { name: '', type: '', hsnCode: '', qty: 1, unitPrice: 0 }]);
                            setExpandedItemIndex(newIdx);
                          }} className="w-full gap-2 border-dashed">
                            <Plus className="h-4 w-4" /> {isMedicineFlow ? 'Add Another Medicine' : 'Add Another Item'}
                          </Button>
                          );
                        })()}

                        {/* Total value display with ₹25,000 limit — hidden for document flow */}
                        {!isDocumentFlow && (() => {
                          const totalValue = contentItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
                          const isOverLimit = totalValue > 25000;
                          return (
                          <div className="space-y-2">
                            <div className={`flex justify-between items-center text-sm rounded-lg px-4 py-2.5 ${isOverLimit ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
                              <span className={isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>Total Declared Value</span>
                              <span className={`font-semibold ${isOverLimit ? 'text-destructive' : ''}`}>₹{totalValue.toLocaleString('en-IN')}</span>
                            </div>
                            {isOverLimit && (
                              <div className="flex items-start gap-2 text-xs text-destructive px-1">
                                <Warning className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                                <span>Total declared value cannot exceed ₹25,000 for guest international shipments. Please reduce item quantities or prices.</span>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground text-right px-1">Maximum allowed: ₹25,000</p>
                          </div>
                          );
                        })()}

                        {/* Medicine Documents — Separate Sections */}
                        {isMedicineFlow && (
                          <div className="space-y-5 pt-1">
                            {/* ── Section 1: Doctor Prescription ── */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Pill className="h-5 w-5 text-blue-600" weight="duotone" />
                                <h4 className="font-semibold text-sm">Doctor's Prescription</h4>
                              </div>
                              <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs space-y-1">
                                <p className="font-medium text-blue-900 dark:text-blue-200">What to upload:</p>
                                <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-0.5">
                                  <li>Valid prescription issued by a registered medical practitioner</li>
                                  <li>Must include doctor's name, registration number, and signature</li>
                                  <li>Patient (receiver) name must be clearly mentioned</li>
                                  <li>Medicine names, dosage, and duration should be legible</li>
                                </ul>
                              </div>
                              {prescriptionDocs.length > 0 && (
                                <div className="space-y-2">
                                  {prescriptionDocs.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-blue-600 shrink-0" weight="duotone" />
                                        <span className="text-xs truncate">{file.name}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                                      </div>
                                      <button type="button" onClick={() => setPrescriptionDocs(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80 p-1 shrink-0">
                                        <X className="h-3.5 w-3.5" weight="bold" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-400/30 bg-blue-50/50 hover:bg-blue-100/50 p-3.5 cursor-pointer transition-colors">
                                <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) setPrescriptionDocs(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                                <Upload className="h-4 w-4 text-blue-600" weight="duotone" />
                                <span className="text-sm font-medium text-blue-600">Upload Prescription</span>
                                <span className="text-xs text-muted-foreground">(PDF, JPG, PNG)</span>
                              </label>
                            </div>

                            {/* ── Section 2: Pharmacy Purchase Bill ── */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-coke-red" weight="duotone" />
                                <h4 className="font-semibold text-sm">Pharmacy Purchase Bill</h4>
                              </div>
                              <div className="rounded-lg border border-coke-red/20 bg-coke-red/5 p-3 text-xs space-y-1">
                                <p className="font-medium text-coke-red/90">What to upload:</p>
                                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                  <li>Original purchase bill or invoice from the pharmacy</li>
                                  <li>Patient (buyer) name must be on the bill</li>
                                  <li>Must show pharmacy name, GST number, and address</li>
                                  <li>Each medicine name, batch number, quantity, and price should be listed</li>
                                  <li>Bill date must be recent (within 30 days of shipment)</li>
                                </ul>
                              </div>
                              {pharmacyBillDocs.length > 0 && (
                                <div className="space-y-2">
                                  {pharmacyBillDocs.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between rounded-lg border border-coke-red/20 bg-coke-red/5 px-3 py-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-coke-red shrink-0" weight="duotone" />
                                        <span className="text-xs truncate">{file.name}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                                      </div>
                                      <button type="button" onClick={() => setPharmacyBillDocs(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80 p-1 shrink-0">
                                        <X className="h-3.5 w-3.5" weight="bold" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-coke-red/30 bg-coke-red/5 hover:bg-coke-red/10 p-3.5 cursor-pointer transition-colors">
                                <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) setPharmacyBillDocs(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                                <Upload className="h-4 w-4 text-coke-red" weight="duotone" />
                                <span className="text-sm font-medium text-coke-red">Upload Pharmacy Bill</span>
                                <span className="text-xs text-muted-foreground">(PDF, JPG, PNG)</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Hidden field — auto-populated */}
                        <FormField control={detailsForm.control} name="contentDescription" render={({ field }) => (
                          <input type="hidden" {...field} />
                        )} />

                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setAddressSubStep('receiver')} className="flex-1 gap-1.5">
                            <ArrowLeft className="h-4 w-4" /> Receiver
                          </Button>
                          <Button type="button" onClick={() => {
                            if (isDocumentFlow) {
                              const docType = contentItems[0]?.type;
                              if (!docType) { return; }
                              const desc = `${docType} (documents) x1 @ $1 [HSN: ${DOCUMENT_HSN_CODE}]`;
                              detailsForm.setValue('contentDescription', desc);
                              detailsForm.handleSubmit(handleFinalSubmit)();
                              return;
                            }
                            const hasItems = contentItems.some(i => i.name.trim());
                            if (!hasItems) { return; }
                            const totalValue = contentItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
                            if (totalValue > 25000) {
                              toast({ title: 'Value limit exceeded', description: 'Total declared value cannot exceed ₹25,000 for guest international shipments.', variant: 'destructive' });
                              return;
                            }
                            const desc = contentItems.filter(i => i.name.trim()).map(i => `${i.name} (${i.type || 'other'}) x${i.qty} @ ₹${i.unitPrice} [HSN: ${i.hsnCode || 'N/A'}]`).join('; ');
                            detailsForm.setValue('contentDescription', desc);
                            detailsForm.handleSubmit(handleFinalSubmit)();
                          }} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-2">
                            Continue to Summary <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </Form>
          </motion.div>
        )}

        {/* ═══════════════ STEP 4: Summary & Pay ═══════════════ */}
        {step === 4 && senderReceiverData && (
          <GuestSummaryStep
            mode={mode}
            rateFormData={rateFormData}
            selectedCourier={selectedCourier}
            senderReceiver={senderReceiverData}
            onBack={() => setStep(3)}
            extractedAadhaarNumber={extractedAadhaarNumber}
          />
        )}
      </main>

      {/* ═══════════════ Weight Limit Modal ═══════════════ */}
      <AnimatePresence>
        {showWeightLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowWeightLimitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                    <Warning className="h-5 w-5 text-amber-600" weight="duotone" />
                  </div>
                  <h3 className="font-semibold text-lg">Weight Limit Reached</h3>
                </div>
                <button onClick={() => setShowWeightLimitModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Guest bookings are limited to 10 kg. To ship heavier packages, open a free account and enjoy up to 52% lower rates.
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowWeightLimitModal(false)} className="flex-1">
                  Go Back
                </Button>
                <Button onClick={() => router.push('/open-account')} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5">
                  <UserPlus className="h-4 w-4" /> Open Account
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
