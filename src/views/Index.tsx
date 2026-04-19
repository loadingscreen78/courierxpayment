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
  Calculator,
  FolderOpen,
  Question,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useShipments, Shipment } from '@/hooks/useShipments';
import { useAddresses } from '@/hooks/useAddresses';
import { getStatusLabel, getStatusDotColor, getLegLabel } from '@/lib/shipment-lifecycle/statusLabelMap';
import { ShipmentStatus, ShipmentLeg } from '@/lib/shipment-lifecycle/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useShippingMode } from '@/contexts/ShippingModeContext';
import { KycBanner } from '@/components/dashboard/KycBanner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
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

  const getDestinationCity = () => {
    if (shipment.consignee_address?.city) {
      return `${shipment.consignee_address.city}, ${shipment.destination_country}`;
    }
    return shipment.destination_country;
  };

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-xl">
        <div className="relative rounded-3xl bg-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent" />
          <div className="h-1 bg-coke-red" />
          
          <div className="relative p-5">
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

// Quick action card for new users
const QuickActionCard = ({ icon: Icon, title, description, href, color }: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
}) => {
  const router = useRouter();
  const { lightTap } = useHaptics();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { lightTap(); router.push(href); }}
      className="cursor-pointer rounded-2xl border border-border bg-card p-4 hover:border-coke-red/20 hover:bg-coke-red/[0.02] transition-all duration-200"
    >
      <div className={`p-2.5 rounded-xl ${color} w-fit mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
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

  if (loading) {
    return <CourierXLoader isLoading={true} />;
  }

  const hasNoShipments = activeShipments.length === 0 && deliveredShipments.length === 0;
  if (hasNoShipments && !isInternational) {
    router.replace('/new-shipment');
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

        {/* Welcome Header */}
        <motion.header variants={itemVariants}>
          <KycBanner />

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-xl mt-4">
            <div className="relative rounded-3xl bg-card p-5 sm:p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-coke-red/5 rounded-full blur-3xl" />
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

        {/* Empty State - Enhanced for new users */}
        {activeShipments.length === 0 && (
          <motion.section variants={itemVariants}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-border via-muted to-border p-[1px] shadow-lg">
              <div className="relative rounded-3xl bg-card overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent" />
                <div className="relative p-8 sm:p-12">
                  <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-coke-red/10 flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-coke-red" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 font-typewriter">No Active Shipments</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {isInternational
                        ? "You're all set to ship medicines, documents, or gifts to 150+ countries. Here's what you can do:"
                        : "Book a domestic shipment to get started. Here's what you can do:"}
                    </p>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                    <QuickActionCard
                      icon={Airplane}
                      title="Create a Shipment"
                      description="Ship medicines, documents, or gifts internationally"
                      href="/new-shipment"
                      color="bg-coke-red/10 text-coke-red"
                    />
                    <QuickActionCard
                      icon={Calculator}
                      title="Check Rates"
                      description="Get instant pricing for your shipment"
                      href="/rate-calculator"
                      color="bg-blue-500/10 text-blue-600"
                    />
                    <QuickActionCard
                      icon={FolderOpen}
                      title="Save Addresses"
                      description="Add frequently used addresses to your vault"
                      href="/vault"
                      color="bg-amber-500/10 text-amber-600"
                    />
                    <QuickActionCard
                      icon={Wallet}
                      title="Add Wallet Balance"
                      description="Top up your wallet for faster checkout"
                      href="/wallet"
                      color="bg-green-500/10 text-green-600"
                    />
                    <QuickActionCard
                      icon={ShieldCheck}
                      title="Complete KYC"
                      description="Unlock lower rates and full account features"
                      href="/auth/kyc"
                      color="bg-purple-500/10 text-purple-600"
                    />
                    <QuickActionCard
                      icon={Question}
                      title="Help & Support"
                      description="Get answers to common shipping questions"
                      href="/support"
                      color="bg-muted-foreground/10 text-muted-foreground"
                    />
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={() => router.push('/new-shipment')}
                      className="bg-coke-red hover:bg-coke-red/90 text-white rounded-full px-8 py-3 text-base font-semibold"
                    >
                      Create New Shipment
                    </Button>
                  </div>
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

        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
};

export default Index;
