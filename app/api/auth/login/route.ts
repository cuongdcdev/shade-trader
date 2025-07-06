import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/nearAuthentication';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.accountId || !body.publicKey || !body.signature || !body.message || !body.recipient) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields for authentication' 
        },
        { status: 400 }
      );
    }

    // Convert nonce from string/array back to Uint8Array if needed
    let nonce: Uint8Array;
    if (Array.isArray(body.nonce)) {
      nonce = new Uint8Array(body.nonce);
    } else if (typeof body.nonce === 'string') {
      nonce = new Uint8Array(Buffer.from(body.nonce, 'base64'));
    } else {
      nonce = body.nonce;
    }

    // Authenticate using NEAR signature
    const isAuthenticated = await authenticate({
      accountId: body.accountId,
      publicKey: body.publicKey,
      signature: body.signature,
      message: body.message,
      recipient: body.recipient,
      nonce: nonce
    });

    if (!isAuthenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid signature or authentication failed' 
        },
        { status: 401 }
      );
    }

    // Authentication successful - in a production app, you might generate a JWT here
    // For now, we'll keep it simple
    return NextResponse.json({
      success: true,
      accountId: body.accountId,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed due to an unexpected error' 
      },
      { status: 500 }
    );
  }
}
