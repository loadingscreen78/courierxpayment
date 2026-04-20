"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CircleNotch, UserPlus, Pill, FileText, Gift, Truck, Globe, User, Envelope, Phone, MapPin, Info, AirplaneTilt, Warning, X, IdentificationCard, Upload, IdentificationBadge, House, Plus, Trash, MagnifyingGlass, CaretUpDown, Check, PencilSimple, CaretDown, CaretRight, ShieldCheck, EnvelopeSimple, Camera, Package } from '@phosphor-icons/react';
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
import AddressAutocomplete from '@/components/guest-booking/AddressAutocomplete';
import { usePincodeLookup } from '@/hooks/usePincodeLookup';
import { DomesticCourierGrid } from '@/components/domestic/DomesticCourierGrid';
import { DimensionAssistant } from '@/components/domestic/DimensionAssistant';
import { PincodeFinder } from '@/components/domestic/PincodeFinder';
import { useAadhaarOcr } from '@/hooks/useAadhaarOcr';
import { INDIAN_STATES } from '@/lib/pincode-lookup';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackPresets } from '@/lib/haptics';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { CameraCapture, type CameraDocumentType } from '@/components/ui/CameraCapture';
import { cn } from '@/lib/utils';

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
  weightKg: z.coerce.number().min(0.05, 'Min 50g').max(10, 'Max 10 kg for guest booking'),
  lengthCm: z.coerce.number().min(1, 'Required').max(150).optional(),
  widthCm: z.coerce.number().min(1, 'Required').max(150).optional(),
  heightCm: z.coerce.number().min(1, 'Required').max(150).optional(),
  declaredValue: z.coerce.number().min(0).max(49000).optional().default(0),
  prohibitedItemsConfirmed: z.boolean().refine(val => val === true, { message: 'You must confirm your package does not contain prohibited items' }),
}).superRefine((data, ctx) => {
  if (data.shipmentType === 'document') {
    if (data.weightKg > 2.5) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documents max 2.5 kg', path: ['weightKg'] });
  }
  if (data.shipmentType === 'gift') {
    if (!data.lengthCm) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['lengthCm'] });
    if (!data.widthCm) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['widthCm'] });
    if (!data.heightCm) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['heightCm'] });
    if (data.weightKg > 10) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Guest booking max 10 kg. Open an account for heavier shipments.', path: ['weightKg'] });
    if (data.declaredValue > 49000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Max declared value ₹49,000', path: ['declaredValue'] });
  }
});

