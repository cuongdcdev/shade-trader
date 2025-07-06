import axios from 'axios';
import { Decimal } from 'decimal.js';
import * as fs from 'fs';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import * as nacl from 'tweetnacl';
import { Environment } from './environment';
import { 
  addPublicKey, 
  getSwapMessageToSign, 
  getIntentSettledStatus, 
  generateNonce, 
  base64ToUint8array, 
  serializeIntent 
} from './utils';

// Constants
const defaultMainnetRpc = "https://free.rpc.fastnear.com";
const INTENTS_CONTRACT = "intents.near";
const url = "https://solver-relay-v2.chaindefuser.com/rpc";
const headers = { "Content-Type": "application/json" };
const ED_PREFIX = "ed25519:";

export interface SwapResult{
  txHash: string;
  amountOut: string;

}
// Load token data
// const tokenDataList = JSON.parse(fs.readFileSync('./token_list.json', 'utf-8'));

/**
 * Swap tokens in the Intents contract
 * @param env The environment
 * @param tokenIn Input token symbol
 * @param tokenOut Output token symbol
 * @param amountIn Input amount
 * @param tokenData Token data
 * @param contractIn Optional input contract address
 * @param contractOut Optional output contract address
 * @returns Amount of output token received
 */
export async function intentSwap(
  env: Environment, 
  tokenIn: string, 
  tokenOut: string, 
  amountIn: string,
  tokenData: any[], 
  contractIn: string = "", 
  contractOut: string = ""
): Promise<SwapResult | false> {
  console.log("[near-intents] Supported Token List: " , tokenData.length)
  // Get the token list for the input token
  const tokenList = tokenData.filter((obj: any) => obj.symbol.toLowerCase() === tokenIn.toLowerCase());
  
  // Get matches for the input token
  const matchesIn = tokenData.filter((obj: any) => obj.symbol.toLowerCase() === tokenIn.toLowerCase());
  
  if (!matchesIn.length) {
    console.log(`Token In ${tokenIn} may not be supported. Please confirm your token again.`);
    return false;
  }
  
  // Find the specific token data based on contract ID if provided
  const tokenDataIn = contractIn 
    ? matchesIn.find((obj: any) => obj.intents_token_id === contractIn)
    : matchesIn[0];
    
  if (!tokenDataIn) {
    console.log(`Token In ${tokenIn} with contract ${contractIn} may not be supported. Please confirm your token again.`);
    return false;
  }
  
  const userAccountId = env.wallet.ACCOUNT_ID || '';
  const userPrivateKey = env.wallet.PRIVATE_KEY || '';
  
  const near = await env.set_near(userAccountId, userPrivateKey);
  
  // Check if we need to perform multiple swaps to gather enough of the input token
  if (tokenList.length > 1) {
    const contractList = tokenList.map((obj: any) => obj.intents_token_id);
    
    // Get balances for all token variants
    const balanceResult = await near.viewFunction({
      contractId: "intents.near",
      methodName: "mt_batch_balance_of",
      args: {
        account_id: userAccountId,
        token_ids: contractList,
      }
    });
    
    // Find the index of our target input token
    const targetIndex = contractList.indexOf(tokenDataIn.intents_token_id);
    
    // Convert balances to human-readable format
    let result = balanceResult.map((balance: string, index: number) => {
      return new Decimal(balance).div(
        new Decimal(10).pow(tokenList[index].decimals)
      ).toString();
    });
    
    // Check if we need to swap other variants to get enough of our target
    for (let i = 0; i < tokenList.length; i++) {
      if (i === targetIndex || new Decimal(result[i]).equals(0)) {
        continue;
      }
      
      // If we already have enough of our target token, break
      if (new Decimal(result[targetIndex]).gte(new Decimal(amountIn))) {
        break;
      }
      
      // Swap this variant to our target token
      const swapRs = await _intentSwap(
        env, 
        tokenList[i].symbol, 
        tokenDataIn.symbol, 
        result[i], 
        tokenData, 
        tokenList[i].intents_token_id, 
        tokenDataIn.intents_token_id
      );
      
      // Update balances
      result[i] = '0';
      result[targetIndex] = new Decimal(result[targetIndex]).plus( swapRs ?  swapRs.amountOut : 0 ).toString();
    }
  }
  
  // Perform the main swap
  return await _intentSwap(env, tokenIn, tokenOut, amountIn, tokenData, contractIn, contractOut);
}

/**
 * Internal function to perform a token swap in the Intents contract
 * @param env The environment
 * @param tokenIn Input token symbol
 * @param tokenOut Output token symbol
 * @param amountIn Input amount
 * @param tokenData Token data
 * @param contractIn Optional input contract address
 * @param contractOut Optional output contract address
 * @returns Amount of output token received or false if failed
 */
