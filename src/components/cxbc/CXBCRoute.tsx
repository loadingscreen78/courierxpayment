"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCXBCAuth } from '@/hooks/useCXBCAuth';
import { Loader2, Store, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CXBCRouteProps {
  children: ReactNode;
}

export const CXBCRoute = ({ children }: CXBCRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading, isApprovedPartner, applicationStatus, error } = useCXBCAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/partner/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying partner access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isApprovedPartner) {
    const isAlreadyPartner = applicationStatus !== null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Partner Access Required</CardTitle>
            <CardDescription>
              {isAlreadyPartner
                ? 'Your partner application is being reviewed. Login to the CXBC panel to check your status.'
                : 'You need to be an approved CXBC partner to access this portal.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAlreadyPartner ? (
              <Button asChild className="w-full">
                <Link href="/partner/login">Login to CXBC Panel</Link>
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/cxbc/apply">Apply to Become a Partner</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
