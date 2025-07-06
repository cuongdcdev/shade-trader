export type Condition = {
  token?: string;
  metric: 'price' | 'btc_dom' | 'vol_24h' | 'market_cap';
  operator: '<' | '>' | '=' | '<=' | '>=';
  value: string;
};

export type OrderAction = {
  type: 'Buy' | 'Sell';
  amount: string;
  token: string;
};

export type OrderSettings = {
  telegramNotification: boolean;
  expiresAt?: string;
};

export type Order = {
  orderId: string;
  createdAt: string;
  status: 'Open' | 'Executed' | 'Cancelled' | 'Expired';
  user?: string;
  conditions: Condition[];
  action: OrderAction;
  settings: OrderSettings;
  filledAt?: string;
  txHash?: string; // Transaction hash for executed orders
  cancelledAt?: string;
};

export type CreateOrderRequest = {
  conditions: Condition[];
  action: OrderAction;
  settings: OrderSettings;
};

export type TokenBalance = {
  symbol: string;
  balance: string;
  asset_id: string;
};

export type BalanceResponse = {
  balances: TokenBalance[];
  lastUpdated: string;
};

export type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type ErrorResponse = {
  status: 'error';
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
  message: string;
};

export type SuccessResponse<T> = {
  status: 'success';
  data: T;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
