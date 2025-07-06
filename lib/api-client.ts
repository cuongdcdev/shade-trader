
// Dynamically import wallet selector modules to avoid SSR issues
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
const crypto = require('crypto'); // Use Node.js crypto for compatibility
import {
  BalanceResponse,
  CreateOrderRequest,
  Order,
  PaginationInfo
} from '@/types/api';
import { UserConfig } from '@/types/user-config';

// Type definitions for NEAR wallet selector
interface SignedMessage {
  accountId: string;
  publicKey: string;
  signature: string;
}

interface WalletSelector {
  wallet: (walletId: string) => Promise<{
    signMessage: (options: {
      message: string;
      recipient: string;
      nonce: Uint8Array;
      callbackUrl?: string;
    }) => Promise<SignedMessage | null>;
  }>;
}

// Function to get NEAR wallet authentication headers
async function getNearAuthHeaders() {
  try {
    // If we're on the server, just return empty headers
    if (typeof window === 'undefined') {
      return {};
    }

    // Check if we have stored auth info
    const storedAuthInfo = localStorage.getItem('nearAuthInfo');
    if (storedAuthInfo) {
      return JSON.parse(storedAuthInfo);
    }

    // If no stored auth info, return empty headers
    return {};
  } catch (error) {
    console.error('Error getting NEAR auth headers:', error);
    return {};
  }
}

// Function to sign a message with NEAR wallet
export async function signWithNearWallet() {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return null;
    }


    // Setup wallet selector
    const walletSelector = await setupWalletSelector({
      network: 'mainnet',
      modules: [setupMeteorWallet()],
      fallbackRpcUrls: ['https://free.rpc.fastnear.com', 'https://near.lava.build']
    });

    // Generate a nonce
    const nonce = await crypto.randomBytes(32); // Use crypto.randomBytes for Node.js compatibility

    // Create message for signing
    const message = "Authenticate with NEAR Wallet";
    const recipient = "near_limit_order_app";

    // Request NEAR wallet to sign
    const wallet = await walletSelector.wallet("meteor-wallet");
    const signedMsg = await wallet.signMessage({
      message: message,
      recipient: recipient,
      nonce: nonce,
    });

    if (!signedMsg) {
      console.log("User cancelled signing");
      return null;
    }

    // Create auth headers
    const authHeaders = {
      'x-near-account-id': signedMsg.accountId,
      'x-near-public-key': signedMsg.publicKey,
      'x-near-signature': signedMsg.signature,
      'x-near-message': message,
      'x-near-recipient': recipient,
      'x-near-nonce': btoa(String.fromCharCode.apply(null, Array.from(nonce))) // Use btoa instead of Buffer
    };

    // Store auth info for future requests
    localStorage.setItem('nearAuthInfo', JSON.stringify(authHeaders));

    return authHeaders;
  } catch (error) {
    console.error('Error signing with NEAR wallet:', error);
    throw error;
  }
}

// API client for interacting with NEAR Intents Limit Order API
export const apiClient = {
  // Create a new order
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      return data.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Cancel an order
  async cancelOrder(orderId: string): Promise<{ orderId: string; status: string; cancelledAt?: string }> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel order');
      }

      return data.data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },


  // Get user orders
  async getUserOrders(
    status?: string,
    token?: string,
    page: number = 1,
    limit: number = 9999
  ): Promise<{ orders: Order[]; pagination: PaginationInfo }> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (token) params.append('token', token);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user orders');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  },

  // Get user balance
  async getUserBalance(): Promise<BalanceResponse> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch('/api/intents-balance', {
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user balance');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw error;
    }
  },

  // Get all orders (public endpoint)
  async getAllOrders(
    status: string = 'Open',
    token?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: Order[]; pagination: PaginationInfo }> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (token) params.append('token', token);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/orders/all?${params.toString()}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get all orders');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting all orders:', error);
      throw error;
    }
  },

  // Get user configuration
  async getUserConfig(): Promise<UserConfig> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch('/api/user-config', {
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user configuration');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting user configuration:', error);
      throw error;
    }
  },

  // Update user configuration
  async updateUserConfig(configData: Partial<UserConfig>): Promise<UserConfig> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch('/api/user-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(configData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user configuration');
      }

      return data.data;
    } catch (error) {
      console.error('Error updating user configuration:', error);
      throw error;
    }
  },

  // Delete user configuration
  async deleteUserConfig(): Promise<{ success: boolean }> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch('/api/user-config', {
        method: 'DELETE',
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user configuration');
      }

      return data.data;
    } catch (error) {
      console.error('Error deleting user configuration:', error);
      throw error;
    }
  },

  // Get user live Intents balance
  async getIntentsBalance(): Promise<Array<{ symbol: string, balance: string, intents_token_id: string }>> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch('/api/intents-balance', {
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get Intents balance');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting Intents balance:', error);
      throw error;
    }
  },
  
  // Get deposit address for specific chain
  async getDepositAddress(chain: string): Promise<string> {
    try {
      // Get auth headers, will prompt for signature if not available
      let authHeaders = await getNearAuthHeaders();
      if (!Object.keys(authHeaders).length) {
        authHeaders = await signWithNearWallet();
        if (!authHeaders) {
          throw new Error('NEAR wallet authentication required');
        }
      }

      const response = await fetch(`/api/deposit-address?chain=${encodeURIComponent(chain)}`, {
        headers: authHeaders
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get deposit address');
      }

      return data.address;
    } catch (error) {
      console.error('Error getting deposit address:', error);
      throw error;
    }
  }
};
