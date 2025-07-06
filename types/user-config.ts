import { TokenBalance } from './api';

export type UserWallet = {
  address: string;
  privateKey: string;
};

export type UserNotifications = {
  telegramId?: string;
  email?: string;
  isEmailEnabled: boolean;
  isTelegramEnabled: boolean;
};

export type UserConfig = {
  userId: string;
  createdAt: string;
  updatedAt: string;
  wallet: UserWallet;
  notifications: UserNotifications;
  settings: {
    defaultExpiryDays: number;
  };
};

export type CreateUserConfigRequest = Omit<UserConfig, 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateUserConfigRequest = Partial<Omit<UserConfig, 'userId' | 'createdAt' | 'updatedAt'>>;

export type UserConfigResponse = {
  config: UserConfig;
};

export type UserConfigListResponse = {
  configs: UserConfig[];
};
