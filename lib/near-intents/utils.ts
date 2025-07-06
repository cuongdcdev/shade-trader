import axios from 'axios';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as base58 from 'bs58';
import * as nacl from 'tweetnacl';
import { Environment } from './environment';
import { BinarySerializer } from './serializer';

// Constants
const defaultMainnetRpc = "https://free.rpc.fastnear.com";
const INTENTS_CONTRACT = "intents.near";
const url = "https://solver-relay-v2.chaindefuser.com/rpc";
const headers = { "Content-Type": "application/json" };
const ED_PREFIX = "ed25519:";  
const FT_DEPOSIT_GAS = BigInt("30000000000000");
const FT_TRANSFER_GAS = BigInt("50000000000000");
const FT_MINIMUM_STORAGE_BALANCE_LARGE = BigInt("1250000000000000000000");


export const INTENTS_SUPPORTED_CHAINS_AND_TOKENS = [
  {
    chain: 'doge:mainnet',
    chainName: 'Dogecoin',
    supportedTokens: [
      {
        "intents_token_id": "nep141:doge.omft.near",
        "asset_name": "DOGE",
        "decimals": 8,
      }
    ]
  },
  {
    chain: "near:mainnet",
    chainName: "NEAR",
    supportedTokens: [
      {
        "intents_token_id": "nep141:wrap.near",
        "asset_name": "NEAR",
        "decimals": 24,
      },
      {
        "intents_token_id": "nep141:usdt.tether-token.near",
        "asset_name": "USDT",
        "decimals": 6,
      },
      {
        "intents_token_id": "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        "asset_name": "USDC",
        "decimals": 6,
      }
    ]
  }
  // ZCash support removed
  // {
  //   chain: "zec:mainnet",
  //   chainName: "ZCash",
  //   supportedTokens: [
  //     {
  //       "intents_token_id": "zec:zcash",
  //       "asset_name": "ZEC",
  //       "decimals": 8,
  //     }]
  // }
];

/**
 * Add a public key to the Intents contract
 * @param env The environment
 * @param publicKey The public key to add
 */
export async function addPublicKey(env: Environment, publicKey: string): Promise<void> {
  // Setup
  const userAccountId = env.wallet.ACCOUNT_ID || '';
  const userPrivateKey = env.wallet.PRIVATE_KEY || '';
  const near = await env.set_near(userAccountId, userPrivateKey);

  // Check if public key already exists
  const hasPublicKey = await near.viewFunction({
    contractId: "intents.near",
    methodName: "has_public_key",
    args: {
      account_id: userAccountId,
      public_key: publicKey,
    }
  });

  if (hasPublicKey) {
    return;
  }

  // Add the public key
  await near.functionCall({
    contractId: "intents.near",
    methodName: "add_public_key",
    args: { public_key: publicKey },
    gas: FT_DEPOSIT_GAS,
    attachedDeposit: BigInt(1)
  });
}

/**
 * Get the status of an intent settlement
 * @param intentHash The intent hash to check
 * @returns Whether the intent was settled and the response
 */
export async function getIntentSettledStatus(
  intentHash: string
): Promise<[boolean, any]> {
  const data = {
    id: 1,
    jsonrpc: "2.0",
    method: "get_status",
    params: [
      {
        intent_hash: intentHash
      }
    ]
  };

  const startTime = Date.now();
  let status = "GOOD";
  
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const response = await axios.post(url, data, { headers });
      const resp = response.data;

      if (resp.result.status === "SETTLED") {
        return [true, resp];
      } else if (
        resp.result.status === "NOT_FOUND_OR_NOT_VALID_ANYMORE" ||
        resp.result.status === "NOT_FOUND_OR_NOT_VALID"
      ) {
        console.log("Intent not found or not valid anymore");
        return [false, resp];
      } else if (resp.result.status === "FAILED") {
        return [false, resp];
      } else if (Date.now() - startTime > 30000) {
        console.log("Timeout: Operation took longer than 30 seconds");
        return [false, resp];
      }

      if (status !== resp.result.status) {
        status = resp.result.status;
      }
    } catch (error) {
      console.error('Error checking intent status:', error);
      return [false, { error: 'Error checking intent status' }];
    }
  }
}

/**
 * Get the message to sign for withdrawals
 * @param env The environment
 * @param signerId The signer ID
 * @param token The token ID
 * @param receiverId The receiver ID
 * @param amount The amount to withdraw
 * @param blockchain The blockchain
 * @returns The message to sign
 */
