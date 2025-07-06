import { Order } from "@/types/api";
import { UserConfig } from "@/types/user-config";
import {
  Environment,
  intentSwap,
  getIntentsDepositAddress,
  getIntentsBalance,
  SwapResult,
} from '@/lib/near-intents';

import path from 'path';
import * as fs from 'fs';

// Mock implementation of NEAR Intents SDK integration
export const nearIntentsService = {
  // Mock function to execute a swap
  executeSwap: async (
    order: Order,
    userConfig: UserConfig,
    tokenPrice: number
  ): Promise<SwapResult | false> => {
    console.log(`[NEAR Intents] swap execution for order: ${order.orderId}`);
    console.log(`[NEAR Intents] User wallet: ${userConfig.wallet.address}`);
    console.log(`[NEAR Intents] Action: ${order.action.type} ${order.action.amount} ${order.action.token}`);
    console.log(`[NEAR Intents] Current token price: $${tokenPrice}`);


    const tokenPath = path.resolve(__dirname, 'near-intents/token_list.json');
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    console.log(`[NEAR Intents Service] Loaded token data: ${tokenData.length} tokens`);

    const env = new Environment({
      ACCOUNT_ID: userConfig.wallet.address,
      PRIVATE_KEY: userConfig.wallet.privateKey, // Replace with actual private key
      NETWORK_ID: 'mainnet', // or 'testnet'
      RPC_URL: 'https://free.rpc.fastnear.com',
      tokenList: tokenData,
    });

    // const swapResult = await intentSwap(
    //   env,
    //   order.action.type == "Buy" ? "USDT" : order.action.token,
    //   order.action.type == "Buy" ? order.action.token : "USDT",
    //   order.action.amount,
    //   env.tokenList
    // );


      const swapResult = await intentSwap(
      env,
      order.action.type == "Buy" ? "USDT" : order.action.token,
      order.action.type == "Buy" ? order.action.token : "USDT",
      order.action.amount,
      tokenData
    );


    // await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000)); 

    if (swapResult) {
      console.log(`[NEAR Intents] Swap executed successfully`);
      console.log('✅ Swap result:', swapResult);

    } else {
      console.error(`[NEAR Intents] Swap execution failed: `, swapResult);
    }

    return swapResult;
  }
};
