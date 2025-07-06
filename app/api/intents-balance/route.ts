import { NextRequest, NextResponse } from 'next/server';
import { SuccessResponse } from '@/types/api';
import { withAuth } from '@/lib/auth-middleware';
import { Environment, getIntentsBalance } from '@/lib/near-intents';
import { UserConfigDatabase } from '@/lib/user-database';
import path from 'path';
import * as fs from 'fs';

async function handler(req: NextRequest, { address }: { address: string }) {
  if (req.method !== 'GET') {
    return NextResponse.json(
      { status: 'error', code: 'BAD_REQUEST', message: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    // Get user config to access wallet private key
    const userConfig = UserConfigDatabase.getUserConfigByAddress(address);
    
    if (!userConfig) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: 'User configuration not found' },
        { status: 404 }
      );
    }
    

    // Load token data
    const tokenPath = path.resolve(process.cwd(), 'lib/near-intents/token_list.json');
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

    // Create environment instance
    const env = new Environment({
      ACCOUNT_ID: userConfig.wallet.address,
      PRIVATE_KEY: userConfig.wallet.privateKey,
      NETWORK_ID: 'mainnet',
      RPC_URL: 'https://free.rpc.fastnear.com',
      tokenList: tokenData,
    });

    // Get intents balance
    const balances = await getIntentsBalance(env, address, tokenData);

    const response: SuccessResponse<typeof balances> = {
      status: 'success',
      data: balances
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting intents balance:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Export the handler wrapped with authentication middleware
export const GET = withAuth(handler);