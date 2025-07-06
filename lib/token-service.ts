interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  } | null;
  last_updated: string;
}

interface CoinGeckoGlobalData {
  data: {
    active_cryptocurrencies: number;
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
    updated_at: number;
  }
}

export interface TokenData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  image: string;
}

// Map our supported tokens to CoinGecko IDs
const TOKEN_ID_MAPPING: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'NEAR': 'near',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'ZEC': 'zcash'
};

// Singleton cache to reduce API calls
class TokenDataCache {
  private static instance: TokenDataCache;
  private cache: Map<string, TokenData> = new Map();
  private lastUpdated: number = 0;
  private updateIntervalMs: number = 1 * 60 * 1000; // 1 minutes
  private btcDominance: number = 0;

  private constructor() {}

  static getInstance(): TokenDataCache {
    if (!TokenDataCache.instance) {
      TokenDataCache.instance = new TokenDataCache();
    }
    return TokenDataCache.instance;
  }

  async getTokenData(symbol: string): Promise<TokenData | null> {
    await this.refreshCacheIfNeeded();
    return this.cache.get(symbol.toUpperCase()) || null;
  }

  async getAllTokensData(): Promise<TokenData[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.cache.values());
  }

  async getBTCDominance(): Promise<number> {
    await this.refreshCacheIfNeeded();
    return this.btcDominance;
  }

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdated > this.updateIntervalMs || this.cache.size === 0) {
      // Fetch token data and BTC dominance in parallel
      await Promise.all([
        this.fetchTokenData(),
        this.fetchBTCDominance()
      ]);
      this.lastUpdated = now;
    }
  }

  private async fetchBTCDominance(): Promise<void> {
    try {
      const url = 'https://api.coingecko.com/api/v3/global';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch global data: ${response.status} ${response.statusText}`);
      }
      
      const globalData: CoinGeckoGlobalData = await response.json();
      
      // Get BTC dominance directly from the API
      this.btcDominance = globalData.data.market_cap_percentage.btc || 0;
      
      console.log(`BTC dominance updated: ${this.btcDominance.toFixed(2)}%`);
    } catch (error) {
      console.error('Error fetching BTC dominance from CoinGecko:', error);
      // Keep using existing value if available
    }
  }

  private async fetchTokenData(): Promise<void> {
    try {
      const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token data: ${response.status} ${response.statusText}`);
      }
      
      const data: CoinGeckoToken[] = await response.json();

      // Process all tokens from response
      for (const coin of data) {
        // Find our token in the response
        const ourSymbol = Object.keys(TOKEN_ID_MAPPING).find(
          key => TOKEN_ID_MAPPING[key] === coin.id
        );

        if (ourSymbol) {
          this.cache.set(ourSymbol, {
            id: coin.id,
            symbol: ourSymbol,
            name: coin.name,
            price: coin.current_price,
            marketCap: coin.market_cap,
            image: coin.image
          });
        }
      }

      console.log(`Token data refreshed. Cache has ${this.cache.size} tokens.`);
    } catch (error) {
      console.error('Error fetching token data from CoinGecko:', error);
      // We'll keep using the existing cache if available
    }
  }
}

export const tokenService = {
  // Get data for a specific token
  getTokenData: async (symbol: string): Promise<TokenData | null> => {
    return await TokenDataCache.getInstance().getTokenData(symbol);
  },

  // Get data for all supported tokens
  getAllTokensData: async (): Promise<TokenData[]> => {
    return await TokenDataCache.getInstance().getAllTokensData();
  },

  // Get BTC dominance percentage
  getBTCDominance: async (): Promise<number> => {
    return await TokenDataCache.getInstance().getBTCDominance();
  }
};
