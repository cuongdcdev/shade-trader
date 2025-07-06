import { NextRequest, NextResponse } from 'next/server';
import { SuccessResponse } from '@/types/api';
import { UserConfigDatabase } from '@/lib/user-database';
import { UserConfig } from '@/types/user-config';
import { withAuth } from '@/lib/auth-middleware';

// GET handler for retrieving a user configuration
async function getUserConfigHandler(
  req: NextRequest,
  { address }: { address: string }
) {
  try {
    // Find the user by wallet address
    const userConfig = UserConfigDatabase.getUserConfigByAddress(address);

    if (!userConfig) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: 'User configuration not found' },
        { status: 404 }
      );
    }

    const response: SuccessResponse<UserConfig> = {
      status: 'success',
      data: userConfig
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting user config:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT handler for creating or updating a user configuration
async function updateUserConfigHandler(
  req: NextRequest,
  { address }: { address: string }
) {
  try {
    const body = await req.json();
    
    // Find existing user config
    const existingConfig = UserConfigDatabase.getUserConfigByAddress(address);
    
    let userConfig: UserConfig;
    
    if (existingConfig) {
      // Update existing config
      userConfig = UserConfigDatabase.updateUserConfig(
        existingConfig.userId, 
        {
          wallet: body.wallet,
          notifications: body.notifications,
          settings: body.settings
        }
      ) as UserConfig;
    } else {
      // Create new config
      userConfig = UserConfigDatabase.createUserConfig({
        wallet: {
          address: address,
          privateKey: body.wallet?.privateKey || 'default_private_key'
        },
        notifications: body.notifications || {
          telegramId: undefined,
          email: undefined,
          isTelegramEnabled: false,
          isEmailEnabled: false
        },
        settings: body.settings || {
          defaultExpiryDays: 7
        }
      });
    }

    const response: SuccessResponse<UserConfig> = {
      status: 'success',
      data: userConfig
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating user config:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting a user configuration
async function deleteUserConfigHandler(
  req: NextRequest,
  { address }: { address: string }
) {
  try {
    // Find existing user config
    const existingConfig = UserConfigDatabase.getUserConfigByAddress(address);
    
    if (!existingConfig) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: 'User configuration not found' },
        { status: 404 }
      );
    }
    
    // Delete the config
    const success = UserConfigDatabase.deleteUserConfig(existingConfig.userId);
    
    if (!success) {
      return NextResponse.json(
        { status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to delete user configuration' },
        { status: 500 }
      );
    }

    const response: SuccessResponse<{ success: boolean }> = {
      status: 'success',
      data: { success: true }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting user config:', error);
    return NextResponse.json(
      { status: 'error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Main handler that routes to the appropriate method handler
async function handler(req: NextRequest, { address }: { address: string }) {
  switch (req.method) {
    case 'GET':
      return getUserConfigHandler(req, { address });
    case 'PUT':
      return updateUserConfigHandler(req, { address });
    case 'DELETE':
      return deleteUserConfigHandler(req, { address });
    default:
      return NextResponse.json(
        { status: 'error', code: 'BAD_REQUEST', message: 'Method not allowed' },
        { status: 405 }
      );
  }
}

// Export the handlers wrapped with authentication middleware
export const GET = withAuth(handler);
export const PUT = withAuth(handler);
export const DELETE = withAuth(handler);
