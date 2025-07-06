"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signWithNearWallet } from '@/lib/api-client';

interface NearAuthContextType {
  isAuthenticated: boolean;
  accountId: string | null;
  authenticate: () => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const NearAuthContext = createContext<NearAuthContextType>({
  isAuthenticated: false,
  accountId: null,
  authenticate: async () => false,
  logout: () => {},
  isLoading: false,
});

export const useNearAuth = () => useContext(NearAuthContext);

interface NearAuthProviderProps {
  children: ReactNode;
}

export const NearAuthProvider: React.FC<NearAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for stored authentication on mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      if (typeof window === 'undefined') return;

      try {
        const storedAuthInfo = localStorage.getItem('nearAuthInfo');
        if (storedAuthInfo) {
          const authInfo = JSON.parse(storedAuthInfo);
          setAccountId(authInfo['x-near-account-id'] || null);
          setIsAuthenticated(!!authInfo['x-near-account-id']);
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
      }
    };

    checkStoredAuth();
  }, []);

  const authenticate = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const authHeaders = await signWithNearWallet();
      if (!authHeaders) {
        setIsLoading(false);
        return false;
      }
      
      setAccountId(authHeaders['x-near-account-id']);
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('nearAuthInfo');
    setIsAuthenticated(false);
    setAccountId(null);
  };

  return (
    <NearAuthContext.Provider value={{ isAuthenticated, accountId, authenticate, logout, isLoading }}>
      {children}
    </NearAuthContext.Provider>
  );
};
