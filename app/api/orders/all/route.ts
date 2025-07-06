import { NextRequest, NextResponse } from 'next/server';
import { SuccessResponse } from '@/types/api';
import { Database } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'Open';
    const token = url.searchParams.get('token') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Get all orders
    const result = Database.getAllOrders(status, token, page, limit);

    const response: SuccessResponse<typeof result> = {
      status: 'success',
      data: result
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting all orders:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
