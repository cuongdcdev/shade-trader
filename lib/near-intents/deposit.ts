import axios from 'axios';
import { Decimal } from 'decimal.js';
import * as fs from 'fs';
import { Environment } from './environment';

// Constants
const defaultMainnetRpc = "https://free.rpc.fastnear.com";
const INTENTS_CONTRACT = "intents.near";
const url = "https://solver-relay-v2.chaindefuser.com/rpc";
const headers = { "Content-Type": "application/json" };
const ED_PREFIX = "ed25519:";
const FT_DEPOSIT_GAS = BigInt("30000000000000");
const FT_TRANSFER_GAS = BigInt("50000000000000");
const FT_MINIMUM_STORAGE_BALANCE_LARGE = BigInt("1250000000000000000000");

/**
 * Deposit tokens to the Intents contract
 * @param env The environment
 * @param data Token data
 * @param amount Amount to deposit
 * @param sender Sender address
 * @param token_symbol Token symbol
 * @returns True if deposit successful, false otherwise
 */
export async function depositToIntents(
  env: Environment,
  data: any[],
  amount: string,
  sender: string,
  token_symbol: string = ""
): Promise<boolean> {
  const supportedData = data;
  const userAccountId = env.wallet.ACCOUNT_ID || '';
  const userPrivateKey = env.wallet.PRIVATE_KEY || '';

  const matches = supportedData.filter((obj: any) =>
    obj.symbol === token_symbol.toUpperCase() && ['near'].includes(obj.blockchain)
  );

  if (!matches.length) {
    env.add_reply(`Token ${token_symbol} may not be supported. Please confirm your token again.`);
    return false;
  }

  const token = matches[0];

  // Handle NEAR token deposits
  const decimalAmount = new Decimal(amount).mul(new Decimal(10).pow(token.decimals));
  const amountInt = decimalAmount.toFixed(0);
  const contractId = token.intents_token_id.replace("nep141:", "");

  try {
    const near = await env.set_near(userAccountId, userPrivateKey);

    // Check storage balance
    const nep141balance = await near.viewFunction({
      contractId: "wrap.near",
      methodName: "storage_balance_of",
      args: { account_id: userAccountId }
    });

    let availableBalance = BigInt(0);
    if (nep141balance && nep141balance.available) {
      availableBalance = BigInt(nep141balance.available);
    }

    const storagePayment = FT_MINIMUM_STORAGE_BALANCE_LARGE - availableBalance;
    let transferResult: any;

    // Handle NEAR token (wrap.near)
    if (contractId === "wrap.near") {
      // Get current NEAR balance
      const tokenResponse = await axios.get(`https://api.fastnear.com/v1/account/${userAccountId}/ft`);
      tokenResponse.data.tokens = tokenResponse.data.tokens || [];

      const nearToken = tokenResponse.data.tokens.find((token: any) => token.contract_id === "wrap.near");
      const nearBalance = nearToken ? BigInt(nearToken.balance) : BigInt(0);

      const nearAmount = BigInt(amountInt) > nearBalance
        ? BigInt(amountInt) - nearBalance
        : BigInt(0);

      // Deposit NEAR if needed
      if (storagePayment > 0 || nearAmount > 0) {
        const tr = await near.functionCall({
          contractId,
          methodName: "near_deposit",
          args: {},
          gas: FT_DEPOSIT_GAS,
          attachedDeposit: storagePayment + nearAmount
        });

        // Check transaction success
        if (!tr.status) {
          return false;
        }
      }

      // Transfer to Intents contract
      transferResult = await near.functionCall({
        contractId,
        methodName: "ft_transfer_call",
        args: {
          receiver_id: INTENTS_CONTRACT,
          amount: amountInt,
          msg: ""
        },
        gas: FT_TRANSFER_GAS,
        attachedDeposit: BigInt(1)
      });

      // Check transaction success
      if (!transferResult.status) {
        return false;
      }
    }else {
      //TODO: optimize nept141 token storage deposit later

      // Handle other tokens
      if (storagePayment > 0) {
        const storageTr = await near.functionCall({
          contractId,
          methodName: "storage_deposit",
          args: {
            account_id: INTENTS_CONTRACT
          },
          gas: FT_DEPOSIT_GAS,
          attachedDeposit: storagePayment
        });

        // Check transaction success
        if (!storageTr.status) {
          return false;
        }
      }

      // Transfer to Intents contract
      transferResult = await near.functionCall({
        contractId,
        methodName: "ft_transfer_call",
        args: {
          receiver_id: INTENTS_CONTRACT,
          amount: amountInt,
          msg: ""
        },
        gas: FT_TRANSFER_GAS,
        attachedDeposit: BigInt(1)
      });

      // Check transaction success
      if (!transferResult.status) {
        return false;
      }
    }

    // Calculate human-readable amount
    const displayAmount = new Decimal(amountInt).div(new Decimal(10).pow(token.decimals)).toFixed();

    // Add transaction hash to reply if available
    if (transferResult && transferResult.transaction && transferResult.transaction.hash) {
      env.add_reply(`Deposited ${displayAmount} ${token.symbol} to Intents contract.`);
      env.add_reply(`Transaction Hash: ${transferResult.transaction.hash}`);

    }

    return true;
  } catch (error) {
    console.error('Error depositing to Intents:', error);
    return false;
  }
}
