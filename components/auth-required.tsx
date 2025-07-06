"use client";

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNearAuth } from '@/hooks/use-near-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AuthRequiredProps {
  children: ReactNode;
}

const AuthRequired: React.FC<AuthRequiredProps> = ({ children }) => {
  const { isAuthenticated, authenticate, isLoading } = useNearAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md p-6">
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-2xl font-bold text-center">Authentication Required</h2>
            <p className="text-center text-muted-foreground">
              You need to connect your NEAR wallet to access this page.
            </p>
            <Button onClick={() => authenticate()} className="w-full">
              Connect NEAR Wallet
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              Go Back Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRequired;
