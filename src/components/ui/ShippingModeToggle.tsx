'use client';

import { motion } from 'framer-motion';
import { useShippingMode } from '@/contexts/ShippingModeContext';
import { cn } from '@/lib/utils';

interface ShippingModeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ShippingModeToggle = ({ compact = false, className }: ShippingModeToggleProps) => {
  const { mode, toggleMode, isSwitching } = useShippingMode();
  const isInternational = mode === 'international';

  const h = compact ? 'h-9' : 'h-10';
  const thumbH = compact ? 'h-7' : 'h-8';
  const thumbW = compact ? 'w-9' : 'w-10';

  if (compact) {
    return (
      <div className={cn(
        'relative flex items-center gap-1 rounded-2xl border px-1 transition-all duration-300 select-none',
        isSwitching && 'opacity-60 pointer-events-none',
        h,
        'bg-muted border-border shadow-md',
        className
      )}>
        {/* INTL side */}
        <button
          onClick={() => { if (!isInternational) toggleMode(); }}
          disabled={isSwitching}
          aria-label="Switch to international mode"
          aria-pressed={isInternational}
          className={cn(
            'relative flex items-center justify-center rounded-xl transition-all duration-300',
            thumbH, thumbW,
            isInternational
              ? 'bg-gradient-to-br from-coke-red to-red-700 shadow-lg shadow-coke-red/25 cursor-default'
              : 'bg-transparent hover:bg-muted-foreground/10 cursor-pointer'
          )}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            className={cn('transition-colors duration-300', isInternational ? 'text-white' : 'text-muted-foreground/40')}
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 3c0 0-3.5 4-3.5 9s3.5 9 3.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 3c0 0 3.5 4 3.5 9s-3.5 9-3.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* DOM side */}
        <button
          onClick={() => { if (isInternational) toggleMode(); }}
          disabled={isSwitching}
          aria-label="Switch to domestic mode"
          aria-pressed={!isInternational}
          className={cn(
            'relative flex items-center justify-center rounded-xl transition-all duration-300',
            thumbH, thumbW,
            !isInternational
              ? 'bg-gradient-to-br from-coke-red to-red-700 shadow-lg shadow-coke-red/25 cursor-default'
              : 'bg-transparent hover:bg-muted-foreground/10 cursor-pointer'
          )}
        >
          <svg width="13" height="15" viewBox="0 0 20 24" fill="none"
            className={cn('transition-colors duration-300', !isInternational ? 'text-white' : 'text-muted-foreground/40')}
          >
            <path d="M10 2C6.13 2 3 5.13 3 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="10" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
          </svg>
        </button>
      </div>
    );
  }

  // Full size with labels — each side is independently clickable
  return (
    <div className={cn(
      'relative flex items-center gap-1 rounded-2xl border px-2 py-1.5 transition-all duration-300 select-none',
      'bg-muted border-border shadow-md',
      isSwitching && 'opacity-60 pointer-events-none',
      className
    )}>
      {/* International side */}
      <button
        onClick={() => { if (!isInternational) toggleMode(); }}
        disabled={isSwitching}
        aria-label="Switch to international mode"
        aria-pressed={isInternational}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-300',
          isInternational ? 'cursor-default' : 'hover:bg-muted-foreground/10 cursor-pointer'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
          isInternational
            ? 'bg-gradient-to-br from-coke-red to-red-700 shadow-lg shadow-coke-red/25'
            : 'bg-transparent'
        )}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            className={cn('transition-colors duration-300', isInternational ? 'text-white' : 'text-muted-foreground/40')}
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 3c0 0-3.5 4-3.5 9s3.5 9 3.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 3c0 0 3.5 4 3.5 9s-3.5 9-3.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <span className={cn(
          'text-xs font-medium transition-colors duration-300',
          isInternational ? 'text-foreground' : 'text-muted-foreground'
        )}>
          International
        </span>
      </button>

      <div className="h-6 w-px bg-border" />

      {/* Domestic side */}
      <button
        onClick={() => { if (isInternational) toggleMode(); }}
        disabled={isSwitching}
        aria-label="Switch to domestic mode"
        aria-pressed={!isInternational}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-300',
          !isInternational ? 'cursor-default' : 'hover:bg-muted-foreground/10 cursor-pointer'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
          !isInternational
            ? 'bg-gradient-to-br from-coke-red to-red-700 shadow-lg shadow-coke-red/25'
            : 'bg-transparent'
        )}>
          <svg width="12" height="14" viewBox="0 0 20 24" fill="none"
            className={cn('transition-colors duration-300', !isInternational ? 'text-white' : 'text-muted-foreground/40')}
          >
            <path d="M10 2C6.13 2 3 5.13 3 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="10" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
          </svg>
        </div>
        <span className={cn(
          'text-xs font-medium transition-colors duration-300',
          !isInternational ? 'text-foreground' : 'text-muted-foreground'
        )}>
          Domestic
        </span>
      </button>
    </div>
  );
};
