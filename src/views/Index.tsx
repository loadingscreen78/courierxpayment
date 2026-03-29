"use client";

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { CourierXLoader } from '@/components/landing/CourierXLoader';
import { 
  Pill, 
  FileText, 
  Gift, 
  Package,
  Clock,
  CheckCircle,
  Wallet,
  MapPin,
  Truck,
  Eye,
  Airplane,
  Cube,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useShipments, Shipment } from '@/hooks/useShipments';
import { useAddresses } from '@/hooks/useAddresses';
import { getStatusLabel, getStatusDotColor, getLegLabel } from '@/lib/shipment-lifecycle/statusLabelMap';
import { ShipmentStatus, ShipmentLeg } from '@/lib/shipment-lifecycle/types';
import { KycPromptBanner } from '@/components/dashboard/KycPromptBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useShippingMode } from '@/contexts/ShippingModeContext';

// Remove mock data - now using real data from database

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Metallic Stat Card - Using project colors only
const StatCard = ({ 
  icon: Icon, 
  value, 
  label, 
  accent,
  href
}: { 
  icon: React.ElementType; 
  value: string | number; 
  label: string;
  accent?: boolean;
  href: string;
}) => {
  const router = useRouter();
  const { lightTap } = useHaptics();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { lightTap(); router.push(href); }}
      className="cursor-pointer"
    >
      <div className={`relative overflow-hidden rounded-3xl p-[1px] shadow-lg ${
        accent 
          ? 'bg-gradient-to-br from-coke-red/80 via-coke-red to-coke-red/80' 
          : 'bg-gradient-to-br from-border via-muted to-border'
      }`}>
        <div className={`relative rounded-3xl p-5 ${
          accent 
            ? 'bg-gradient-to-br from-coke-red via-coke-red to-red-700' 
            : 'bg-card'
        }`}>
          {/* Metallic shine */}
          <div className={`absolute top-0 left-0 right-0 h-1/2 rounded-t-3xl ${
            accent ? 'bg-gradient-to-b from-white/20 to-transparent' : 'bg-gradient-to-b from-white/5 to-transparent'
          }`} />
          
          <div className="relative flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${
              accent ? 'bg-white/20' : 'bg-coke-red/10'
            }`}>
              <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-coke-red'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold font-typewriter ${accent ? 'text-white' : 'text-foreground'}`}>{value}</p>
              <p className={`text-xs font-medium uppercase tracking-wider ${accent ? 'text-white/70' : 'text-muted-foreground'}`}>{label}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Premium Shipment Card - Project colors only
