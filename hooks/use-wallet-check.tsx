"use client";

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function useWalletCheck() {
  const [isWalletConfigured, setIsWalletConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function checkWalletConfiguration() {
      try {
        setIsLoading(true);
        const config = await apiClient.getUserConfig();
        
        // Check if wallet address and private key exist
        const isConfigured = !!(
          config?.wallet?.address && 
          config?.wallet?.privateKey
        );
        
        setIsWalletConfigured(isConfigured);
      } catch (error: any) {
        console.error("Failed to check wallet configuration:", error);
        setIsWalletConfigured(false);
        
        // If user config doesn't exist, redirect to settings
        if (error.message?.includes("not found")) {
          toast({
            title: "Wallet setup required",
            description: "Please configure your WALLET ADDRESS AND PRIVATE KEY before creating orders.",
            variant: "destructive"
          });
          router.push('/settings');
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkWalletConfiguration();
  }, [router, toast]);

  return { isWalletConfigured, isLoading };
}