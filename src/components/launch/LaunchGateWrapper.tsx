'use client';

import { LaunchGate } from './LaunchGate';

export function LaunchGateWrapper({ children }: { children: React.ReactNode }) {
  return <LaunchGate>{children}</LaunchGate>;
}
