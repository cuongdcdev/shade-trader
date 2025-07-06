// types/custom.d.ts
import { ReactNode } from 'react';

// Order types for the UI
export interface Order {
  id: string;
  user?: string;
  token: string;
  action: string;
  trigger?: string;
  condition?: string;
  status: 'Open' | 'Executed' | 'Cancelled';
  createdAt: string;
}

// Condition types for form input
export interface Condition {
  id: number;
  token: string;
  metric: string;
  operator: string;
  value: string;
}

// API Condition types (matching the API schema)
export interface ApiCondition {
  token?: string;
  metric: 'price' | 'btc_dom' | 'vol_24h' | 'market_cap';
  operator: '<' | '>' | '=' | '<=' | '>=';
  value: string;
}

// Action types
export interface TradeAction {
  type: "Buy" | "Sell";
  amount: string;
  token: string;
}

// Settings types
export interface OrderSettings {
  telegramNotification: boolean;
}

// Wallet types
export interface WalletSettings {
  address: string;
  privateKey: string;
}

// Notification types
export interface NotificationSettings {
  telegramId: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
}

// Component prop types
export interface CommonLayoutProps {
  children: ReactNode;
  title?: string;
}
