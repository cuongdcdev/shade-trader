import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderRequest, SuccessResponse } from '@/types/api';
import { Database } from '@/lib/database';
import { withAuth } from '@/lib/auth-middleware';

// POST handler for creating new orders
async function createOrderHandler(req: NextRequest, { address }: { address: string }) {
  try {
    const body = await req.json() as CreateOrderRequest;
    
    // Basic validation
    if (!body.conditions || !Array.isArray(body.conditions) || body.conditions.length === 0) {
      return NextResponse.json(
        { status: 'error', code: 'BAD_REQUEST', message: 'At least one condition is required' },
        { status: 400 }
      );
    }

    if (!body.action || !body.action.type || !body.action.amount || !body.action.token) {
      return NextResponse.json(
        { status: 'error', code: 'BAD_REQUEST', message: 'Action details are required' },
        { status: 400 }
      );
    }

    // Create order
    const newOrder = Database.createOrder({
      conditions: body.conditions,
      action: body.action,
      settings: body.settings
    }, address);

    const response: SuccessResponse<typeof newOrder> = {
      status: 'success',
      data: newOrder
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET handler for listing user orders
async function getUserOrdersHandler(req: NextRequest, { address }: { address: string }) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const token = url.searchParams.get('token') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    console.log(`Getting orders for user: ${address}, status: ${status}, token: ${token}`);
    
    // Get orders
    const result = Database.getUserOrders(address, status, token, page, limit);
    
    console.log(`Found ${result.orders.length} orders for user ${address} (total: ${result.pagination.total})`);

    const response: SuccessResponse<typeof result> = {
      status: 'success',
      data: result
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting user orders:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Main handler that routes to the appropriate method handler
async function handler(req: NextRequest, { address }: { address: string }) {
  switch (req.method) {
    case 'POST':
      return createOrderHandler(req, { address });
    case 'GET':
      return getUserOrdersHandler(req, { address });
    default:
      return NextResponse.json(
        { status: 'error', code: 'BAD_REQUEST', message: 'Method not allowed' },
        { status: 405 }
      );
  }
}

// Export the handlers wrapped with authentication middleware
export const GET = withAuth(handler);
export const POST = withAuth(handler);
