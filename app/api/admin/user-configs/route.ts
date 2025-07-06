import { NextRequest, NextResponse } from 'next/server';
import { SuccessResponse } from '@/types/api';
import { UserConfigDatabase } from '@/lib/user-database';
import { UserConfig } from '@/types/user-config';

// GET handler for listing all user configurations
export async function GET(req: NextRequest) {
  try {
    // Get all user configs
    const userConfigs = UserConfigDatabase.listUserConfigs();

    const response: SuccessResponse<{ configs: UserConfig[] }> = {
      status: 'success',
      data: { configs: userConfigs }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting all user configs:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST handler for resetting user configurations to initial data (for testing)
export async function POST(req: NextRequest) {
  try {
    // Reset data
    const result = UserConfigDatabase.resetToInitialData();

    const response: SuccessResponse<typeof result> = {
      status: 'success',
      data: result
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error resetting user configs:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
