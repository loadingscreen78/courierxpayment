import { useState } from 'react';
import { Question, Ticket, ChatCircle, BookOpen } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FAQSection, ContactSection, KnowledgeBase, TicketList } from '@/components/support';
import { useSeo } from '@/hooks/useSeo';

export default function Support() {
  useSeo({
    title: 'Help & Support | CourierX',
    description: 'Get help with your CourierX shipments. Browse FAQs, create support tickets, or contact our team.',
  });

  const [activeTab, setActiveTab] = useState('faq');

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-mono text-foreground">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <Question size={16} weight="bold" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <Ticket size={16} weight="bold" />
              <span className="hidden sm:inline">My Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <ChatCircle size={16} weight="bold" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <BookOpen size={16} weight="bold" />
              <span className="hidden sm:inline">Guides</span>
            </TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="faq" className="mt-0">
                <FAQSection />
              </TabsContent>

              <TabsContent value="tickets" className="mt-0">
                <TicketList />
              </TabsContent>

              <TabsContent value="contact" className="mt-0">
                <ContactSection />
              </TabsContent>

              <TabsContent value="knowledge" className="mt-0">
                <KnowledgeBase />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </AppLayout>
  );
}
