// This file implements the environment for NEAR interactions
import { KeyPair, keyStores, Near, Account, connect } from 'near-api-js';

export interface EnvVars {
  ACCOUNT_ID?: string;
  PRIVATE_KEY?: string;
  JWT_TOKEN?: string; // JWT token for 1Click API
  RPC_URL?: string;
  NETWORK_ID?: string;
  [key: string]: string | undefined;
}

export class Environment {
  wallet: EnvVars = {};
  tokenList: any[] = []; // List of supported tokens
  private replies: string[] = [];
  private nearConnection: Near | null = null;
  private nearAccount: Account | null = null;

  constructor(params?: EnvVars) {
    if (params) {
      this.wallet = { ...params };
    }
  }

  /**
   * Set environment variables
   * @param params Environment parameters
   */
  setEnvironment(params: EnvVars): void {
    this.wallet = { ...this.wallet, ...params };
  }

  async set_near(accountId: string, privateKey?: string): Promise<Account> {

    if (!privateKey) {
      console.log("Private key empty, use the random key");
      privateKey = this.wallet.PRIVATE_KEY ? this.wallet.PRIVATE_KEY : "ed25519:random_private_key"; ;
    }

    // Create an in-memory keystore
    const keyStore = new keyStores.InMemoryKeyStore();
    
    // Create a key pair from the private key
    // For ed25519 keys the format is typically "ed25519:privateKey"
    const keyPair = privateKey.includes(':') 
      ? KeyPair.fromString(privateKey as any) 
      : KeyPair.fromString(`ed25519:${privateKey}` as any);
    
    // Add the key pair to the keystore
    const networkId = this.wallet.NETWORK_ID || 'mainnet';
    await keyStore.setKey(networkId, accountId, keyPair);

    // Configure the connection
    const config = {
      networkId,
      keyStore,
      nodeUrl: this.wallet.RPC_URL || 'https://free.rpc.fastnear.com',
      headers: {}
    };

    try {
      // Connect to NEAR using the connect method
      this.nearConnection = await connect(config);
      
      // Load the account data
      this.nearAccount = await this.nearConnection.account(accountId);
      
      return this.nearAccount;
    } catch (error) {
      console.error('Error connecting to NEAR:', error);
      throw error;
    }
  }

  add_reply(message: string): void {
    this.replies.push(message);
    console.log(message);
  }

  list_messages(): string[] {
    return this.replies;
  }
}

// Create a global environment instance with default settings
export const env = new Environment();
