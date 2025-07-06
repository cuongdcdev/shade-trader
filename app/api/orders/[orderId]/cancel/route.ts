import { NextRequest, NextResponse } from 'next/server';
import { SuccessResponse } from '@/types/api';
import { Database } from '@/lib/database';
import { withAuth } from '@/lib/auth-middleware';

// Properly handle dynamic route parameters
async function handler(
  req: NextRequest,
  { address }: { address: string },
  context: { params: { orderId: string } }
) {
  if (req.method !== 'POST') {
    return NextResponse.json(
      { status: 'error', code: 'BAD_REQUEST', message: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    // Get orderId from context params
    const { orderId } = context.params;
    
    if (!orderId) {
      return NextResponse.json(
        { status: 'error', code: 'BAD_REQUEST', message: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Check if order exists
    const existingOrder = Database.getOrder(orderId, address);
    if (!existingOrder) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order can be cancelled
    if (existingOrder.status !== 'Open') {
      return NextResponse.json(
        { status: 'error', code: 'BAD_REQUEST', message: `Cannot cancel order with status ${existingOrder.status}` },
        { status: 400 }
      );
    }

    // Cancel order
    const cancelledOrder = Database.cancelOrder(orderId, address);
    if (!cancelledOrder) {
      return NextResponse.json(
        { status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to cancel order' },
        { status: 500 }
      );
    }

    const response: SuccessResponse<{
      orderId: string;
      status: string;
      cancelledAt?: string;
    }> = {
      status: 'success',
      data: {
        orderId: cancelledOrder.orderId,
        status: cancelledOrder.status,
        cancelledAt: cancelledOrder.cancelledAt
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Export the handler wrapped with authentication middleware
export const POST = withAuth(handler);