const senderReceiverSchema = z.object({
  senderName: z.string().min(2, 'Required'),
  senderPhone: z.string().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Valid Indian phone required'),
  senderEmail: z.string().email('Valid email required').or(z.literal('')),
  senderAddress: z.string().min(5, 'Required'),
  senderCity: z.string().min(2, 'Required'),
  senderState: z.string().min(2, 'Required'),
  senderPincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit pincode'),
  receiverName: z.string().min(2, 'Required'),
  receiverPhone: z.string().min(5, 'Required'),
  receiverEmail: z.string().email('Valid email required').or(z.literal('')),
  receiverAddress: z.string().min(5, 'Required'),
  receiverCity: z.string().min(2, 'Required'),
  receiverState: z.string().min(1, 'Required').or(z.literal('')),
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
  const searchParams = useSearchParams();
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
  const [courierFilterTab, setCourierFilterTab] = useState<'express' | 'economy' | 'saver'>('express');
  const [showReceiverPinFinder, setShowReceiverPinFinder] = useState(false);
  const [isDomesticLoading, setIsDomesticLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderReceiverData, setSenderReceiverData] = useState<any>(null);
  const [addressSubStep, setAddressSubStep] = useState<'pickup' | 'sender' | 'receiver' | 'content'>('pickup');
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [passportIdentity, setPassportIdentity] = useState<File | null>(null);
  const [passportAddress, setPassportAddress] = useState<File | null>(null);
  const [isMobilePBF, setIsMobilePBF] = useState(false);
  const [passportCameraOpen, setPassportCameraOpen] = useState<'identity' | 'address' | null>(null);
  const [contentItems, setContentItems] = useState<Array<{ name: string; type: string; hsnCode: string; qty: number; unitPrice: number }>>([
    { name: '', type: '', hsnCode: '', qty: 1, unitPrice: 0 },
  ]);
  const [expandedItemIndex, setExpandedItemIndex] = useState<number>(0);
  const [prescriptionDocs, setPrescriptionDocs] = useState<File[]>([]);
  const [pharmacyBillDocs, setPharmacyBillDocs] = useState<File[]>([]);
  const [controlledDrugsConfirmed, setControlledDrugsConfirmed] = useState(false);
  const [intlZipLookup, setIntlZipLookup] = useState<{ loading: boolean; city: string; state: string; error: string }>({ loading: false, city: '', state: '', error: '' });
  const [showWeightLimitModal, setShowWeightLimitModal] = useState(false);
  // ── Separate pickup phone (auto-populated from shipper phone, editable) ──
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupPhoneManuallyEdited, setPickupPhoneManuallyEdited] = useState(false);

  // ── Aadhaar OCR state ──
  const { ocrResult, isProcessing: ocrProcessing, ocrError, processAadhaar, clearOcr } = useAadhaarOcr();
  const [extractedAadhaarNumber, setExtractedAadhaarNumber] = useState('');

  // ── Detect mobile ──
  useEffect(() => {
    setIsMobilePBF(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
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
    defaultValues: { shipmentType: undefined, destinationCountry: '', weightGrams: undefined as any, lengthCm: undefined as any, widthCm: undefined as any, heightCm: undefined as any, declaredValue: undefined as any, prohibitedItemsConfirmed: false },
  });

  // ── Domestic rate form ──
  const domForm = useForm<DomesticRateValues>({
    resolver: zodResolver(domesticRateSchema),
    defaultValues: { shipmentType: undefined, pickupPincode: '', deliveryPincode: '', weightKg: undefined as any, lengthCm: undefined as any, widthCm: undefined as any, heightCm: undefined as any, declaredValue: 0, prohibitedItemsConfirmed: false },
  });
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

      if (isInternational && data.mode === 'international') {
        if (data.destinationCountry) intlForm.setValue('destinationCountry', data.destinationCountry);
        if (data.shipmentType) intlForm.setValue('shipmentType', data.shipmentType);
        if (data.weightGrams) intlForm.setValue('weightGrams', data.weightGrams);
        if (data.lengthCm) intlForm.setValue('lengthCm', data.lengthCm);
        if (data.widthCm) intlForm.setValue('widthCm', data.widthCm);
        if (data.heightCm) intlForm.setValue('heightCm', data.heightCm);
      }

      // Clean up after reading
      localStorage.removeItem('publicRateCalcData');
    } catch { /* ignore parse errors */ }
  }, [isInternational, domForm, intlForm]);

  // ── Pre-fill from URL query params (from landing page CTA) ──
  useEffect(() => {
    if (!searchParams) return;

    if (!isInternational) {
      const pickupPincode = searchParams.get('pickupPincode');
      const deliveryPincode = searchParams.get('deliveryPincode');
      if (pickupPincode) domForm.setValue('pickupPincode', pickupPincode);
      if (deliveryPincode) domForm.setValue('deliveryPincode', deliveryPincode);
    }

    if (isInternational) {
      const country = searchParams.get('country');
      if (country) intlForm.setValue('destinationCountry', country);
    }
  }, [searchParams, isInternational, domForm, intlForm]);

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

  // For international: inherit pickup pincode from URL params (passed from landing page CTA)
  const internationalPickupPincode = isInternational ? (searchParams?.get('pickupPincode') || '') : '';

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
    // For international: auto-fill sender pincode from URL param
    if (step === 3 && isInternational && internationalPickupPincode) {
      const currentSenderPin = detailsForm.getValues('senderPincode');
      if (!currentSenderPin) {
        detailsForm.setValue('senderPincode', internationalPickupPincode);
      }
    }
  }, [step, isInternational, domesticPickupPincode, domesticDeliveryPincode, internationalPickupPincode, detailsForm]);

  // Auto-fill city/state from lookup results
  useEffect(() => {
    if (senderLookup.district) {
      detailsForm.setValue('senderCity', senderLookup.district);
    }
    if (senderLookup.state) {
      detailsForm.setValue('senderState', senderLookup.state);
    }
  }, [senderLookup.district, senderLookup.state, detailsForm]);

  // ── Auto-populate pickup phone from shipper phone (international) ──
  const watchedSenderPhone = detailsForm.watch('senderPhone');
  useEffect(() => {
    if (isInternational && watchedSenderPhone && !pickupPhoneManuallyEdited) {
      setPickupPhone(watchedSenderPhone);
    }
  }, [watchedSenderPhone, isInternational, pickupPhoneManuallyEdited]);

  useEffect(() => {
    if (receiverLookup.district && !isInternational) {
      detailsForm.setValue('receiverCity', receiverLookup.district);
    }
    if (receiverLookup.state && !isInternational) {
      detailsForm.setValue('receiverState', receiverLookup.state);
    }
  }, [receiverLookup.district, receiverLookup.state, isInternational, detailsForm]);

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
    // For documents: use default envelope dimensions and set declared value to ₹100
    const isDoc = values.shipmentType === 'document';
    const lengthCm = values.lengthCm ?? (isDoc ? 30 : 1);
    const widthCm = values.widthCm ?? (isDoc ? 25 : 1);
    const heightCm = values.heightCm ?? (isDoc ? 2 : 1);
    const declaredValue = isDoc ? 100 : (values.declaredValue ?? 0);
    const enrichedValues = { ...values, lengthCm, widthCm, heightCm, declaredValue };
    setRateFormData(enrichedValues);
    try {
      const res = await fetch('/api/domestic/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupPincode: values.pickupPincode,
          deliveryPincode: values.deliveryPincode,
          weightKg: values.weightKg,
          lengthCm,
          widthCm,
          heightCm,
          declaredValue,
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
  // Background processing: extract age (block <18) and 12-digit Aadhaar number
  const handleAadhaarProcess = useCallback(async () => {
    if (!aadhaarFront) return;
    const result = await processAadhaar(aadhaarFront, aadhaarBack);
    if (!result) return;

    // Task 1: Age gate — block if under 18
    if (result.age !== null && result.age < 18) {
      setIsUnderAge(true);
      return;
    }
    setIsUnderAge(false);

    // Task 2: Extract 12-digit Aadhaar number and silently auto-fill summary page
    if (result.aadhaarNumber) {
      const cleaned = result.aadhaarNumber.replace(/\D/g, '');
      if (cleaned.length === 12) {
        setExtractedAadhaarNumber(cleaned);
      }
    }

    // Auto-fill sender fields from OCR (name, address etc. for pickup step)
    const fc = result.fieldConfidence || {};
    if (result.name && (fc.name ?? 80) >= 50) detailsForm.setValue('senderName', result.name);
    if (result.phone && (fc.phone ?? 80) >= 50) detailsForm.setValue('senderPhone', result.phone);
    if (result.address && (fc.address ?? 80) >= 50) detailsForm.setValue('senderAddress', result.address);
    if (result.city && (fc.city ?? 80) >= 50) detailsForm.setValue('senderCity', result.city);
    if (result.state && (fc.state ?? 80) >= 50) detailsForm.setValue('senderState', result.state);
    if (result.pincode && (fc.pincode ?? 80) >= 50) detailsForm.setValue('senderPincode', result.pincode);
  }, [aadhaarFront, aadhaarBack, processAadhaar, detailsForm, isInternational]);

  // ── Validate sender KYC + pickup fields before sliding to receiver ──
  const handlePickupNext = async () => {
    const pickupFields = ['senderName', 'senderPhone', 'senderEmail', 'senderAddress', 'senderCity', 'senderState', 'senderPincode'] as const;
    const fieldsToValidate = isInternational
      ? pickupFields
      : (['senderName', 'senderPhone', 'senderAddress', 'senderCity', 'senderState', 'senderPincode'] as const);
    const result = await detailsForm.trigger(fieldsToValidate);
    if (!result) return;
    // For international: require Aadhaar front AND back
    if (isInternational && requiresAadhaarKyc) {
      if (!aadhaarFront) {
        toast({ title: 'Aadhaar Required', description: 'Please upload the front side of your Aadhaar card.', variant: 'destructive' });
        return;
      }
      if (!aadhaarBack) {
        toast({ title: 'Aadhaar Back Required', description: 'Please upload the back side of your Aadhaar card.', variant: 'destructive' });
        return;
      }
    }
    // For international: require email OTP verification
    if (isInternational && emailOtpState !== 'verified') {
      toast({ title: 'Email not verified', description: 'Please verify your email address before continuing.', variant: 'destructive' });
      return;
    }
    // Block if under 18
    if (isInternational && isUnderAge) {
      toast({ title: 'Age Restriction', description: 'Sender must be 18 years or older to book a shipment.', variant: 'destructive' });
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

  // Countries that don't use postal codes
  const COUNTRIES_WITHOUT_POSTAL_CODES = new Set([
    'AE','QA','KW','BH','OM','YE','JO','IQ','LB','SY','AF','AO','BO','BW','BJ','BF','BI',
    'CM','CF','TD','KM','CG','CD','CI','DJ','GQ','ER','ET','FJ','GA','GM','GH','GN','GW',
    'KE','LS','LR','LY','MG','MW','ML','MR','MZ','NA','NE','NG','RW','ST','SN','SL','SO',
    'SS','SD','SZ','TZ','TG','UG','ZM','ZW','TL','PG','SB','VU','WS','TO','TV','KI','NR',
    'PW','MH','FM','CK','NU','TK','WF','GU','MP','VI','PN','NF','GI','IM','JE','GG','AX',
    'FO','GL','SJ','BM','KY','TC','VG','AI','MS','AG','DM','LC','VC','GD','BB','TT','JM',
    'HT','CU','DO','BS','AW','CW','SX','BQ',
  ]);

  // ── Validate receiver fields before sliding to content ──
  const handleReceiverNext = async () => {
    // For countries without postal codes, auto-set "000" before validation
    if (isInternational && destinationCountryInfo && COUNTRIES_WITHOUT_POSTAL_CODES.has(destinationCountryInfo.code)) {
      const currentZip = detailsForm.getValues('receiverZipcode');
      if (!currentZip || currentZip.trim() === '') {
        detailsForm.setValue('receiverZipcode', '000');
      }
    }
    // For domestic, receiverState is auto-filled from pincode lookup — skip validating it
    const intlFields = ['receiverName', 'receiverPhone', 'receiverEmail', 'receiverAddress', 'receiverCity', 'receiverState', 'receiverZipcode'] as const;
    const domFields = ['receiverName', 'receiverPhone', 'receiverAddress', 'receiverCity', 'receiverZipcode'] as const;
    const result = await detailsForm.trigger(isInternational ? intlFields : domFields);
    if (!result) return;
    // For domestic, auto-set receiverState from pincode lookup if available
    if (!isInternational && receiverLookup.state) {
      detailsForm.setValue('receiverState', receiverLookup.state);
    }
    // For domestic document flow: skip content step, auto-set description and submit
    if (!isInternational && (rateFormData as DomesticRateValues)?.shipmentType === 'document') {
      detailsForm.setValue('contentDescription', 'Documents x1 @ ₹100');
      detailsForm.handleSubmit(handleFinalSubmit)();
      return;
    }
    setAddressSubStep('content');
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
    if (step === 1) router.push('/');
    else setStep(step - 1);
  };

  const stepLabels = ['Shipment Details', 'Select Rate', 'Sender & Receiver', 'Summary & Pay'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header — same as landing page */}
      <LandingHeader />

      <main className="container max-w-3xl lg:max-w-[48vw] py-4 sm:py-8 px-3 sm:px-4 space-y-4 sm:space-y-6 pb-28 md:pb-8">
        {/* Back + Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => { feedbackPresets.tap(); handleBack(); }} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 truncate">
              {isInternational ? <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" weight="duotone" /> : <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 shrink-0" weight="duotone" />}
              {isInternational ? 'International Shipping' : 'Domestic Shipping'}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Guest booking — standard rates apply</p>
          </div>
        </div>

        {/* Progress — desktop only (mobile version is fixed at bottom) */}
        <div className="hidden md:flex gap-1">
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
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="font-semibold text-base sm:text-lg">Enter shipment details to get rates</h2>

              {isInternational ? (
                <Form {...intlForm}>
                  <form onSubmit={intlForm.handleSubmit(handleIntlRateSubmit)} className="space-y-4">
                    {/* Shipment Type */}
                    <FormField control={intlForm.control} name="shipmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you shipping?</FormLabel>
                        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                          {shipmentTypeOptions.international.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { feedbackPresets.select(); field.onChange(opt.value); }}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                field.value === opt.value
                                  ? 'border-coke-red bg-coke-red/5 ring-1 ring-coke-red/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <opt.icon className={`h-5 w-5 mb-1 ${field.value === opt.value ? 'text-coke-red' : 'text-muted-foreground'}`} weight="duotone" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{opt.desc}</p>
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

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-4 min-h-[52px] text-sm sm:text-base" onClick={() => feedbackPresets.tap()}>
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
                              onClick={() => { feedbackPresets.select(); field.onChange(opt.value); }}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                field.value === opt.value
                                  ? 'border-coke-red bg-coke-red/5 ring-1 ring-coke-red/20'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <opt.icon className={`h-5 w-5 mb-1 ${field.value === opt.value ? 'text-coke-red' : 'text-muted-foreground'}`} weight="duotone" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Pincodes with city/state display */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                      <FormField control={domForm.control} name="pickupPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Pincode</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                placeholder="110001"
                                maxLength={6}
                                readOnly={!!rateFormData}
                                className={!!rateFormData ? 'bg-muted text-muted-foreground cursor-not-allowed select-none pointer-events-none' : ''}
                              />
                              {!!rateFormData && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">locked</span>
                              )}
                            </div>
                          </FormControl>
                          {pickupLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                          {pickupLookup.state && <p className="text-xs text-candlestick-green">{pickupLookup.district}, {pickupLookup.state}</p>}
                          {pickupLookup.error && <p className="text-xs text-destructive">{pickupLookup.error}</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={domForm.control} name="deliveryPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Pincode</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                placeholder="400001"
                                maxLength={6}
                                readOnly={!!rateFormData}
                                className={!!rateFormData ? 'bg-muted text-muted-foreground cursor-not-allowed select-none pointer-events-none' : ''}
                              />
                              {!!rateFormData && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">locked</span>
                              )}
                            </div>
                          </FormControl>
                          {deliveryLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                          {deliveryLookup.state && <p className="text-xs text-candlestick-green">{deliveryLookup.district}, {deliveryLookup.state}</p>}
                          {deliveryLookup.error && <p className="text-xs text-destructive">{deliveryLookup.error}</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Weight only — no declared value in step 1 */}
                    <div>
                      <FormField control={domForm.control} name="weightKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          {isDocumentDom ? (
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select weight" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.05">Below 50g</SelectItem>
                                <SelectItem value="0.1">Below 100g</SelectItem>
                                <SelectItem value="0.5">Up to 500g</SelectItem>
                                <SelectItem value="1">Up to 1 kg</SelectItem>
                                <SelectItem value="1.5">Up to 1.5 kg</SelectItem>
                                <SelectItem value="2">Up to 2 kg</SelectItem>
                                <SelectItem value="2.5">Up to 2.5 kg</SelectItem>
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
                                <SelectItem value="3">Up to 3 kg</SelectItem>
                                <SelectItem value="4">Up to 4 kg</SelectItem>
                                <SelectItem value="5">Up to 5 kg</SelectItem>
                                <SelectItem value="6">Up to 6 kg</SelectItem>
                                <SelectItem value="7">Up to 7 kg</SelectItem>
                                <SelectItem value="8">Up to 8 kg</SelectItem>
                                <SelectItem value="9">Up to 9 kg</SelectItem>
                                <SelectItem value="10">Up to 10 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {!isDocumentDom && (
                            <p className="text-[11px] text-muted-foreground mt-1">Guest booking supports up to 10 kg. <button type="button" onClick={() => router.push('/register')} className="text-coke-red hover:underline font-medium">Open an account</button> for heavier shipments.</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Dimensions with measurement instructions — hidden for domestic documents */}
                    {!isDocumentDom && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">Package Dimensions (cm)</p>
                        <DimensionAssistant lengthCm={watchedLength || 0} widthCm={watchedWidth || 0} heightCm={watchedHeight || 0} />
                      </div>
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
                    )}

                    {/* Prohibited Items Confirmation */}
                    <FormField control={domForm.control} name="prohibitedItemsConfirmed" render={({ field }) => (
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

                    <Button type="submit" className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-4 min-h-[52px] text-sm sm:text-base" disabled={isDomesticLoading} onClick={() => feedbackPresets.tap()}>
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
                <span className="font-medium">Account holders get better rates</span> on these same routes.{' '}
                <button onClick={() => router.push('/register')} className="text-coke-red hover:underline font-semibold">Open a free account →</button>
              </p>
            </div>

            <h2 className="font-semibold text-lg">Available Rates</h2>
            <p className="text-sm text-muted-foreground">Select a courier to proceed with booking.</p>

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
                        <div className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm sm:text-base truncate">{option.carrier}</h3>
                                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{option.serviceName}</span>
                                {option.isRecommended && !isComingSoon && (
                                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-candlestick-green/10 text-candlestick-green font-medium shrink-0">Best Value</span>
                                )}
                                {isComingSoon && (
                                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 font-medium shrink-0">Available Soon</span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                {(() => {
                                  const min = option.transitDays.min;
                                  const max = option.transitDays.max;
                                  const d = new Date();
                                  d.setDate(d.getDate() + max);
                                  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                                  return `${min}–${max} days · Est. by ${dateStr}`;
                                })()}
                              </p>
                              <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2">
                                {option.features.slice(0, 3).map(f => (
                                  <span key={f} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">{f}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:block sm:text-right shrink-0">
                              <p className="text-xl sm:text-2xl font-bold">₹{option.price.toLocaleString('en-IN')}</p>
                              {savings > 0 && !isComingSoon && (
                                <p className="text-[10px] sm:text-xs text-candlestick-green mt-0.5">
                                  With account: <span className="font-semibold">₹{accountPrice.toLocaleString('en-IN')}</span>
                                </p>
                              )}
                              {isComingSoon ? (
                                <Button size="sm" variant="outline" className="mt-2 opacity-50" disabled>
                                  Available Soon
                                </Button>
                              ) : (
                                <Button size="sm" className="mt-2 bg-coke-red hover:bg-red-600 text-white min-h-[44px] px-4" onClick={() => { feedbackPresets.select(); handleSelectCourier(option); }}>
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
                    const delhiverySurface = domesticCouriers.filter((c: any) =>
                      c.courier_name?.toLowerCase().includes('delhivery') && c.mode === 'surface'
                    );
                    filteredDomestic = delhiverySurface;
                  }
                }

                // Filter out weight slabs > 10kg (guest booking max)
                filteredDomestic = filteredDomestic.filter((c: any) => {
                  const name = (c.courier_name || '').toUpperCase();
                  // Remove 15kg, 20kg, 25kg, 30kg slabs
                  if (/\b(15|20|25|30)\s*(K\.?G|KG)\b/.test(name)) return false;
                  return true;
                });

                // For gift/parcel: categorize into Express, Economy, Saver
                const allSorted = [...filteredDomestic].sort((a: any, b: any) => a.customer_price - b.customer_price);
                const expressCouriers = filteredDomestic.filter((c: any) => c.mode === 'air');
                const surfaceOnly = filteredDomestic.filter((c: any) => c.mode === 'surface');
                const saverCouriers = allSorted.slice(0, 3); // top 3 cheapest
                const saverIds = new Set(saverCouriers.map((c: any) => c.courier_company_id));
                const economyCouriers = surfaceOnly.filter((c: any) => !saverIds.has(c.courier_company_id)); // surface minus saver

                const currentWeight = rateFormData && 'weightKg' in rateFormData ? (rateFormData as DomesticRateValues).weightKg : 0;

                // Determine which couriers to show based on active tab
                const tabCouriers = isDocType ? filteredDomestic
                  : courierFilterTab === 'express' ? expressCouriers
                  : courierFilterTab === 'economy' ? economyCouriers
                  : saverCouriers;

                const tabDescriptions: Record<string, { icon: typeof AirplaneTilt; label: string; desc: string; color: string; bg: string }> = {
                  express: { icon: AirplaneTilt, label: 'Express', desc: 'Priority air delivery · 1–3 business days · Note: liquid items cannot be transported by air', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                  economy: { icon: Truck, label: 'Economy', desc: 'Standard ground shipping · 4–7 business days', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
                  saver: { icon: Package, label: 'Saver', desc: 'Top 3 cheapest options across all services', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                };

                return filteredDomestic.length === 0 ? (
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
                        {isDocType ? 'No air courier services are available for document shipments on this route.' : 'No couriers available for this route.'}
                      </p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setStep(1)}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Try Different Route</Button>
                      <Button variant="outline" size="sm" onClick={() => router.push('/contact')}>Contact Support</Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {isDocType && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                        <AirplaneTilt className="h-4 w-4 shrink-0" weight="fill" />
                        <span>Showing air service rates for document shipments</span>
                      </div>
                    )}

                    {/* Filter tabs — only for gift/parcel */}
                    {!isDocType && (
                      <div className="flex p-1 bg-muted/50 rounded-xl gap-1">
                        {(['express', 'economy', 'saver'] as const).map(tab => {
                          const info = tabDescriptions[tab];
                          const count = tab === 'express' ? expressCouriers.length : tab === 'economy' ? economyCouriers.length : saverCouriers.length;
                          const TabIcon = info.icon;
                          return (
                            <button
                              key={tab}
                              onClick={() => setCourierFilterTab(tab)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                                courierFilterTab === tab
                                  ? 'bg-coke-red text-white shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                              }`}
                            >
                              <TabIcon className="h-3.5 w-3.5" weight="bold" />
                              {info.label}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                courierFilterTab === tab ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                              }`}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Tab description */}
                    {!isDocType && tabDescriptions[courierFilterTab] && (
                      <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${tabDescriptions[courierFilterTab].bg} ${tabDescriptions[courierFilterTab].color}`}>
                        {(() => { const I = tabDescriptions[courierFilterTab].icon; return <I className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />; })()}
                        <div className="space-y-1">
                          <span>{courierFilterTab === 'express' ? 'Priority air delivery · 1–3 business days' : tabDescriptions[courierFilterTab].desc}</span>
                          {courierFilterTab === 'express' && (
                            <p className="text-blue-700 dark:text-blue-300 opacity-80">
                              Please note: If your shipment contains any liquid items, we kindly request that you choose a surface delivery option instead. Liquids are not permitted on passenger or cargo aircraft as per aviation safety regulations.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Weight slab info */}
                    {!isDocType && currentWeight > 2 && (
                      <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-2.5">
                        <p className="text-xs text-muted-foreground">
                          Rates for <span className="font-semibold text-foreground">{currentWeight} kg</span>.
                          {currentWeight > 2 && <span> Includes 2 kg base slab + additional weight.</span>}
                        </p>
                      </div>
                    )}

                    {tabCouriers.length > 0 ? (
                      <DomesticCourierGrid
                        couriers={tabCouriers}
                        selectedId={null}
                        onSelect={() => {}}
                        showBookButton
                        onBook={(courier) => { feedbackPresets.select(); handleSelectCourier(courier); }}
                        maxItems={15}
                      />
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <p>No {courierFilterTab} options available for this route.</p>
                        <p className="text-xs mt-1">Try a different delivery speed.</p>
                      </div>
                    )}
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

            {/* Sub-step indicator — 2 steps for domestic document, 3 for domestic gift, 3 for international */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              {(isInternational
                ? (['pickup', 'receiver', 'content'] as const)
                : (!isInternational && (rateFormData as DomesticRateValues)?.shipmentType === 'document')
                  ? (['pickup', 'receiver'] as const)
                  : (['pickup', 'receiver', 'content'] as const)
              ).map((s, i, arr) => {
                const stepOrder = isInternational
                  ? ['pickup', 'receiver', 'content']
                  : (!isInternational && (rateFormData as DomesticRateValues)?.shipmentType === 'document')
                    ? ['pickup', 'receiver']
                    : ['pickup', 'receiver', 'content'];
                // Map 'sender' sub-step to 'pickup' for progress indicator purposes
                const normalizedSubStep = (isInternational && addressSubStep === 'sender') ? 'pickup' : addressSubStep;
                const currentIdx = stepOrder.indexOf(normalizedSubStep);
                const labels = isInternational
                  ? ['Sender KYC', 'Receiver', isMedicineFlow ? 'FDA Documents' : 'Contents']
                  : (!isInternational && (rateFormData as DomesticRateValues)?.shipmentType === 'document')
                    ? ['Pickup Address', 'Recipient Address']
                    : ['Pickup Address', 'Recipient Address', 'Contents'];
                return (
                  <div key={s} className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors shrink-0 ${
                      s === normalizedSubStep ? 'bg-coke-red text-white' :
                      currentIdx > i ? 'bg-candlestick-green text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {currentIdx > i ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] sm:text-xs hidden sm:inline truncate ${s === normalizedSubStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {labels[i]}
                    </span>
                    {i < arr.length - 1 && <div className="flex-1 h-px bg-border min-w-2" />}
                  </div>
                );
              })}
            </div>

            <Form {...detailsForm}>
              <form onSubmit={detailsForm.handleSubmit(handleFinalSubmit)}>
                {/* Slider container */}
                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">
                    {/* ── Step 1: Sender KYC + Pickup Address (International) / Pickup Address (Domestic) ── */}
                    {addressSubStep === 'pickup' && (
                      <motion.div key="pickup" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-8 lg:p-10 space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${isInternational ? 'bg-coke-red/10' : 'bg-orange-100 dark:bg-orange-950/40'}`}>
                            {isInternational
                              ? <IdentificationCard className="h-4 w-4 sm:h-5 sm:w-5 text-coke-red" weight="duotone" />
                              : <House className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" weight="duotone" />
                            }
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base">{isInternational ? 'Sender KYC' : 'Pickup Address'}</h3>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">{isInternational ? 'Verify your identity and pickup details' : 'Where should we collect the shipment from?'}</p>
                          </div>
                        </div>

                        {/* ── International: Shipper identity section ── */}
                        {isInternational && (
                          <div className="space-y-3 sm:space-y-4">
                            {/* ── 1. Email with OTP verification ── */}
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
                                        if (emailOtpState !== 'idle') {
                                          setEmailOtpState('idle');
                                          setEmailOtpCode(['', '', '', '', '', '']);
                                          setEmailOtpToken('');
                                          setEmailOtpError('');
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  {emailOtpState === 'verified' ? (
                                    <div className="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-candlestick-green/10 border border-candlestick-green/30 text-candlestick-green shrink-0">
                                      <ShieldCheck className="h-4 w-4" weight="fill" />
                                      <span className="text-xs font-semibold">Verified</span>
                                    </div>
                                  ) : emailOtpState !== 'sent' && emailOtpState !== 'verifying' ? (
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
                                {emailOtpState === 'verifying' && (
                                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <CircleNotch className="h-4 w-4 animate-spin text-coke-red" />
                                    <span>Verifying...</span>
                                  </div>
                                )}
                                {emailOtpError && (
                                  <div className="flex items-center justify-center gap-1.5 text-xs text-destructive">
                                    <Warning className="h-3.5 w-3.5" weight="fill" />
                                    <span>{emailOtpError}</span>
                                  </div>
                                )}
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

                          {/* ── 2. Phone number (international) ── */}
                          {isInternational && (
                            <FormField control={detailsForm.control} name="senderPhone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl><Input {...field} placeholder="+91 98765 43210" className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}

                          {/* ── 3. Aadhaar Upload (auto-triggers OCR in background) ── */}
                          {isInternational && requiresAadhaarKyc && (
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
                          </div>
                        )}

                        {/* ── Divider between KYC and Pickup (international only) ── */}
                        {isInternational && (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-border" />
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <House className="h-3.5 w-3.5" weight="duotone" />
                              Pickup Details
                            </div>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}

                        {/* ── Pickup address fields ── */}
                        <div className="space-y-3 sm:space-y-4">
                          {/* Name + Phone for domestic; Name only for international (phone already above) */}
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                            <FormField control={detailsForm.control} name="senderName" render={({ field }) => (
                              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} placeholder="Sender name" className="h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                            {!isInternational && (
                              <FormField control={detailsForm.control} name="senderPhone" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Mobile Number</FormLabel>
                                  <FormControl><Input {...field} placeholder="+91 98765 43210" className="h-11" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            )}
                          </div>
                          {/* Optional email for domestic */}
                          {!isInternational && (
                            <FormField control={detailsForm.control} name="senderEmail" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                <FormControl><Input {...field} type="email" placeholder="sender@email.com" className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}
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
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    placeholder="110001"
                                    maxLength={6}
                                    readOnly={!!(domesticPickupPincode || internationalPickupPincode)}
                                    className={`h-11 ${(domesticPickupPincode || internationalPickupPincode) ? 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none' : ''}`}
                                  />
                                  {!!(domesticPickupPincode || internationalPickupPincode) && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">locked</span>
                                  )}
                                </div>
                              </FormControl>
                              {senderLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                              {senderLookup.error && <p className="text-xs text-destructive">{senderLookup.error}</p>}
                              <FormMessage />
                            </FormItem>
                          )} />
                          {/* Pickup phone for international — auto-populated from shipper phone, editable */}
                          {isInternational && (
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium">Pickup Contact Number</label>
                              <Input
                                value={pickupPhone}
                                onChange={e => { setPickupPhone(e.target.value); setPickupPhoneManuallyEdited(true); }}
                                placeholder="+91 98765 43210"
                                className="h-11"
                              />
                              <p className="text-[11px] text-muted-foreground">Enter the number where our pickup agent should call. Defaults to your shipper number — edit if different.</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                            <FormField control={detailsForm.control} name="senderCity" render={({ field }) => (
                              <FormItem>
                                <FormLabel>District</FormLabel>
                                <div className={`h-11 flex items-center px-3 rounded-md border text-sm ${senderLookup.district ? 'border-border bg-muted font-medium' : 'border-border bg-muted text-muted-foreground'}`}>
                                  {senderLookup.loading
                                    ? <span className="flex items-center gap-1.5 text-muted-foreground"><CircleNotch className="h-3.5 w-3.5 animate-spin" /> Fetching district...</span>
                                    : senderLookup.district || (field.value || 'Auto-filled from pincode')}
                                </div>
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
                            <p className="text-xs text-candlestick-green flex items-center gap-1">{senderLookup.district}, {senderLookup.state}</p>
                          )}
                        </div>
                        <Button type="button" onClick={() => { feedbackPresets.stepChange(); handlePickupNext(); }} disabled={isInternational && isUnderAge} className="w-full bg-coke-red hover:bg-red-600 text-white gap-2 py-4 min-h-[52px] text-sm sm:text-base">
                          Next: Recipient Details <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}

                    {/* ── Step 3: Receiver Details + Passport (for medicine) ── */}
                    {addressSubStep === 'receiver' && (
                      <motion.div key="receiver" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-8 lg:p-10 space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" weight="duotone" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base">Receiver Details</h3>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">{isInternational ? 'Delivery address abroad' : 'Delivery address in India'}</p>
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
                        <div className="space-y-3 sm:space-y-4">
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                            <FormField control={detailsForm.control} name="receiverName" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs sm:text-sm">{isMedicineFlow ? 'Full Name (as per Passport)' : 'Full Name'}</FormLabel>
                                <FormControl><Input {...field} placeholder={isMedicineFlow ? 'Name exactly as on passport' : 'Receiver name'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={detailsForm.control} name="receiverPhone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mobile Number</FormLabel>
                                <FormControl><Input {...field} placeholder={destinationCountryInfo?.phoneCode ? `${destinationCountryInfo.phoneCode} ...` : 'Phone number'} className="h-11" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={detailsForm.control} name="receiverEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email <span className="text-muted-foreground font-normal">(optional)</span></FormLabel><FormControl><Input {...field} type="email" placeholder="receiver@email.com" className="h-11" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={detailsForm.control} name="receiverAddress" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Address</FormLabel>
                              <FormControl>
                                {isInternational ? (
                                  <AddressAutocomplete
                                    value={field.value}
                                    onChange={field.onChange}
                                    countryCode={destinationCountryInfo?.code}
                                    placeholder={getAddressGuidance()}
                                    onAddressSelect={(parts) => {
                                      if (parts.city) detailsForm.setValue('receiverCity', parts.city);
                                      if (parts.state) detailsForm.setValue('receiverState', parts.state);
                                      if (parts.zipcode) detailsForm.setValue('receiverZipcode', parts.zipcode);
                                    }}
                                  />
                                ) : (
                                  <Input {...field} placeholder="House/Flat No, Street, Locality" className="h-11" />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          {/* Domestic: Pincode with finder + auto-filled district/state */}
                          {!isInternational && (
                            <>
                              <FormField control={detailsForm.control} name="receiverZipcode" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pincode</FormLabel>
                                  <div className="flex gap-1.5">
                                    <FormControl>
                                      <div className="relative flex-1">
                                        <Input
                                          {...field}
                                          placeholder="400001"
                                          maxLength={6}
                                          readOnly={!!domesticDeliveryPincode}
                                          className={`h-11 flex-1 ${domesticDeliveryPincode ? 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none' : ''}`}
                                        />
                                        {!!domesticDeliveryPincode && (
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">locked</span>
                                        )}
                                      </div>
                                    </FormControl>
                                    {!domesticDeliveryPincode && (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setShowReceiverPinFinder(v => !v)}
                                          className={cn(
                                            'h-11 px-2.5 rounded-xl border text-xs font-medium shrink-0 flex items-center gap-1 transition-all',
                                            showReceiverPinFinder
                                              ? 'border-coke-red bg-coke-red/5 text-coke-red'
                                              : 'border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                                          )}
                                        >
                                          <MagnifyingGlass className="h-3.5 w-3.5" weight="bold" />
                                          <span className="hidden sm:inline">Find</span>
                                        </button>
                                        {showReceiverPinFinder && (
                                          <PincodeFinder
                                            onSelect={(pin) => {
                                              field.onChange(pin);
                                              setShowReceiverPinFinder(false);
                                            }}
                                            onClose={() => setShowReceiverPinFinder(false)}
                                            align="right"
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {receiverLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                                  {receiverLookup.error && <p className="text-xs text-destructive">{receiverLookup.error}</p>}
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <FormField control={detailsForm.control} name="receiverCity" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>District</FormLabel>
                                    <div className={`h-11 flex items-center px-3 rounded-md border text-sm ${receiverLookup.district ? 'border-border bg-muted font-medium' : 'border-border bg-muted text-muted-foreground'}`}>
                                      {receiverLookup.loading
                                        ? <span className="flex items-center gap-1.5 text-muted-foreground"><CircleNotch className="h-3.5 w-3.5 animate-spin" /> Fetching...</span>
                                        : receiverLookup.district || (field.value || 'Auto-filled from pincode')}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={detailsForm.control} name="receiverState" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <div className={`h-11 flex items-center px-3 rounded-md border text-sm ${receiverLookup.state ? 'border-border bg-muted font-medium' : 'border-border bg-muted text-muted-foreground'}`}>
                                      {receiverLookup.loading
                                        ? <span className="flex items-center gap-1.5 text-muted-foreground"><CircleNotch className="h-3.5 w-3.5 animate-spin" /> Fetching...</span>
                                        : receiverLookup.state || (field.value || 'Auto-filled from pincode')}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                              </div>
                            </>
                          )}

                          {/* International: city/state/zip grid */}
                          {isInternational && (
                            <>
                              {/* Country display — clearly visible */}
                              {destinationCountryInfo && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/60">
                                  <span className="text-xl">{destinationCountryInfo.flag}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{destinationCountryInfo.name}</p>
                                    <p className="text-[11px] text-muted-foreground">Destination country</p>
                                  </div>
                                </div>
                              )}
                              {/* Countries that don't use postal codes */}
                              {(() => {
                                const noPostal = !!(destinationCountryInfo && COUNTRIES_WITHOUT_POSTAL_CODES.has(destinationCountryInfo.code));
                                return (
                                  <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
                                    <FormField control={detailsForm.control} name="receiverCity" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl><Input {...field} placeholder="City" className="h-11" /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                    <FormField control={detailsForm.control} name="receiverState" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>State / Province</FormLabel>
                                        <FormControl><Input {...field} placeholder="State or Province" className="h-11" /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                    <FormField control={detailsForm.control} name="receiverZipcode" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Zip / Postal Code
                                          {noPostal && <span className="ml-1 text-[10px] font-normal text-amber-600">(not used)</span>}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder={noPostal ? 'Enter 000' : 'Zipcode'}
                                            maxLength={10}
                                            className="h-11"
                                            onChange={e => {
                                              field.onChange(e);
                                              if (noPostal && !e.target.value) field.onChange('000');
                                            }}
                                          />
                                        </FormControl>
                                        {noPostal && (
                                          <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                            <Info className="h-3 w-3 shrink-0" weight="fill" />
                                            {destinationCountryInfo?.name} does not use postal codes. Enter 000.
                                          </p>
                                        )}
                                        {!noPostal && intlZipLookup.loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleNotch className="h-3 w-3 animate-spin" /> Looking up...</p>}
                                        {!noPostal && intlZipLookup.city && <p className="text-xs text-candlestick-green">{intlZipLookup.city}{intlZipLookup.state ? `, ${intlZipLookup.state}` : ''}</p>}
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                  </div>
                                );
                              })()}
                            </>
                          )}

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
                              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
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
                                  {isMobilePBF && !passportIdentity && (
                                    <button type="button" onClick={() => setPassportCameraOpen('identity')} className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border border-coke-red/30 bg-coke-red/5 text-coke-red hover:bg-coke-red/10 transition-colors">
                                      <Camera className="h-4 w-4" weight="duotone" /> Take Photo
                                    </button>
                                  )}
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
                                  {isMobilePBF && !passportAddress && (
                                    <button type="button" onClick={() => setPassportCameraOpen('address')} className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border border-coke-red/30 bg-coke-red/5 text-coke-red hover:bg-coke-red/10 transition-colors">
                                      <Camera className="h-4 w-4" weight="duotone" /> Take Photo
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Passport Camera Capture for mobile */}
                              {isMobilePBF && (
                                <CameraCapture
                                  open={passportCameraOpen !== null}
                                  onOpenChange={(open) => { if (!open) setPassportCameraOpen(null); }}
                                  onCapture={(file) => {
                                    if (passportCameraOpen === 'identity') setPassportIdentity(file);
                                    else if (passportCameraOpen === 'address') setPassportAddress(file);
                                    setPassportCameraOpen(null);
                                  }}
                                  documentType={passportCameraOpen === 'identity' ? 'passport-identity' : 'passport-address'}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => { feedbackPresets.tap(); setAddressSubStep('pickup'); }} className="flex-1 gap-1.5 min-h-[48px] text-sm">
                            <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{isInternational ? 'Sender KYC' : 'Pickup'}</span>
                          </Button>
                          <Button type="button" onClick={() => { feedbackPresets.stepChange(); handleReceiverNext(); }} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5 min-h-[48px] text-sm">
                            {(!isInternational && (rateFormData as DomesticRateValues)?.shipmentType === 'document') ? <><span className="truncate">Continue to Summary</span> <ArrowRight className="h-4 w-4 shrink-0" /></> : isMedicineFlow ? <><span className="truncate">Next: FDA Documents</span> <ArrowRight className="h-4 w-4 shrink-0" /></> : <><span className="truncate">Next: Contents</span> <ArrowRight className="h-4 w-4 shrink-0" /></>}
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
                        className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-8 lg:p-10 space-y-4 sm:space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" weight="duotone" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base">{isMedicineFlow ? 'FDA Documents' : 'Shipment Contents'}</h3>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">{isMedicineFlow ? 'Upload required documents for customs & FDA clearance' : isDocumentFlow ? 'Document details for customs declaration' : isInternational ? 'Add each item for customs declaration' : 'Describe what you are shipping'}</p>
                          </div>
                        </div>

                        {/* Item list — hidden for medicine flow (replaced by FDA document uploads below) */}
                        {!isMedicineFlow && <div className="space-y-4">
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
                          /* ── Gift flow: multi-item view ── */
                          <>
                            {/* CSB-IV value limit notice */}
                            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30 p-3">
                              <Warning className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" weight="fill" />
                              <p className="text-xs text-amber-900 dark:text-amber-200">
                                <span className="font-semibold">CSB-IV Shipment Limit:</span> The total declared value of all items combined should not exceed <span className="font-bold">₹25,000 INR</span>. All international gift/personal shipments are sent under CSB-IV mode, which does not permit a value above ₹25,000.
                              </p>
                            </div>

                            {/* Assistive example — shown when no items filled yet */}
                            {contentItems.length === 1 && !contentItems[0].name && (
                              <div className="rounded-xl border-2 border-dashed border-coke-red/20 bg-coke-red/[0.03] overflow-hidden">
                                {/* Example header badge */}
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-coke-red/5 border-b border-coke-red/10">
                                  <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-coke-red/10 text-coke-red">Example</span>
                                  <span className="text-xs text-muted-foreground">This is just a preview — fill in your actual items below</span>
                                </div>
                                <div className="p-3 space-y-1.5 opacity-60 pointer-events-none select-none">
                                  <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/40 pb-1.5">
                                    <span>Item Name</span><span>Type</span><span>Qty × Price</span><span className="text-right">Total</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-[11px] italic text-muted-foreground py-1">
                                    <span>Cotton T-Shirt</span><span>Clothing</span><span>2 × ₹500</span><span className="text-right">₹1,000</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-[11px] italic text-muted-foreground py-1 border-t border-border/30">
                                    <span>Chocolate Box</span><span>Food</span><span>1 × ₹800</span><span className="text-right">₹800</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Items summary table — shown when 2+ items or first item is filled */}
                            {(contentItems.length > 1 || contentItems[0]?.name) && (
                              <div className="rounded-lg border border-border overflow-hidden">
                                <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                  <span>Item</span><span>Type</span><span className="text-center">Qty × Price</span><span className="text-right">Total</span>
                                </div>
                                {contentItems.map((item, idx) => {
                                  const rowTotal = item.qty * item.unitPrice;
                                  return item.name ? (
                                    <div key={idx} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs border-t border-border/40 items-center">
                                      <span className="font-medium truncate">{item.name}</span>
                                      <span className="text-muted-foreground truncate capitalize">{item.type || '—'}</span>
                                      <span className="text-center text-muted-foreground">{item.qty} × ₹{item.unitPrice.toLocaleString('en-IN')}</span>
                                      <div className="flex items-center justify-end gap-1.5">
                                        <span className="font-semibold">₹{rowTotal.toLocaleString('en-IN')}</span>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedItemIndex(idx)}
                                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-coke-red/10 hover:bg-coke-red/20 text-coke-red text-[11px] font-semibold transition-colors"
                                        >
                                          <PencilSimple className="h-3.5 w-3.5" weight="bold" /> Edit
                                        </button>
                                        {contentItems.length > 1 && (
                                          <button type="button" onClick={() => { setContentItems(prev => prev.filter((_, i) => i !== idx)); if (expandedItemIndex >= contentItems.length - 1) setExpandedItemIndex(Math.max(0, contentItems.length - 2)); }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-semibold transition-colors">
                                            <Trash className="h-3.5 w-3.5" weight="bold" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            )}

                            {/* Item edit forms */}
                            {contentItems.map((item, idx) => {
                            const isExpanded = expandedItemIndex === idx;
                            const itemTotal = item.qty * item.unitPrice;

                            if (!isExpanded && item.name.trim()) return null; // shown in table above

                            return (
                            <div key={idx} className="rounded-lg border border-border p-4 space-y-3 relative">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                                {contentItems.length > 1 && (
                                  <button type="button" onClick={() => { setContentItems(prev => prev.filter((_, i) => i !== idx)); if (expandedItemIndex >= contentItems.length - 1) setExpandedItemIndex(Math.max(0, contentItems.length - 2)); }} className="text-destructive hover:text-destructive/80 p-1">
                                    <Trash className="h-4 w-4" weight="bold" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium">Item Name</label>
                                  <Input value={item.name} onChange={(e) => { const arr = [...contentItems]; arr[idx].name = e.target.value; setContentItems(arr); }} placeholder="e.g. Cotton T-Shirt" className="h-10 mt-1" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Type of Item</label>
                                  <Select value={item.type} onValueChange={(v) => { const arr = [...contentItems]; arr[idx].type = v; setContentItems(arr); }}>
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
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium">Quantity</label>
                                  <Input type="number" value={item.qty} onChange={(e) => { const arr = [...contentItems]; arr[idx].qty = Number(e.target.value) || 0; setContentItems(arr); }} className="h-10 mt-1" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Unit Price (₹)</label>
                                  <Input type="number" min={0} value={item.unitPrice || ''} onChange={(e) => { const arr = [...contentItems]; arr[idx].unitPrice = Number(e.target.value) || 0; setContentItems(arr); }} placeholder="500" className="h-10 mt-1" />
                                </div>
                              </div>
                              {item.name && item.unitPrice > 0 && (
                                <div className="flex justify-between items-center text-xs bg-muted/40 rounded-lg px-3 py-2">
                                  <span className="text-muted-foreground">Item total</span>
                                  <span className="font-semibold">₹{itemTotal.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {item.name.trim() && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedItemIndex(-1)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-coke-red text-white text-xs font-semibold hover:bg-red-600 transition-colors w-full justify-center"
                                >
                                  <Check className="h-3.5 w-3.5" weight="bold" /> Done Editing
                                </button>
                              )}
                            </div>
                            );
                          })}
                          </>
                          )}
                        </div>
                        }

                        {/* Add item button — hidden for document flow and medicine flow */}
                        {!isDocumentFlow && !isMedicineFlow && (() => {
                          const totalValue = contentItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
                          const isOverLimit = totalValue > 49000;
                          return (
                          <Button type="button" variant="outline" onClick={() => {
                            const newIdx = contentItems.length;
                            setContentItems(prev => [...prev, { name: '', type: '', hsnCode: '', qty: 1, unitPrice: 0 }]);
                            setExpandedItemIndex(newIdx);
                          }} className="w-full gap-2 border-dashed" disabled={isOverLimit}>
                            <Plus className="h-4 w-4" /> Add Another Item
                          </Button>
                          );
                        })()}

                        {/* Total value display — hidden for document flow and medicine flow */}
                        {!isDocumentFlow && !isMedicineFlow && (() => {
                          const totalValue = contentItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
                          const isOverLimit = totalValue > 49000;
                          return (
                          <div className="space-y-2">
                            <div className={`flex justify-between items-center text-sm rounded-lg px-4 py-2.5 ${isOverLimit ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
                              <span className={isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>Total Declared Value</span>
                              <span className={`font-semibold ${isOverLimit ? 'text-destructive' : ''}`}>₹{totalValue.toLocaleString('en-IN')}</span>
                            </div>
                            {isOverLimit && (
                              <div className="flex items-start gap-2 text-xs text-destructive px-1">
                                <Warning className="h-4 w-4 shrink-0 mt-0.5" weight="fill" />
                                <span>Total declared value cannot exceed ₹49,000 for guest shipments. Please reduce item quantities or prices.</span>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground text-right px-1">Maximum allowed: ₹49,000</p>
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
                              <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-xs space-y-1.5">
                                <p className="font-medium text-blue-900 dark:text-blue-200">Why we need this & what to upload:</p>
                                <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-1">
                                  <li>Customs and destination country health authorities require a valid prescription to permit medicine imports — without it, the shipment will be seized.</li>
                                  <li>Must be issued by a registered doctor with their registration number printed on the letterhead.</li>
                                  <li>The prescription must not cover more than a 90-day medicine supply — larger quantities are not permitted for personal import.</li>
                                  <li>The recipient (consignee) name on the prescription must exactly match the delivery address name.</li>
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

                            {/* ── Section 2: Medicine Purchase Bill ── */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-coke-red" weight="duotone" />
                                <h4 className="font-semibold text-sm">Medicine Purchase Bill</h4>
                              </div>
                              <div className="rounded-lg border border-coke-red/20 bg-coke-red/5 p-3 text-xs space-y-1.5">
                                <p className="font-medium text-coke-red/90">Why we need this & what to upload:</p>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                  <li>A purchase bill proves the medicines were legally bought and establishes their declared value for customs assessment.</li>
                                  <li>The patient name (buyer) must be printed on the bill — this links the purchase to the prescription.</li>
                                  <li>Medicines must not have an expiry date within 6 months from the date of shipment — expired or near-expiry medicines will be rejected at customs.</li>
                                  <li className="font-medium text-coke-red/90">The total medicine value on the bill should be less than ₹25,000 INR — all medicine shipments are sent under CSB-IV mode, which does not allow a declared value exceeding ₹25,000.</li>
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
                                <span className="text-sm font-medium text-coke-red">Upload Purchase Bill</span>
                                <span className="text-xs text-muted-foreground">(PDF, JPG, PNG)</span>
                              </label>
                            </div>

                            {/* ── Controlled Drugs Declaration ── */}
                            <div
                              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${controlledDrugsConfirmed ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-border bg-muted/30'}`}
                              onClick={() => setControlledDrugsConfirmed(v => !v)}
                            >
                              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${controlledDrugsConfirmed ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                                {controlledDrugsConfirmed && <Check className="h-3 w-3 text-white" weight="bold" />}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium leading-snug">I confirm these medicines are not controlled or narcotic drugs</p>
                                <p className="text-xs text-muted-foreground">Controlled substances (opioids, psychotropics, narcotics, etc.) are strictly prohibited for international shipment regardless of prescription. Shipping such medicines is illegal and will result in seizure and legal action.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hidden field — auto-populated */}
                        <FormField control={detailsForm.control} name="contentDescription" render={({ field }) => (
                          <input type="hidden" {...field} />
                        )} />

                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => { feedbackPresets.tap(); setAddressSubStep('receiver'); }} className="flex-1 gap-1.5 min-h-[48px] text-sm">
                            <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">Receiver</span>
                          </Button>
                          <Button type="button" onClick={() => {
                            feedbackPresets.stepChange();
                            if (isMedicineFlow) {
                              if (prescriptionDocs.length === 0) { toast({ title: 'Prescription required', description: 'Please upload the doctor\'s prescription.', variant: 'destructive' }); return; }
                              if (pharmacyBillDocs.length === 0) { toast({ title: 'Purchase bill required', description: 'Please upload the medicine purchase bill.', variant: 'destructive' }); return; }
                              if (!controlledDrugsConfirmed) { toast({ title: 'Declaration required', description: 'Please confirm these medicines are not controlled or narcotic drugs.', variant: 'destructive' }); return; }
                              detailsForm.setValue('contentDescription', 'medicine shipment with prescription');
                              detailsForm.handleSubmit(handleFinalSubmit)();
                              return;
                            }
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
                            // International limit: ₹25,000 | Domestic limit: ₹49,000
                            const valueLimit = isInternational ? 25000 : 49000;
                            if (totalValue > valueLimit) {
                              toast({ title: 'Value limit exceeded', description: `Total declared value cannot exceed ₹${valueLimit.toLocaleString('en-IN')} for this shipment.`, variant: 'destructive' });
                              return;
                            }
                            const desc = contentItems.filter(i => i.name.trim()).map(i => `${i.name} (${i.type || 'other'}) x${i.qty} @ ₹${i.unitPrice}`).join('; ');
                            detailsForm.setValue('contentDescription', desc);
                            detailsForm.handleSubmit(handleFinalSubmit)();
                          }} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5 min-h-[48px] text-sm">
                            <span className="truncate">Continue to Summary</span> <ArrowRight className="h-4 w-4 shrink-0" />
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
            aadhaarFront={aadhaarFront}
            aadhaarBack={aadhaarBack}
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
                Guest bookings are limited to 10 kg. To ship heavier packages, open a free account and enjoy lower rates.
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowWeightLimitModal(false)} className="flex-1">
                  Go Back
                </Button>
                <Button onClick={() => router.push('/register')} className="flex-1 bg-coke-red hover:bg-red-600 text-white gap-1.5">
                  <UserPlus className="h-4 w-4" /> Open Account
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ Mobile/Tablet Fixed Bottom Progress Bar ═══════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 <= step ? 'bg-coke-red' : 'bg-muted'}`} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-1.5 max-w-3xl mx-auto">
          <p className="text-[11px] font-medium text-foreground">Step {step} of {stepLabels.length}</p>
          <p className="text-[11px] text-muted-foreground">{stepLabels[step - 1]}</p>
        </div>
      </div>
    </div>
  );
}
