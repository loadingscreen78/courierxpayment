'use client';

import { Mail, Phone, ExternalLink, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

const PHONE_EAST = '+917008368628';
const PHONE_WEST = '+918484050057';
const SUPPORT_EMAIL = 'info@courierx.in';

const contactOptions = [
  {
    icon: Phone,
    title: 'East India Support',
    description: 'Speak directly with our Eastern India team',
    actionLabel: 'Call Now',
    type: 'phone' as const,
    phone: PHONE_EAST,
    displayPhone: '+91 7008368628',
    available: '10 AM - 8 PM IST',
    accent: true,
  },
  {
    icon: Phone,
    title: 'West India Support',
    description: 'Speak directly with our Western India team',
    actionLabel: 'Call Now',
    type: 'phone' as const,
    phone: PHONE_WEST,
    displayPhone: '+91 8484050057',
    available: '10 AM - 8 PM IST',
    accent: false,
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Detailed queries and documentation requests',
    actionLabel: 'Send Email',
    type: 'email' as const,
    phone: null,
    displayPhone: SUPPORT_EMAIL,
    available: 'Always available',
    accent: false,
  },
];

function PhoneCard({ option }: { option: typeof contactOptions[0] }) {
  const [copied, setCopied] = useState(false);

  const handleCallNow = async () => {
    if (!option.phone) return;

    // 1. Copy number to clipboard
    try {
      await navigator.clipboard.writeText(option.displayPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(`Number copied: ${option.displayPhone}`);
    } catch {
      // clipboard may be blocked — still open WhatsApp
    }

    // 2. Open WhatsApp chat (works on both mobile and desktop)
    const waNumber = option.phone.replace('+', '');
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Hi, I need support with my CourierX shipment.')}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${option.accent ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${option.accent ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <option.icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-base font-mono">{option.title}</CardTitle>
        <CardDescription className="text-sm">{option.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{option.available}</p>
          <p className="font-medium text-foreground">{option.displayPhone}</p>
        </div>
        <Button
          onClick={handleCallNow}
          className="w-full gap-2"
          variant={option.accent ? 'default' : 'outline'}
        >
          {copied ? <Check className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          {copied ? 'Number Copied!' : option.actionLabel}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Opens WhatsApp · Number copied to clipboard
        </p>
      </CardContent>
    </Card>
  );
}

function EmailCard({ option }: { option: typeof contactOptions[0] }) {
  const handleEmail = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support Request — CourierX')}`;
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-muted">
          <option.icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-base font-mono">{option.title}</CardTitle>
        <CardDescription className="text-sm">{option.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{option.available}</p>
          <p className="font-medium text-foreground">{option.displayPhone}</p>
        </div>
        <Button onClick={handleEmail} className="w-full gap-2" variant="outline">
          <Mail className="h-4 w-4" />
          {option.actionLabel}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Opens your email app
        </p>
      </CardContent>
    </Card>
  );
}

export function ContactSection() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold font-mono text-foreground">Get in Touch</h3>
        <p className="text-muted-foreground text-sm">
          Choose your preferred way to reach us. Our support team is here to help.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {contactOptions.map((option) =>
          option.type === 'phone'
            ? <PhoneCard key={option.title} option={option} />
            : <EmailCard key={option.title} option={option} />
        )}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            For fastest resolution, have your <span className="font-medium text-foreground">Tracking Number</span> or{' '}
            <span className="font-medium text-foreground">Booking ID</span> ready when contacting support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
