import { Order } from "@/types/api";
import { UserConfig } from "@/types/user-config";
import { SwapResult } from "./near-intents";

// Mock implementation of telegram notification service
export const telegramService = {
  // Send a notification about an order execution
  sendOrderExecutionNotification: async (
    order: Order,
    userConfig: UserConfig,
    swapResult: SwapResult | false,
    tokenPrice: number
  ): Promise<boolean> => {
    // Check if user has telegram notifications enabled
    if (!userConfig.notifications.isTelegramEnabled || !userConfig.notifications.telegramId) {
      console.log(`[Telegram] Notifications disabled for user ${userConfig.userId}`);
      return false;
    }
    
    const telegramId = userConfig.notifications.telegramId;
    
    // Create notification message
    const action = `${order.action.type} ${order.action.amount} ${order.action.token}`;
    const condition = order.conditions[0] ? 
      `${order.conditions[0].metric} ${order.conditions[0].operator} ${order.conditions[0].value}` : 
      'custom condition';
    
    let message: string;
    
    if (swapResult) {
      message = `✅ Order Executed Successfully\n\nOrder #${order.orderId}\n${action}\n At price: $${tokenPrice}\nCondition: ${condition}\nTransaction Hash: ${swapResult.txHash}`;
    } else {
      message = `❌ Order Execution Failed\n\nOrder #${order.orderId}\n${action}\nCondition: ${condition}\n\nPlease check your wallet balance! `;
    }
    
    console.log(`[Telegram] Sending notification to telegram ID: ${telegramId}`);
    console.log(`[Telegram] Message: ${message}`);
    
    // In a real implementation, you would call the Telegram API here
    return true;
  }
};
