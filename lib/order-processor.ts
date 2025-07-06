import { Order } from "@/types/api";
import { UserConfigDatabase } from "@/lib/user-database";
import { tokenService, TokenData } from "@/lib/token-service";
import { nearIntentsService } from "@/lib/near-intents-service";
import { telegramService } from "@/lib/telegram-service";
import { Database } from "@/lib/database";

// Utility to evaluate if a condition is met
const isConditionMet = (
  condition: Order["conditions"][0],
  tokenData: TokenData | null,
  btcDominance: number
): boolean => {
  if (!condition) return false;
  
  const value = parseFloat(condition.value);
  
  // Handle different metrics
  switch (condition.metric) {
    case "price":
      if (!tokenData) return false;
      
      if (condition.operator === ">") {
        return tokenData.price > value;
      } else if (condition.operator === "<") {
        return tokenData.price < value;
      } else if (condition.operator === "=") {
        return Math.abs(tokenData.price - value) < 0.001; // Approximate equality
      }
      break;
      
    case "market_cap":
      if (!tokenData) return false;
      
      // Market cap in millions
      const marketCapInMillions = tokenData.marketCap / 1000000;
      
      if (condition.operator === ">") {
        return marketCapInMillions > value;
      } else if (condition.operator === "<") {
        return marketCapInMillions < value;
      } else if (condition.operator === "=") {
        return Math.abs(marketCapInMillions - value) < 0.1; // Approximate equality
      }
      break;
      
    case "btc_dom":
      if (condition.operator === ">") {
        return btcDominance > value;
      } else if (condition.operator === "<") {
        return btcDominance < value;
      } else if (condition.operator === "=") {
        return Math.abs(btcDominance - value) < 0.1; // Approximate equality
      }
      break;
  }
  
  return false;
};

// Process a single order
const processOrder = async (order: Order): Promise<void> => {
  console.log(`Processing order ${order.orderId} | order data: ${JSON.stringify(order)}...`);
  
  try {
    // Get token data for each condition
    const btcDominance = await tokenService.getBTCDominance();
    let allConditionsMet = true;
    let relevantTokenData: TokenData | null = null;
    
    // Check all conditions
    for (const condition of order.conditions) {
      let tokenData: TokenData | null = null;
      
      // If condition has a token, get that token's data
      if (condition.token) {
        tokenData = await tokenService.getTokenData(condition.token);
        
        // Store token data for action token
        if (condition.token === order.action.token) {
          relevantTokenData = tokenData;
        }
      }
      
      // Check if this condition is met
      const conditionMet = isConditionMet(condition, tokenData, btcDominance);
      console.log(`Condition: ${condition.metric} ${condition.operator} ${condition.value} => ${conditionMet ? 'MET' : 'NOT MET'}`);
      
      // If any condition is not met, the order doesn't execute
      if (!conditionMet) {
        allConditionsMet = false;
        break;
      }
    }
    
    // If all conditions are met, execute the order
    if (allConditionsMet) {
      console.log(`All conditions met for order ${order.orderId}. Executing...`);
      
      // Get the token data for the action token if we don't have it yet
      if (!relevantTokenData && order.action.token) {
        relevantTokenData = await tokenService.getTokenData(order.action.token);
      }
      
      // Get user config for wallet and notification
      const userAddress = order.user || '';
      const userConfig = UserConfigDatabase.getUserConfigByAddress(userAddress);
      
      if (!userConfig) {
        console.error(`No user config found for user ${order.user}`);
        return;
      }

      
      // Execute the order using NEAR Intents
      const swapResult = await nearIntentsService.executeSwap(
        order, 
        userConfig, 
        relevantTokenData?.price || 0
      );
      
      // Update order status
      if (swapResult) {
        // Update order status in database
        Database.updateOrderStatus(order.orderId, 'Executed', { 
          txHash: swapResult.txHash,
          amountOut: swapResult.amountOut,
          action: order.action,
          filledAt: new Date().toISOString() 
        });
        
        console.log(`Order ${order.orderId} executed successfully!`);
      } else {
        // Mark as failed
        Database.updateOrderStatus(order.orderId, 'Failed', {
          failedAt: new Date().toISOString(),
          failureReason: 'NEAR Intents swap execution failed'
        });
        
        console.log(`Order ${order.orderId} execution failed.`);
      }
      
      // Send notification
      await telegramService.sendOrderExecutionNotification(
        order,
        userConfig,
        swapResult,
        relevantTokenData?.price || 0
      );
    }
  } catch (error) {
    console.error(`Error processing order ${order.orderId}:`, error);
  }
};

// Check for orders to process
const checkOrders = async (): Promise<void> => {
  try {
    console.log('Checking for open orders...');
    
    // Get all open orders
    const openOrders = Database.getOrdersByStatus('Open');
    
    if (openOrders.length === 0) {
      console.log('No open orders to process.');
      return;
    }
    
    console.log(`Found ${openOrders.length} open orders. Processing...`);
    
    // Process each order
    for (const order of openOrders) {
      await processOrder(order);
    }
    
  } catch (error) {
    console.error('Error checking orders:', error);
  }
};

// Order processor singleton
class OrderProcessor {
  private static instance: OrderProcessor;
  private intervalId: NodeJS.Timeout | null = null;
  private checkIntervalMs: number = 30 * 1000; // 30 seconds
  
  private constructor() {}
  
  static getInstance(): OrderProcessor {
    if (!OrderProcessor.instance) {
      OrderProcessor.instance = new OrderProcessor();
    }
    return OrderProcessor.instance;
  }
  
  // Start the order processor
  start(): void {
    if (this.intervalId) {
      console.log('Order processor already running.');
      return;
    }
    
    console.log(`Starting order processor with check interval of ${this.checkIntervalMs / 1000} seconds...`);
    
    // Run once immediately
    checkOrders();
    
    // Then set up interval
    this.intervalId = setInterval(checkOrders, this.checkIntervalMs);
  }
  
  // Stop the order processor
  stop(): void {
    if (!this.intervalId) {
      console.log('Order processor not running.');
      return;
    }
    
    clearInterval(this.intervalId);
    this.intervalId = null;
    console.log('Order processor stopped.');
  }
  
  // Check if the processor is running
  isRunning(): boolean {
    return this.intervalId !== null;
  }
  
  /**
   * Manually check all open orders once
   */
  async checkAllOrders(): Promise<void> {
    try {
      console.log('Checking for open orders...');
      
      // Get all open orders
      const openOrders = Database.getOrdersByStatus('Open');
      
      if (openOrders.length === 0) {
        console.log('No open orders to process.');
        return;
      }
      
      console.log(`Found ${openOrders.length} open orders. Processing...`);
      
      // Process each order
      for (const order of openOrders) {
        await processOrder(order);
      }
      
    } catch (error) {
      console.error('Error checking orders:', error);
    }
  }
}

export const orderProcessor = OrderProcessor.getInstance();
