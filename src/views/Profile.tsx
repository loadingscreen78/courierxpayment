import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AccountTab } from '@/components/profile/AccountTab';
import { PreferencesTab } from '@/components/profile/PreferencesTab';
import { NotificationsTab } from '@/components/profile/NotificationsTab';
import { SecurityTab } from '@/components/profile/SecurityTab';
import { AnimatedTabContent } from '@/components/ui/loading/AnimatedTabContent';
import {
  AccountTabSkeleton,
  PreferencesTabSkeleton,
  NotificationsTabSkeleton,
  SecurityTabSkeleton,
} from '@/components/profile/skeletons';
import { useHaptics } from '@/hooks/useHaptics';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('account');
  const { lightTap } = useHaptics();

  const handleTabChange = (value: string) => {
    lightTap();
    setActiveTab(value);
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6 animate-fade-in">
        <ProfileHeader />
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full flex overflow-x-auto scrollbar-hide bg-muted/50 h-auto p-1">
            <TabsTrigger value="account" className="data-[state=active]:bg-background flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-4">
              Account
            </TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-background flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-4">
              Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-4">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background flex-1 min-w-fit text-xs sm:text-sm px-2 sm:px-4">
              Security
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="mt-6">
            <AnimatedTabContent tabKey={`account-${activeTab}`} skeleton={<AccountTabSkeleton />}>
              <AccountTab />
            </AnimatedTabContent>
          </TabsContent>
          
          <TabsContent value="preferences" className="mt-6">
            <AnimatedTabContent tabKey={`preferences-${activeTab}`} skeleton={<PreferencesTabSkeleton />}>
              <PreferencesTab />
            </AnimatedTabContent>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <AnimatedTabContent tabKey={`notifications-${activeTab}`} skeleton={<NotificationsTabSkeleton />}>
              <NotificationsTab />
            </AnimatedTabContent>
          </TabsContent>
          
          <TabsContent value="security" className="mt-6">
            <AnimatedTabContent tabKey={`security-${activeTab}`} skeleton={<SecurityTabSkeleton />}>
              <SecurityTab />
            </AnimatedTabContent>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
