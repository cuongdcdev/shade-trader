import { UserConfig, CreateUserConfigRequest, UpdateUserConfigRequest } from '@/types/user-config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// File path for data storage
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial mock data for users
const initialUsers: UserConfig[] = [
  {
    userId: 'user_123456abcdef',
    createdAt: '2025-06-15T10:00:00Z',
    updatedAt: '2025-06-15T10:00:00Z',
    wallet: {
      address: 'near_1a2b3c...7z',
      privateKey: 'mock_private_key_1'
    },
    notifications: {
      telegramId: '123456789',
      email: 'user1@example.com',
      isTelegramEnabled: true,
      isEmailEnabled: false
    },
    settings: {
      defaultExpiryDays: 7
    }
  },
  {
    userId: 'user_654321fedcba',
    createdAt: '2025-06-20T14:30:00Z',
    updatedAt: '2025-06-20T14:30:00Z',
    wallet: {
      address: 'near_7z6y5x...1a',
      privateKey: 'mock_private_key_2'
    },
    notifications: {
      telegramId: '987654321',
      email: 'user2@example.com',
      isTelegramEnabled: false,
      isEmailEnabled: true
    },
    settings: {
      defaultExpiryDays: 5
    }
  }
];

// Initialize the users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  console.log('Creating initial users file...');
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
}

// Helper functions to read and write data
const readUsers = (): UserConfig[] => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

const writeUsers = (users: UserConfig[]): void => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
  }
};

// User configuration operations
export const UserConfigDatabase = {
  // Create a new user configuration
  createUserConfig: (config: CreateUserConfigRequest): UserConfig => {
    const users = readUsers();
    
    const now = new Date().toISOString();
    const newUser: UserConfig = {
      ...config,
      userId: `user_${uuidv4().substring(0, 10)}`,
      createdAt: now,
      updatedAt: now
    };

    // Check if wallet address already exists
    const existingUserIndex = users.findIndex(u => u.wallet.address === config.wallet.address);
    
    if (existingUserIndex !== -1) {
      // If exists, update the existing user
      users[existingUserIndex] = {
        ...users[existingUserIndex],
        ...newUser,
        userId: users[existingUserIndex].userId,
        createdAt: users[existingUserIndex].createdAt,
        updatedAt: now
      };
      writeUsers(users);
      return users[existingUserIndex];
    }

    // Otherwise add new user
    users.push(newUser);
    writeUsers(users);
    return newUser;
  },

  // Get a user configuration by ID
  getUserConfig: (userId: string): UserConfig | null => {
    const users = readUsers();
    const user = users.find(u => u.userId === userId);
    return user || null;
  },
  
  // Get a user configuration by wallet address
  getUserConfigByAddress: (address: string): UserConfig | null => {
    const users = readUsers();
    const user = users.find(u => u.wallet.address === address);
    return user || null;
  },

  // Update a user configuration
  updateUserConfig: (userId: string, updates: UpdateUserConfigRequest): UserConfig | null => {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.userId === userId);
    
    if (userIndex === -1) return null;
    
    const now = new Date().toISOString();
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: now
    };
    
    // Make sure the nested objects are properly merged
    if (updates.wallet) {
      users[userIndex].wallet = {
        ...users[userIndex].wallet,
        ...updates.wallet
      };
    }
    
    if (updates.notifications) {
      users[userIndex].notifications = {
        ...users[userIndex].notifications,
        ...updates.notifications
      };
    }
    
    if (updates.settings) {
      users[userIndex].settings = {
        ...users[userIndex].settings,
        ...updates.settings
      };
    }
    
    writeUsers(users);
    return users[userIndex];
  },

  // Delete a user configuration
  deleteUserConfig: (userId: string): boolean => {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.userId === userId);
    
    if (userIndex === -1) return false;
    
    users.splice(userIndex, 1);
    writeUsers(users);
    return true;
  },

  // List all user configurations
  listUserConfigs: (): UserConfig[] => {
    return readUsers();
  },
  
  // Reset to initial data (for testing)
  resetToInitialData: () => {
    writeUsers(initialUsers);
    return { success: true };
  }
};
