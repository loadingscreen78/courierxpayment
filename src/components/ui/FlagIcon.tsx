"use client";

import * as Flags from 'country-flag-icons/react/3x2';
import type { FlagComponent } from 'country-flag-icons/react/3x2';

interface FlagIconProps {
  code: string;
  className?: string;
}

export function FlagIcon({ code, className = "w-5 h-3.5 rounded-sm object-cover" }: FlagIconProps) {
  const Flag = (Flags as unknown as Record<string, FlagComponent>)[code.toUpperCase()];
  if (!Flag) return <span className="inline-block w-5 h-3.5 rounded-sm bg-muted" />;
  return <Flag className={className} />;
}
