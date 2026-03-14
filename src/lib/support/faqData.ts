export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  category: string;
  icon: string;
  questions: FAQItem[];
}

export const faqData: FAQCategory[] = [
  {
    category: 'Shipping & Delivery',
    icon: 'Truck',
    questions: [
      {
        question: 'How long does international shipping take?',
        answer: 'Transit times vary by destination: USA/UK (5-7 business days), UAE (3-5 business days), Europe (7-10 business days). Add 24 hours for warehouse QC processing after domestic pickup.'
      },
      {
        question: 'Which courier will deliver my shipment?',
        answer: 'We automatically select the optimal courier based on destination: DHL for EU, Aramex for Middle East, FedEx for USA/Rest of World, and ShipGlobal for economy shipping to USA, EU, UAE, Singapore, and Australia.'
      },
      {
        question: 'How can I track my shipment?',
        answer: 'Once your shipment is handed over to the international carrier, you\'ll receive a tracking number via WhatsApp and Email. You can track it in real-time from your Dashboard or the Track section.'
      },
      {
        question: 'What happens after domestic pickup?',
        answer: 'After pickup, your shipment arrives at our warehouse within 1-2 days. It undergoes Quality Control (QC) within 24 hours. If QC passes, it\'s handed over to the international carrier. If QC fails, you\'ll be notified with action options.'
      }
    ]
  },
  {
    category: 'Medicines',
    icon: 'Pill',
    questions: [
      {
        question: 'What documents are required for medicine shipments?',
        answer: 'You need: (1) Valid Doctor\'s Prescription, (2) Pharmacy Bill/Invoice showing medicine details, and (3) Recipient\'s ID (Passport or local ID). All documents must be clearly readable.'
      },
      {
        question: 'What is the 90-day supply limit?',
        answer: 'Under CSB IV regulations, medicines can only be shipped for personal use up to 90 days supply. This is calculated as: Total Units ÷ Daily Dosage. If this exceeds 90 days, the booking will be blocked.'
      },
      {
        question: 'Can I ship controlled substances?',
        answer: 'Controlled substances (Schedule H, X, or narcotic drugs) require special supervision and additional documentation. A warning will be displayed during booking. Some countries completely prohibit import of certain controlled drugs.'
      },
      {
        question: 'What medicine types can I ship?',
        answer: 'We support Allopathy, Homeopathy, Ayurvedic, and other medicine types in various forms: Tablets, Capsules, Liquids, Semi-liquids, and Powders. Each has specific packaging requirements.'
      }
    ]
  },
  {
    category: 'Documents',
    icon: 'FileText',
    questions: [
      {
        question: 'What types of documents can I ship?',
        answer: 'You can ship personal documents like certificates, educational transcripts, legal papers, contracts, and business documents. We do not ship passports, currency notes, or financial instruments.'
      },
      {
        question: 'Do documents require apostille?',
        answer: 'Apostille requirements depend on the destination country and document type. Educational certificates going to Hague Convention countries typically require apostille. We can guide you through this process.'
      },
      {
        question: 'What is the weight limit for documents?',
        answer: 'Document shipments are typically under 0.5 kg. If your document package exceeds this, additional charges may apply based on volumetric or actual weight, whichever is higher.'
      }
    ]
  },
  {
    category: 'Gifts & Samples',
    icon: 'Gift',
    questions: [
      {
        question: 'What items are prohibited in gift shipments?',
        answer: 'Strictly prohibited items include: Gold, Silver, Antiques, Currency, Credit/Debit Cards, Passports, and any hazardous materials. Attempting to ship these will immediately block your booking.'
      },
      {
        question: 'What is the duty-free limit for gifts?',
        answer: 'Duty-free limits vary by country. Generally, gifts under a certain value (varies by destination) may be exempt from customs duty. Declared values must be accurate to avoid customs issues.'
      },
      {
        question: 'Can I ship items with batteries?',
        answer: 'Items with lithium batteries have restrictions. Small consumer electronics with built-in batteries may be allowed, but loose lithium batteries are prohibited. A safety checklist will appear during booking.'
      },
      {
        question: 'What is an HSN code and why is it required?',
        answer: 'HSN (Harmonized System of Nomenclature) is an 8-digit international product classification code required for customs. We auto-populate common items, or you can search our database during booking.'
      }
    ]
  },
  {
    category: 'Payments & Wallet',
    icon: 'Wallet',
    questions: [
      {
        question: 'What is the minimum wallet balance required?',
        answer: 'A minimum balance of ₹1,000 is required to initiate any booking. The actual shipment cost will be deducted upon booking confirmation, not during draft creation.'
      },
      {
        question: 'What is the minimum recharge amount?',
        answer: 'The minimum wallet recharge amount is ₹500. You can add funds via UPI, Debit Card, Credit Card, or Net Banking through our secure payment gateway (Cashfree).'
      },
      {
        question: 'Can I get a refund to my wallet?',
        answer: 'Yes, refunds for cancelled shipments (within the cancellation window) are credited back to your CourierX wallet. Withdrawal to bank account is only possible upon permanent account closure.'
      },
      {
        question: 'How does currency conversion work?',
        answer: 'All transactions are in INR. For international references, we show equivalent amounts in USD, EUR, and AED with an 11% markup applied to cover banking and exchange charges.'
      }
    ]
  },
  {
    category: 'CSB IV Compliance',
    icon: 'Shield',
    questions: [
      {
        question: 'What is CSB IV?',
        answer: 'CSB IV (Courier Shipping Bill IV) is a customs category for personal-use shipments from India. It has a ₹25,000 declared value limit and is meant exclusively for non-commercial, personal items.'
      },
      {
        question: 'What happens if my shipment exceeds ₹25,000?',
        answer: 'Shipments with declared value exceeding ₹25,000 cannot be processed under CSB IV. Your booking will be blocked, and you\'ll see a "Contact Us" option to discuss alternative shipping methods.'
      },
      {
        question: 'Can I ship commercial goods?',
        answer: 'No, CourierX operates strictly under CSB IV for personal use only. Commercial shipments, resale items, or business inventory require different customs procedures and are not supported.'
      }
    ]
  },
  {
    category: 'KYC & Verification',
    icon: 'UserCheck',
    questions: [
      {
        question: 'Why is Aadhaar verification required?',
        answer: 'Aadhaar OTP verification is mandatory for KYC compliance and to establish your verified sender address. This address becomes your fixed origin address for all international customs declarations.'
      },
      {
        question: 'Can I change my sender address after KYC?',
        answer: 'No, the address extracted from your Aadhaar verification becomes your permanent sender address for customs purposes. This ensures compliance with international shipping regulations.'
      },
      {
        question: 'What if my Aadhaar address is outdated?',
        answer: 'You\'ll need to update your Aadhaar address with UIDAI before completing CourierX KYC. We use the official Aadhaar API, so only current Aadhaar data is accepted.'
      }
    ]
  }
];
