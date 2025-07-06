import { NextRequest, NextResponse } from 'next/server';
import { SuccessResponse } from '@/types/api';
import { Database } from '@/lib/database';

// WARNING: This endpoint is for development and testing only
// It should be disabled or removed in production

export async function POST(req: NextRequest) {
  try {
    // Reset the database to initial state
    const result = Database.resetToInitialData();

    const response: SuccessResponse<typeof result> = {
      status: 'success',
      data: result
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