const ShipmentCard = ({ shipment, index }: { shipment: Shipment; index: number }) => {
  const router = useRouter();
  const { lightTap } = useHaptics();
  
  const typeIcons = { medicine: Pill, document: FileText, gift: Gift };
  const Icon = typeIcons[shipment.shipment_type as keyof typeof typeIcons] || Package;
  
  const statusLabel = getStatusLabel(shipment.current_status as ShipmentStatus);
  const statusDotColor = getStatusDotColor(shipment.current_status as ShipmentStatus);
  const legLabel = getLegLabel(shipment.current_leg as ShipmentLeg);

  // Extract city from destination address
  const getDestinationCity = () => {
    if (shipment.consignee_address?.city) {
      return `${shipment.consignee_address.city}, ${shipment.destination_country}`;
    }
    return shipment.destination_country;
  };

  // Get item name based on type
  const getItemName = () => {
    const typeNames = {
      medicine: 'Prescription Medicine',
      document: 'Documents',
      gift: 'Gift Package',
    };
    return typeNames[shipment.shipment_type as keyof typeof typeNames] || 'Shipment';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      onClick={() => { lightTap(); router.push(`/shipments`); }}
      className="cursor-pointer group"
    >
      {/* Metallic border container */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-xl">
        <div className="relative rounded-3xl bg-card overflow-hidden">
          {/* Top metallic shine */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent" />
          
          {/* Status bar - Coke Red */}
          <div className="h-1 bg-coke-red" />
          
          <div className="relative p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-coke-red/10">
                  <Icon className="h-5 w-5 text-coke-red" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{getItemName()}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{shipment.tracking_number}</p>
                </div>
              </div>
              <Badge className="bg-coke-red text-white border-0 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${statusDotColor}`} />
                {statusLabel}
              </Badge>
            </div>

            {/* Destination Box */}
            <div className="rounded-2xl bg-muted/50 border border-border p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-background">
                  <Airplane className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{getDestinationCity()}</p>
                  <p className="text-xs text-muted-foreground">To: {shipment.recipient_name}</p>
                </div>
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{legLabel}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground text-xs">
                  {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">₹{shipment.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <button className="flex items-center gap-1.5 text-sm text-coke-red font-semibold group-hover:gap-2.5 transition-all">
                <Eye className="h-4 w-4" />
                View
                <CaretRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Index = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const { balance } = useWallet();
  const { activeShipments, deliveredShipments, loading } = useShipments();
  const { addresses } = useAddresses();
  const { mode, isSwitching } = useShippingMode();
  const isInternational = mode === 'international';
  
  const displayName = profile?.full_name?.split(' ')[0] || 'there';
  const isKycComplete = profile?.aadhaar_verified;

  // Show loading state with branded loader (truck animation)
  if (loading) {
    return <CourierXLoader isLoading={true} />;
  }

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isSwitching ? 0 : 1, y: isSwitching ? -8 : 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="space-y-8 pb-8"
        >
        {/* KYC Banner */}
        <AnimatePresence>
          {!isKycComplete && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <KycPromptBanner userName={profile?.full_name || undefined} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Banner — info only, no toggle (toggle lives in sidebar + header) */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 ${
            isInternational
              ? 'bg-[#F40000]/5 border-[#F40000]/20'
              : 'bg-muted/40 border-border/60'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${isInternational ? 'bg-[#F40000]/10' : 'bg-foreground/8'}`}>
            {isInternational
              ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#F40000]">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 3C12 3 8.5 7 8.5 12C8.5 17 12 21 12 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M12 3C12 3 15.5 7 15.5 12C15.5 17 12 21 12 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M3.5 12H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-foreground/60">
                  <path d="M1 4h13v12H1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M14 9h4.5L22 12.5V16h-8V9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <circle cx="5.5" cy="19" r="2" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="18.5" cy="19" r="2" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
              )
            }
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${isInternational ? 'text-[#F40000]' : 'text-foreground/70'}`}>
              {isInternational ? 'International Mode' : 'Domestic Mode'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isInternational
                ? 'Shipping to 150+ countries — medicines, documents & gifts'
                : 'Fast delivery across India — same-day & next-day options'}
            </p>
          </div>
        </motion.div>

        {/* Welcome Header - Metallic Card */}
        <motion.header variants={itemVariants}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-xl">
            <div className="relative rounded-3xl bg-card p-5 sm:p-8 overflow-hidden">
              {/* Subtle decorative gradient */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-coke-red/5 rounded-full blur-3xl" />
              {/* Metallic shine */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent rounded-t-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle className="h-4 w-4 text-coke-red" />
                  <p className="text-sm text-muted-foreground font-medium">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground font-typewriter">
                  Welcome back, <span className="text-coke-red">{displayName}</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isInternational
                    ? activeShipments.length > 0
                      ? `You have ${activeShipments.length} active international shipment${activeShipments.length > 1 ? 's' : ''} in transit`
                      : 'Ready to ship internationally? Create your first shipment'
                    : 'Domestic shipping — fast, reliable delivery across India'
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Package}
            value={activeShipments.length}
            label="Active Shipments"
            accent
            href="/shipments"
          />
          <StatCard
            icon={Wallet}
            value={`₹${balance.toLocaleString('en-IN')}`}
            label="Wallet Balance"
            href="/wallet"
          />
          <StatCard
            icon={CheckCircle}
            value={deliveredShipments.length}
            label="Delivered"
            href="/history"
          />
          <StatCard
            icon={Cube}
            value={addresses.length}
            label="Saved Addresses"
            href="/vault"
          />
        </motion.div>

        {/* Domestic-only notice */}
        {!isInternational && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-lg"
          >
            <div className="relative rounded-3xl bg-card p-6 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-green-500/5 to-transparent" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-green-500/10">
                  <Truck className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-foreground font-typewriter">Domestic Shipping</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Book same-day, next-day, or standard delivery across all Indian pin codes.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/new-shipment')}
                  className="ml-auto shrink-0 bg-green-600 hover:bg-green-700 text-white rounded-full px-5 hidden sm:flex"
                >
                  Book Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Shipments */}
        {activeShipments.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-coke-red/10">
                  <Truck className="h-5 w-5 text-coke-red" />
                </div>
                <h2 className="text-xl font-bold text-foreground font-typewriter">My Shipments</h2>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => router.push('/shipments')}
                className="text-coke-red hover:text-coke-red hover:bg-coke-red/10 rounded-full gap-1 font-medium"
              >
                View All <CaretRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeShipments.slice(0, 3).map((shipment, index) => (
                <ShipmentCard key={shipment.id} shipment={shipment} index={index} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {activeShipments.length === 0 && (
          <motion.section variants={itemVariants}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-lg">
              <div className="relative rounded-3xl bg-card overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent" />
                <div className="relative p-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-coke-red/10 flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-coke-red" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No Active Shipments</h3>
                  <p className="text-muted-foreground mb-6">
                    {isInternational
                      ? 'Start shipping your medicines, documents, or gifts internationally'
                      : 'Book a domestic shipment to get started'}
                  </p>
                  <Button 
                    onClick={() => router.push('/new-shipment')}
                    className="bg-coke-red hover:bg-coke-red/90 text-white rounded-full px-6"
                  >
                    Create New Shipment
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Recent Deliveries */}
        {deliveredShipments.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-lg">
              <div className="relative rounded-3xl bg-card overflow-hidden">
                {/* Metallic shine */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent" />
                
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-coke-red/10">
                        <CheckCircle className="h-5 w-5 text-coke-red" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground font-typewriter">Recently Delivered</h2>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push('/history')}
                      className="text-muted-foreground hover:text-foreground rounded-full gap-1 text-sm"
                    >
                      History <CaretRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {deliveredShipments.slice(0, 2).map((delivery, index) => (
                      <motion.div 
                        key={delivery.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push('/history')}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-coke-red/10">
                            <CheckCircle className="h-4 w-4 text-coke-red" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {delivery.shipment_type === 'medicine' ? 'Medicine' : delivery.shipment_type === 'document' ? 'Documents' : 'Gift'} → {delivery.destination_country}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{delivery.tracking_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-coke-red">Delivered</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(delivery.updated_at), 'MMM d, yyyy')}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Footer */}
        <motion.footer variants={itemVariants} className="pt-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-coke-red animate-pulse" />
              <p className="text-xs text-muted-foreground font-medium">
                {isInternational
                  ? 'CSB IV Compliant • Personal Use Only • Insured Shipments'
                  : 'Pan-India Coverage • Same-Day Available • Insured Shipments'}
              </p>
            </div>
          </div>
        </motion.footer>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
};

export default Index;
