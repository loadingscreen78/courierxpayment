"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, FileText, Plus, CaretRight } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedTabContent } from '@/components/ui/loading/AnimatedTabContent';
import { AddressesTabSkeleton, DocumentsTabSkeleton } from '@/components/vault/skeletons';
import { useAddresses, type Address } from '@/hooks/useAddresses';

const AddressPreviewCard = ({ address }: { address: Address }) => {
  const router = useRouter();
  
  return (
    <div 
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
      onClick={() => router.push('/addresses')}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm capitalize flex items-center gap-2">
            {address.label}
            {address.is_default && (
              <Badge variant="outline" className="text-xs">Default</Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
            {address.address_line_1}, {address.city}
          </p>
        </div>
      </div>
              <CaretRight size={16} weight="bold" className="text-muted-foreground" />
    </div>
  );
};

const MyVault = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('addresses');
  const { addresses, loading: addressesLoading } = useAddresses();

  const pickupAddresses = addresses.filter(a => a.type === 'pickup').slice(0, 3);
  const deliveryAddresses = addresses.filter(a => a.type === 'delivery').slice(0, 3);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-typewriter font-bold">My Vault</h1>
          <p className="text-muted-foreground">Manage your saved addresses and documents</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin size={16} weight="bold" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText size={16} weight="bold" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="addresses">
            <AnimatedTabContent tabKey={activeTab}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Saved Addresses</CardTitle>
                    <CardDescription>Your frequently used recipient addresses</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 text-white shadow-lg shadow-[#FF2D2D]/30"
                    onClick={() => router.push('/vault/add-address')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addressesLoading ? (
                    <AddressesTabSkeleton />
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
          <MapPin size={48} weight="bold" className="mx-auto mb-4 opacity-30" />
                      <p>No saved addresses yet</p>
                      <p className="text-sm mb-4">Add addresses for quick checkout</p>
                      <Button 
                        className="bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 text-white shadow-lg shadow-[#FF2D2D]/30"
                        onClick={() => router.push('/vault/add-address')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Address
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Pickup Addresses */}
                      {pickupAddresses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Pickup Addresses
                          </p>
                          {pickupAddresses.map((address) => (
                            <AddressPreviewCard key={address.id} address={address} />
                          ))}
                        </div>
                      )}
                      
                      {/* Delivery Addresses */}
                      {deliveryAddresses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Delivery Addresses
                          </p>
                          {deliveryAddresses.map((address) => (
                            <AddressPreviewCard key={address.id} address={address} />
                          ))}
                        </div>
                      )}
                      
                      {addresses.length > 6 && (
                        <Button 
                          variant="ghost" 
                          className="w-full" 
                          onClick={() => router.push('/addresses')}
                        >
                          View all {addresses.length} addresses
                          <CaretRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </AnimatedTabContent>
          </TabsContent>

          <TabsContent value="documents">
            <AnimatedTabContent tabKey={activeTab}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <CardDescription>Your uploaded documents from bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={40} weight="bold" className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Documents will appear here</p>
                    <p className="text-xs">Prescriptions, IDs, and invoices from bookings</p>
                  </div>
                </CardContent>
              </Card>
            </AnimatedTabContent>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MyVault;
