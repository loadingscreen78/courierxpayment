"use client";

import { Pill, FileText, Gift, ArrowRight, MapPin } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { useHaptics } from '@/hooks/useHaptics';
import { deleteDraftsByType } from '@/lib/drafts/draftService';
import { useShippingMode } from '@/contexts/ShippingModeContext';
import { ShippingModeToggle } from '@/components/ui/ShippingModeToggle';

interface ShipmentTypeCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  href: string;
  onBeforeNavigate?: () => void;
}

const ShipmentTypeCard = ({ icon: Icon, title, description, color, href, onBeforeNavigate }: ShipmentTypeCardProps) => {
  const router = useRouter();
  const { mediumTap } = useHaptics();

  const handleClick = () => {
    mediumTap();
    onBeforeNavigate?.();
    router.push(href);
  };

  return (
    <Card 
      className="group relative overflow-hidden p-6 cursor-pointer card-hover border-2 border-transparent hover:border-destructive/20 transition-all duration-300"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div className={`p-4 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-8 w-8 text-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-typewriter font-bold mb-2 group-hover:text-destructive transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive group-hover:translate-x-1 transition-all duration-300" />
      </div>
      
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/5 to-destructive/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </Card>
  );
};

const NewShipment = () => {
  const { mode } = useShippingMode();
  const isDomestic = mode === 'domestic';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-typewriter font-bold">Create New Shipment</h1>
          <p className="text-muted-foreground">
            {isDomestic
              ? 'Ship documents or parcels anywhere across India'
              : 'Select the type of shipment you want to send internationally'}
          </p>
          <div className="flex justify-center">
            <ShippingModeToggle />
          </div>
        </div>

        {/* Shipment Type Selection */}
        <div className="space-y-4">
          {isDomestic ? (
            /* Domestic Options */
            <>
              <ShipmentTypeCard
                icon={FileText}
                title="Documents"
                description="Send documents up to 1 kg anywhere in India. Certificates, legal papers, records and more."
                color="bg-accent"
                href="/book/domestic?type=document"
              />
              <ShipmentTypeCard
                icon={Gift}
                title="Gifts & Parcels"
                description="Ship anything up to 60 kg across India. Clothing, electronics, books, and more. Max value ₹49,000."
                color="bg-success/20"
                href="/book/domestic?type=gift"
              />
            </>
          ) : (
            /* International Options */
            <>
              <ShipmentTypeCard
                icon={Pill}
                title="Medicine"
                description="Send prescription medicines with proper documentation. Includes HSN code verification and 90-day supply limit compliance."
                color="bg-destructive/10"
                href="/book/medicine?new=1"
                onBeforeNavigate={() => deleteDraftsByType('medicine')}
              />
              <ShipmentTypeCard
                icon={FileText}
                title="Documents"
                description="Ship important documents like certificates, legal papers, and official records securely worldwide."
                color="bg-accent"
                href="/book/document?new=1"
                onBeforeNavigate={() => deleteDraftsByType('document')}
              />
              <ShipmentTypeCard
                icon={Gift}
                title="Gifts & Samples"
                description="Send personal gifts and product samples. Safety checklist included for restricted items."
                color="bg-success/20"
                href="/book/gift?new=1"
                onBeforeNavigate={() => deleteDraftsByType('gift')}
              />
            </>
          )}
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-muted/50 border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            {isDomestic ? (
              <>
                <span className="font-semibold">Domestic Shipping:</span> Direct pickup from your address. No warehouse involvement. AWB label provided instantly.
              </>
            ) : (
              <>
                <span className="font-semibold">CSB IV Compliance:</span> All shipments must be for personal use with declared value under ₹25,000
              </>
            )}
          </p>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NewShipment;

