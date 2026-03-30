"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Globe, Truck, ArrowLeft, UserPlus, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const shippingModes = [
  {
    id: 'international',
    title: 'International Shipping',
    description: 'Send medicines, documents, gifts & personal items to 150+ countries worldwide',
    icon: Globe,
    href: '/public/book/international',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'hover:border-blue-400 dark:hover:border-blue-700',
    tags: ['Medicine', 'Document', 'Gift', 'Personal'],
  },
  {
    id: 'domestic',
    title: 'Domestic Shipping',
    description: 'Ship documents and gifts anywhere within India with top courier partners',
    icon: Truck,
    href: '/public/book/domestic',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'hover:border-green-400 dark:hover:border-green-700',
    tags: ['Document', 'Gift', 'Parcel'],
  },
];

export default function PublicBookPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              alt="CourierX"
              src="/logo.svg"
              className="h-7 sm:h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/auth')} className="rounded-xl text-xs sm:text-sm px-2 sm:px-3">
              Sign In
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/open-account')} className="rounded-xl text-xs sm:text-sm gap-1 sm:gap-1.5 px-2 sm:px-3">
              <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Open Account — Save 52%</span>
              <span className="sm:hidden">Save 52%</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-6 sm:py-12 px-3 sm:px-4 space-y-5 sm:space-y-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Ship Now</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">No account needed. Get an instant rate and book your shipment.</p>
          </div>
        </div>

        {/* One-time service notice */}
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/50 p-4 flex gap-3">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" weight="fill" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">This is a one-time shipping service</p>
            <p className="text-amber-700/80 dark:text-amber-400/70 mt-1">
              Standard rates apply for guest shipments. For <span className="font-semibold">52% discounted rates</span>, wallet payments, shipment tracking dashboard, and other account benefits —{' '}
              <button onClick={() => router.push('/open-account')} className="text-coke-red hover:underline font-semibold">
                open a free account
              </button>.
            </p>
          </div>
        </div>

        {/* International vs Domestic */}
        <div className="grid gap-4">
          {shippingModes.map((mode, i) => (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              onClick={() => router.push(mode.href)}
              className={`text-left p-4 sm:p-6 rounded-xl border border-border ${mode.borderColor} transition-all duration-200 hover:shadow-lg group`}
            >
              <div className="flex items-start gap-3 sm:gap-5">
                <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl ${mode.bgColor} flex items-center justify-center shrink-0`}>
                  <mode.icon className={`h-5 w-5 sm:h-7 sm:w-7 ${mode.color}`} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg mb-1 group-hover:text-coke-red transition-colors">{mode.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{mode.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mode.tags.map(tag => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
