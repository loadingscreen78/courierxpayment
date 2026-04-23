"use client";

import * as Flags from 'country-flag-icons/react/3x2';

interface FlagIconProps {
  code: string;
  className?: string;
}

export function FlagIcon({ code, className = "w-5 h-3.5 rounded-sm object-cover" }: FlagIconProps) {
  const Flag = (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[code.toUpperCase()];
  if (!Flag) return <span className="inline-block w-5 h-3.5 rounded-sm bg-muted" />;
  return <Flag className={className} />;
}