async function _intentSwap(
  env: Environment,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  tokenData: any[],
  contractIn: string = "",
  contractOut: string = ""
): Promise<SwapResult | false> {
  const userAccountId = env.wallet.ACCOUNT_ID || '';
  const userPrivateKey = env.wallet.PRIVATE_KEY || '';
  
  // Get matches for the input and output tokens
  const matchesIn = tokenData.filter((obj: any) => obj.symbol === tokenIn.toUpperCase());
  if (!matchesIn.length) {
    return false;
  }
  
  const matchesOut = tokenData.filter((obj: any) => obj.symbol === tokenOut.toUpperCase());
  if (!matchesOut.length) {
    console.log(`Token Out ${tokenOut} may not be supported. Please confirm your token again.`);
    return false;
  }
  
  // Find the specific token data based on contract ID if provided
  const tokenDataIn = contractIn 
    ? matchesIn.find((obj: any) => obj.intents_token_id === contractIn)
    : matchesIn[0];
    
  if (!tokenDataIn) {
    console.log(`Token In ${tokenIn} with contract ${contractIn} may not be supported. Please confirm your token again.`);
    return false;
  }
  
  const tokenDataOut = contractOut 
    ? matchesOut.find((obj: any) => obj.intents_token_id === contractOut)
    : matchesOut[0];
    
  if (!tokenDataOut) {
    return false;
  }
  
  // Convert input amount to the token's decimals
  const amount = new Decimal(amountIn)
    .mul(new Decimal(10).pow(tokenDataIn.decimals))
    .toFixed(0);
  
  // Get current balance of the input token
  const near = await env.set_near(userAccountId);
  const balanceResult = await near.viewFunction({
    contractId: "intents.near",
    methodName: "mt_batch_balance_of",
    args: {
      account_id: userAccountId,
      token_ids: [tokenDataIn.intents_token_id],
    }
  });
  
  // Adjust amount if it exceeds available balance
  let swapAmount = amount;
  if (new Decimal(amount).gt(new Decimal(balanceResult[0]))) {
    swapAmount = balanceResult[0];
  }
  
  // Get a quote for the swap
  const quoteData = {
    id: 1,
    jsonrpc: "2.0",
    method: "quote",
    params: [
      {
        defuse_asset_identifier_in: tokenDataIn.intents_token_id,
        defuse_asset_identifier_out: tokenDataOut.intents_token_id,
        exact_amount_in: swapAmount.toString()
      }
    ]
  };
  
  // Make the quote request with retries
  const maxRetries = 5;
  const retryDelay = 1000;
  let quoteResponse;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, quoteData, { headers });
      
      if (response.data.result) {
        quoteResponse = response.data;
        break;
      } else {
        console.log(`Empty result on attempt ${attempt + 1}. Retrying in ${retryDelay/1000} second(s)...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      env.add_reply(`HTTP error occurred: ${error}`);
      if (attempt === maxRetries - 1) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  if (!quoteResponse || !quoteResponse.result || !quoteResponse.result.length) {
    env.add_reply("Error: result is not provided");
    return false;
  }
  
  // Find the best quote (highest amount_out)
  let bestQuote = quoteResponse.result[0];
  for (const quote of quoteResponse.result) {
    if (new Decimal(quote.amount_out).gt(new Decimal(bestQuote.amount_out))) {
      bestQuote = quote;
    }
  }
  
  const quoteHash = bestQuote.quote_hash;
  const finalAmountIn = bestQuote.amount_in;
  const amountOut = bestQuote.amount_out;
  const expirationTime = bestQuote.expiration_time;
  
  if (!finalAmountIn || !expirationTime || !quoteHash) {
    env.add_reply(`Error with quote data`);
    return false;
  }
  
  // Create the swap message to sign
  const messageStr = getSwapMessageToSign(
    userAccountId,
    tokenDataIn.intents_token_id,
    finalAmountIn,
    tokenDataOut.intents_token_id,
    amountOut,
    expirationTime
  );
  
  // Generate nonce and prepare for signing
  const nonce = generateNonce();
  const quoteHashes = [quoteHash];
  const nonceUint8array = base64ToUint8array(nonce);
  console.log(`serializing intents: ${messageStr}, nonce: ${nonce}, quoteHash: ${quoteHash}`);
  // return;
  const quoteHashSolver = serializeIntent(messageStr, INTENTS_CONTRACT, nonceUint8array);
  
  // Sign the message
  // Remove the ED_PREFIX if present
  const privateKeyBase58 = userPrivateKey.startsWith(ED_PREFIX) 
    ? userPrivateKey.substring(ED_PREFIX.length) 
    : userPrivateKey;
    
  const privateKeyBytes = bs58.decode(privateKeyBase58);
  
  if (privateKeyBytes.length !== 64) {
    throw new Error("The private key must be exactly 64 bytes long");
  }
  
  // Get the seed and create a signing key
  const privateKeySeed = privateKeyBytes.slice(0, 32);
  const signingKeyPair = nacl.sign.keyPair.fromSeed(privateKeySeed);
  
  // Sign the hash
  const signature = nacl.sign.detached(Buffer.from(quoteHashSolver), signingKeyPair.secretKey);
  const finalSignature = bs58.encode(signature);
  
  // Get public key
  const publicKeyBase58 = bs58.encode(signingKeyPair.publicKey);
  const fullPublicKey = `${ED_PREFIX}${publicKeyBase58}`;
  
  // Add public key to the contract
  await addPublicKey(env, fullPublicKey);
  
  // Create the intent publish request
  const publishRequest = {
    id: 1,
    jsonrpc: "2.0",
    method: "publish_intent",
    params: [
      {
        quote_hashes: quoteHashes,
        signed_data: {
          payload: {
            message: messageStr,
            nonce: nonce,
            recipient: INTENTS_CONTRACT,
          },
          standard: "nep413",
          signature: `ed25519:${finalSignature}`,
          public_key: `ed25519:${publicKeyBase58}`,
        }
      }
    ]
  };
  
  // Publish the intent and wait for settlement
  let intentResponse, settled, intentHash, amountInUsd, amountOutUsd, result;
  
  [intentResponse, settled, intentHash, amountInUsd, amountOutUsd, result] = await makeIntentSwap(
    publishRequest,
    tokenDataOut.symbol,
    finalAmountIn,
    tokenDataIn.decimals,
    amountOut,
    tokenDataOut.decimals
  );
  
  // Retry if not settled
  if (!settled) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    [intentResponse, settled, intentHash, amountInUsd, amountOutUsd, result] = await makeIntentSwap(
      publishRequest,
      tokenDataOut.symbol,
      finalAmountIn,
      tokenDataIn.decimals,
      amountOut,
      tokenDataOut.decimals
    );
    
    // One more retry if still not settled
    if (!settled) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      [intentResponse, settled, intentHash, amountInUsd, amountOutUsd, result] = await makeIntentSwap(
        publishRequest,
        tokenDataOut.symbol,
        finalAmountIn,
        tokenDataIn.decimals,
        amountOut,
        tokenDataOut.decimals
      );
    }
  }
  
  // Handle successful settlement
  if (settled) {
    const transactionHash = result.result.data.hash;
    const finalAmountOut = new Decimal(amountOut)
      .div(new Decimal(10).pow(tokenDataOut.decimals))
      .toString();
      
    const finalAmountInHuman = new Decimal(finalAmountIn)
      .div(new Decimal(10).pow(tokenDataIn.decimals))
      .toString();
      
    env.add_reply(`Transaction Hash: ${transactionHash}`);
    const rsOut :SwapResult = {
      txHash: transactionHash,
      amountOut: finalAmountOut
    }
    return rsOut;
  } else {
    return false;
  }
}

/**
 * Make an intent swap request and check settlement
 * @param request The swap request
 * @param symbolOut Output token symbol
 * @param amountIn Input amount
 * @param tokenInDecimals Input token decimals
 * @param amountOut Output amount
 * @param tokenOutDecimals Output token decimals
 * @returns Swap result information
 */
async function makeIntentSwap(
  request: any,
  symbolOut: string,
  amountIn: string,
  tokenInDecimals: number,
  amountOut: string,
  tokenOutDecimals: number
): Promise<[any, boolean, string | false, string, string, any]> {
  try {
    console.log(`Making intent swap for ${amountIn} of ${symbolOut}...`);
    // Make the request
    const response = await axios.post(url, request, { headers });
    
    // Calculate USD values (for display purposes)
    const amountInUsd = (Number(amountIn) / Math.pow(10, tokenInDecimals)).toFixed(5);
    const amountOutUsd = (Number(amountOut) / Math.pow(10, tokenOutDecimals)).toFixed(5);
    
    if (response.data.result.status === "OK") {
      const intentHash = response.data.result.intent_hash;
      
      // Check if intent was settled
      const [settled, result] = await getIntentSettledStatus(intentHash);
      
      return [response.data, settled, intentHash, amountInUsd, amountOutUsd, result];
    } else {
      return [response.data, false, false, amountInUsd, amountOutUsd, response.data];
    }
  } catch (error) {
    console.error('Error making intent swap:', error);
    return [{}, false, false, '0', '0', { error: 'Request failed' }];
  }
}