export async function getWithdrawMessageToSign(
  env: Environment,
  signerId: string,
  token: string,
  receiverId: string,
  amount: string | number,
  blockchain: string
): Promise<string> {
  // Create expiration time (now + 3 min)
  const expTime = new Date(Date.now() + 180000).toISOString();
  const userAccountId = env.wallet.ACCOUNT_ID || '';
  const userPrivateKey = env.wallet.PRIVATE_KEY || '';

  const near = await env.set_near(userAccountId, userPrivateKey);

  // Check storage balance
  const nep141balance = await near.viewFunction({
    contractId: "wrap.near",
    methodName: "storage_balance_of",
    args: { account_id: userAccountId }
  });

  let availableBalance = 0;
  if (nep141balance) {
    availableBalance = parseInt(nep141balance.available);
  }

  const storageDeposit = availableBalance > FT_MINIMUM_STORAGE_BALANCE_LARGE 
    ? 0 
    : Number(FT_MINIMUM_STORAGE_BALANCE_LARGE);

  let message: any;

  if (token === "wrap.near") {
    message = {
      signer_id: signerId,
      deadline: expTime,
      intents: [
        {
          intent: "native_withdraw",
          receiver_id: receiverId,
          amount: amount.toString()
        }
      ]
    };
  } else if (blockchain === "near") {
    message = {
      signer_id: signerId,
      deadline: expTime,
      intents: [
        {
          intent: "ft_withdraw",
          receiver_id: receiverId,
          token: token,
          amount: amount.toString(),
          deposit: storageDeposit.toString()
        }
      ]
    };
  } else {
    message = {
      signer_id: signerId,
      deadline: expTime,
      intents: [
        {
          intent: "ft_withdraw",
          receiver_id: token,
          amount: amount.toString(),
          token: token,
          deposit: storageDeposit.toString(),
          memo: `WITHDRAW_TO:${receiverId}`
        }
      ]
    };
  }

  return JSON.stringify(message);
}

/**
 * Get the message to sign for swaps
 * @param signerId The signer ID
 * @param tokenIn The input token
 * @param amountIn The input amount
 * @param tokenOut The output token
 * @param amountOut The output amount
 * @param expTime The expiration time
 * @returns The message to sign
 */
export function getSwapMessageToSign(
  signerId: string,
  tokenIn: string,
  amountIn: string,
  tokenOut: string,
  amountOut: string,
  expTime: string
): string {
  const message = {
    signer_id: signerId,
    deadline: expTime,
    intents: [
      {
        intent: "token_diff",
        diff: {
          [tokenIn]: `-${amountIn}`,
          [tokenOut]: amountOut
        }
      }
    ]
  };

  return JSON.stringify(message);
}

/**
 * Generate a random nonce
 * @returns Base64 encoded nonce
 */
export function generateNonce(): string {
  const randomArray = crypto.randomBytes(32);
  return randomArray.toString('base64');
}

/**
 * Convert a base64 string to a Uint8Array
 * @param base64String The base64 string to convert
 * @returns Uint8Array representation
 */
export function base64ToUint8array(base64String: string): number[] {
  const buffer = Buffer.from(base64String, 'base64');
  return Array.from(buffer);
}

/**
 * Convert a value to a 32-byte nonce
 * @param value The value to convert
 * @returns The converted nonce
 */
export function convertNonce(value: string | Buffer | number[]): Buffer {
  if (Buffer.isBuffer(value)) {
    if (value.length > 32) {
      throw new Error("Invalid nonce length");
    }
    if (value.length < 32) {
      const newBuffer = Buffer.alloc(32, 0);
      value.copy(newBuffer, 32 - value.length);
      return newBuffer;
    }
    return value;
  } else if (typeof value === 'string') {
    const nonceBytes = Buffer.from(value, 'utf-8');
    if (nonceBytes.length > 32) {
      throw new Error("Invalid nonce length");
    }
    if (nonceBytes.length < 32) {
      const newBuffer = Buffer.alloc(32, 0);
      nonceBytes.copy(newBuffer, 32 - nonceBytes.length);
      return newBuffer;
    }
    return nonceBytes;
  } else if (Array.isArray(value)) {
    if (value.length !== 32) {
      throw new Error("Invalid nonce length");
    }
    return Buffer.from(value);
  } else {
    throw new Error("Invalid nonce format");
  }
}

/**
 * Payload class for intent serialization
 */
export class Payload {
  message: string;
  nonce: number[];
  recipient: string;
  callbackUrl: string | null;

  constructor(message: string, nonce: number[], recipient: string, callbackUrl: string | null) {
    this.message = message;
    this.nonce = nonce;
    this.recipient = recipient;
    this.callbackUrl = callbackUrl;
  }
}

// Schema for payload serialization
export const PAYLOAD_SCHEMA: any[] = [
  [
    Payload,
    {
      kind: "struct",
      fields: [
        ["message", "string"],
        ["nonce", [32]],
        ["recipient", "string"],
        [
          "callbackUrl",
          {
            kind: "option",
            type: "string",
          },
        ],
      ],
    },
  ]
];

/**
 * Serialize an intent
 * @param intentMessage The intent message
 * @param recipient The recipient
 * @param nonce The nonce
 * @returns The serialized intent hash
 */
