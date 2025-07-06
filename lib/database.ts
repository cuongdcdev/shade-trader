import { Order, TokenBalance } from '@/types/api';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

// File paths for data storage
const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial mock data for orders
const initialOrders: Order[] = [
  {
    orderId: 'ord_12345abcde',
    createdAt: '2025-06-30T15:30:00Z',
    status: 'Open',
    user: 'near_1a2b3c...7z',
    conditions: [
      {
        token: 'NEAR',
        metric: 'price',
        operator: '<',
        value: '3.00'
      }
    ],
    action: {
      type: 'Buy',
      amount: '100',
      token: 'NEAR'
    },
    settings: {
      telegramNotification: true,
      expiresAt: '2025-07-05T15:30:00Z'
    }
  },
  {
    orderId: 'ord_67890fghij',
    createdAt: '2025-06-29T10:15:00Z',
    status: 'Executed',
    user: 'near_1a2b3c...7z',
    filledAt: '2025-06-29T14:30:00Z',
    conditions: [
      {
        token: 'XRP',
        metric: 'price',
        operator: '>',
        value: '0.50'
      }
    ],
    action: {
      type: 'Sell',
      amount: '500',
      token: 'XRP'
    },
    settings: {
      telegramNotification: true,
      expiresAt: '2025-07-06T10:15:00Z'
    }
  },
  {
    orderId: 'ord_54321edcba',
    createdAt: '2025-06-30T14:45:00Z',
    status: 'Open',
    user: 'near_7z6y5x...1a',
    conditions: [
      {
        metric: 'btc_dom',
        operator: '>',
        value: '50'
      }
    ],
    action: {
      type: 'Sell',
      amount: '200',
      token: 'DOGE'
    },
    settings: {
      telegramNotification: false,
      expiresAt: '2025-07-03T14:45:00Z'
    }
  }
];

// Initial mock data for user balances
const initialBalances: Record<string, TokenBalance[]> = {
  'near_1a2b3c...7z': [
    { symbol: 'USDT', balance: '1.793181', asset_id: 'nep141:usdt.tether-token.near' },
    { symbol: 'BTC', balance: '0.00000927', asset_id: 'nep141:btc.omft.near' },
    { symbol: 'NEAR', balance: '15.25', asset_id: 'near' }
  ],
  'near_7z6y5x...1a': [
    { symbol: 'USDT', balance: '53.42', asset_id: 'nep141:usdt.tether-token.near' },
    { symbol: 'DOGE', balance: '300.75', asset_id: 'nep141:doge.omft.near' }
  ]
};

// Initialize the data files if they don't exist
if (!fs.existsSync(ORDERS_FILE)) {
  console.log('Creating initial orders file...');
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(initialOrders, null, 2));
}

if (!fs.existsSync(BALANCES_FILE)) {
  console.log('Creating initial balances file...');
  fs.writeFileSync(BALANCES_FILE, JSON.stringify(initialBalances, null, 2));
}

// Helper functions to read and write data
const readOrders = (): Order[] => {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders file:', error);
    return [];
  }
};

const writeOrders = (orders: Order[]): void => {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error writing orders file:', error);
  }
};

const readBalances = (): Record<string, TokenBalance[]> => {
  try {
    const data = fs.readFileSync(BALANCES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading balances file:', error);
    return {};
  }
};

const writeBalances = (balances: Record<string, TokenBalance[]>): void => {
  try {
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
  } catch (error) {
    console.error('Error writing balances file:', error);
  }
};

// Database operations
export const Database = {
  // Order operations
  createOrder: (order: Omit<Order, 'orderId' | 'createdAt' | 'status'>, user: string): Order => {
    const orders = readOrders();
    
    const now = new Date();
    // Set a default expiry of 7 days
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newOrder: Order = {
      ...order,
      orderId: `ord_${uuidv4().substring(0, 10)}`,
      createdAt: now.toISOString(),
      status: 'Open',
      user,
      settings: {
        ...order.settings,
        expiresAt: expiresAt.toISOString()
      }
    };

    orders.push(newOrder);
    writeOrders(orders);
    return newOrder;
  },

  cancelOrder: (orderId: string, user: string): Order | null => {
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o.orderId === orderId && o.user === user);
    
    if (orderIndex === -1) return null;
    
    const now = new Date();
    orders[orderIndex] = {
      ...orders[orderIndex],
      status: 'Cancelled',
      cancelledAt: now.toISOString()
    };
    
    writeOrders(orders);
    return orders[orderIndex];
  },

  updateOrderStatus: (orderId: string, status: any, additionalData: Record<string, any> = {}): Order | null => {
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o.orderId === orderId);
    
    if (orderIndex === -1) return null;
    
    orders[orderIndex] = {
      ...orders[orderIndex],
      status,
      ...additionalData
    };
    
    writeOrders(orders);
    return orders[orderIndex];
  },

  getOrdersByStatus: (status: string): Order[] => {
    const orders = readOrders();
    return orders.filter(o => o.status === status);
  },

  getUserOrders: (
    user: string, 
    status?: string, 
    token?: string, 
    page: number = 1, 
    limit: number = 999
  ) => {
    const orders = readOrders();
    
    // First filter by user - make sure we get all orders where the user field matches
    // Normalize user check to handle various user ID formats
    let filteredOrders = orders.filter(o => o.user === user);
    
    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status);
    }
    
    if (token) {
      filteredOrders = filteredOrders.filter(o => o.action.token === token);
    }
    
    const total = filteredOrders.length;
    const pages = Math.ceil(total / limit);
    
    const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);
    
    return {
      orders: paginatedOrders,
      pagination: {
        total,
        limit,
        page,
        pages
      }
    };
  },

  getAllOrders: (
    status: string = 'Open', 
    token?: string, 
    page: number = 1, 
    limit: number = 20
  ) => {
    const orders = readOrders();
    let filteredOrders = orders;
    
    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status);
    }
    
    if (token) {
      filteredOrders = filteredOrders.filter(o => o.action.token === token);
    }
    
    const total = filteredOrders.length;
    const pages = Math.ceil(total / limit);
    
    const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);
    
    return {
      orders: paginatedOrders,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    };
  },

  getOrder: (orderId: string, user?: string): Order | null => {
    const orders = readOrders();
    const order = orders.find(o => o.orderId === orderId);
    
    if (!order) return null;
    
    if (user && order.user !== user) return null;
    
    return order;
  },

  // Balance operations
  getUserBalance: (user: string) => {
    const balances = readBalances();
    
    return {
      balances: balances[user] || [],
      lastUpdated: new Date().toISOString()
    };
  },
  
  // For testing and development
  resetToInitialData: () => {
    writeOrders(initialOrders);
    writeBalances(initialBalances);
    return { success: true };
  }
};
