import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponse } from '@/types/api';
import { authenticate } from '@/lib/nearAuthentication';

export function withAuth(handler: Function) {
  return async (req: NextRequest, context: any) => {
    // Extract authentication details from request headers
    const accountId = req.headers.get('x-near-account-id');
    const publicKey = req.headers.get('x-near-public-key');
    const signature = req.headers.get('x-near-signature');
    const message = req.headers.get('x-near-message');
    const recipient = req.headers.get('x-near-recipient');
    const nonceStr = req.headers.get('x-near-nonce');
    
    // Check if all required authentication headers are present
    if (!accountId || !publicKey || !signature || !message || !recipient || !nonceStr) {
      const errorResponse: ErrorResponse = {
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'NEAR Wallet authentication required'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }
    
    try {
      // Convert nonce from string to Uint8Array
      const nonce = new Uint8Array(Buffer.from(nonceStr, 'base64'));
      
      // Verify the signature
      const isAuthenticated = await authenticate({
        accountId,
        publicKey,
        signature,
        message,
        recipient,
        nonce
      });
      
      if (!isAuthenticated) {
        const errorResponse: ErrorResponse = {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Invalid NEAR Wallet signature'
        };
        return NextResponse.json(errorResponse, { status: 401 });
      }
      
      // Authentication successful, pass the wallet address to the handler
      return handler(req, { address: accountId }, context);
    } catch (error) {
      console.error('Authentication error:', error);
      const errorResponse: ErrorResponse = {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Authentication process failed'
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  };
}
