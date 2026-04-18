import { ReactNode } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { PageTransition } from '@/components/ui/loading/PageTransition';
import { ModeSwitchLoader } from '@/components/ui/ModeSwitchLoader';
import { useShippingMode } from '@/contexts/ShippingModeContext';
import { OnboardingTourPanel } from '@/components/onboarding/OnboardingTourPanel';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { mode, isSwitching } = useShippingMode();

  return (
    <div className="min-h-screen bg-background">
      {/* Global mode switch loader — fixed full-screen, always at root */}
      <ModeSwitchLoader visible={isSwitching} targetMode={mode} />

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <DesktopSidebar />
        {/* Content with left margin to account for fixed sidebar */}
        <div className="flex-1 flex flex-col min-h-screen ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 pb-28 overflow-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <MobileNav />
      </div>

      {/* Onboarding Tour Panel (desktop only, floats above content) */}
      <OnboardingTourPanel />
    </div>
  );
};
