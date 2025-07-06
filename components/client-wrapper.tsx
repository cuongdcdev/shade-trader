"use client";

import React, { ReactNode } from 'react';
import { NearAuthProvider } from '@/hooks/use-near-auth';
import OrderProcessorInitializer from '@/components/order-processor-initializer';
import { Toaster } from "@/components/ui/toaster";

interface ClientWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function ClientWrapper({ children, className }: ClientWrapperProps) {
  return (
    <NearAuthProvider>
      <div className={`min-h-screen bg-background ${className || ''}`}>
        <OrderProcessorInitializer />
        {children}
        <Toaster />
      </div>
    </NearAuthProvider>
  );
}
