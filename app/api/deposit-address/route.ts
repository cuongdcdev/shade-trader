import { NextRequest, NextResponse } from 'next/server';
import { getIntentsDepositAddress } from '@/lib/near-intents/utils';
import { withAuth } from '@/lib/auth-middleware';

async function handler(req: NextRequest) {
  try {
    // Get accountId from the headers (set by withAuth middleware)
    const accountId = req.headers.get('x-near-account-id');
    
    if (!accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const chain = req.nextUrl.searchParams.get('chain');
    
    if (!chain) {
      return NextResponse.json({ error: 'Chain parameter is required' }, { status: 400 });
    }
    
    const depositAddress = await getIntentsDepositAddress(accountId, chain);
    
    return NextResponse.json({ address: depositAddress });
  } catch (error: any) {
    console.error('Error getting deposit address:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get deposit address' }, 
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