export function serializeIntent(
  intentMessage: string,
  recipient: string,
  nonce: number[]
): Buffer {
  // Log input parameters
  console.log('Intent Message:', intentMessage);
  console.log('Recipient:', recipient);
  console.log('Original Nonce:', nonce);
  
  // Make sure nonce is exactly 32 bytes
  const nonceArray = Array.isArray(nonce) ? [...nonce] : [];
  while (nonceArray.length < 32) {
    nonceArray.push(0); // Pad with zeros if needed
  }
  const finalNonce = nonceArray.slice(0, 32); // Ensure it's exactly 32 bytes
  
  console.log('Final Nonce (length should be 32):', finalNonce.length, finalNonce);

  // Create payload with correct types
  const payload = new Payload(intentMessage, finalNonce, recipient, null);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    // Create schema as object instead of Map
    const schemaObj: Record<any, any> = {};
    for (const [key, value] of PAYLOAD_SCHEMA) {
      schemaObj[key] = value;
    }
    
    console.log('Using schema:', JSON.stringify(schemaObj, null, 2));
    
    // Create serializer with schema
    const serializer = new BinarySerializer(schemaObj);
    
    console.log('About to serialize payload...');
    const borshPayload = serializer.serialize(payload);
    console.log('Serialized payload length:', borshPayload.length);

    // U32 serialization for base_int
    const baseInt = 2 ** 31 + 413;
    const baseIntBuffer = Buffer.alloc(4);
    baseIntBuffer.writeUInt32LE(baseInt, 0);
    console.log('Base Int Buffer:', baseIntBuffer);

    // Combine data and hash
    const combinedData = Buffer.concat([baseIntBuffer, borshPayload]);
    console.log('Combined data length:', combinedData.length);
    
    return crypto.createHash('sha256').update(combinedData).digest();
  } catch (error: any) {
    console.error('Error during serialization:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}


/**
 * return the deposit address for a specific account and chain to Near-intents
 * @param accountId 
 * @param chain 
 * @returns 
 */
export async function getIntentsDepositAddress(accountId: string, chain: string): Promise<string> {
  try {
    const response = await axios.post('https://bridge.chaindefuser.com/rpc', {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "deposit_address",
      "params": [
        {
          "account_id": accountId,
          "chain": chain
        }
      ]
    }, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data && response.data.result && response.data.result.address) {
      return response.data.result.address;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error fetching deposit address:', error);
    throw error;
  }
}


/**
 * Get all supported tokens
 * @returns List of supported tokens
 */
async function getAllTokens(): Promise<any[]> {
  const response = await axios.get("https://api-mng-console.chaindefuser.com/api/tokens");
  return response.data?.items || [];
}



/**
 * Get the wallet balance for an account
 * @param env The environment
 * @param accountId The account ID
 * @param tokenData Token data
 * @returns Formatted balance information
 */
export async function _walletBalance(env: Environment, accountId: string, tokenData: any[]): Promise<string> {
  try {
    const response = await axios.get(`https://api.fastnear.com/v1/account/${accountId}/ft`);
    const tokens = response.data.tokens || [];
    
    let balanceOutput = '';
    
    for (const token of tokens) {
      const tokenInfo = tokenData.find(t => t.contract_address === token.contract_id);
      if (tokenInfo) {
        const symbol = tokenInfo.symbol;
        const decimals = tokenInfo.decimals;
        const balance = new Decimal(token.balance).div(new Decimal(10).pow(decimals)).toFixed();
        
        balanceOutput += `| ${symbol.padEnd(6)} | ${balance} |\n`;
      }
    }
    
    if (!balanceOutput) {
      return "No tokens found in wallet.";
    }
    
    return `| Token | Balance |\n|-------|--------|\n${balanceOutput}`;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return "Error getting wallet balance. Please try again later.";
  }
}

/**
 * Get the Intents balance for an account
 * @param env The environment
 * @param accountId The account ID
 * @param tokenData Token data
 * @returns Formatted balance information
 */
export async function getIntentsBalance(env: Environment, accountId: string, tokenData: any[]): Promise<Array<{ symbol: string, balance: string, intents_token_id: string } | []>> {
  try {
    const near = await env.set_near(accountId);
    const tokenIds = tokenData.map(token => token.intents_token_id).filter(Boolean);
    
    const result = await near.viewFunction({
      contractId: "intents.near",
      methodName: "mt_batch_balance_of",
      args: {
        account_id: accountId,
        token_ids: tokenIds
      }
    });
    
    const balanceOutput = [];
    
    for (let i = 0; i < tokenIds.length; i++) {
      if (result[i] && result[i] !== '0') {
        const token = tokenData.find(t => t.intents_token_id === tokenIds[i]);
        if (token) {
          const symbol = token.symbol;
          const decimals = token.decimals;
          const formattedBalance = new Decimal(result[i]).div(new Decimal(10).pow(decimals)).toFixed();
          const intents_token_id = token.intents_token_id;

          balanceOutput.push({
            symbol,
            balance: formattedBalance,
            intents_token_id: intents_token_id
          });
        }
      }
    }
    
    return balanceOutput;
  } catch (error) {
    console.error('Error getting Intents balance:', error);
    throw new Error("Error getting Intents balance. Please try again later.");
  }
}