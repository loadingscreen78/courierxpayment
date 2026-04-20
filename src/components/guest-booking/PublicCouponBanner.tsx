"use client";

import { Tag, CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { feedbackPresets } from '@/lib/haptics';

interface PublicCouponBannerProps {
  onApply: (code: string) => void;
  isApplied: boolean;
  isLoading: boolean;
}

export function PublicCouponBanner({ onApply, isApplied, isLoading }: PublicCouponBannerProps) {
  if (isApplied) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Tag className="h-4 w-4 text-muted-foreground" weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          Use code{' '}
          <span className="font-mono font-semibold text-foreground">WELCOME10</span>
          {' '}for 10% off
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { feedbackPresets.tap(); onApply('WELCOME10'); }}
        disabled={isLoading}
        className="shrink-0 h-8 text-xs"
      >
        {isLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
      </Button>
    </div>
  );
}
