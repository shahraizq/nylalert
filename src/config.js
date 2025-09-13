import dotenv from 'dotenv';
import { Validator } from './security/validator.js';
import { logger } from './logger.js';

dotenv.config();

// Security: Validate all config values
const rawConfig = {
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    commitment: 'confirmed'
  },
  nyla: {
    mintAddress: process.env.NYLA_MINT_ADDRESS || '',
    minTransactionAmount: parseFloat(process.env.MIN_TRANSACTION_AMOUNT || '100'),
    minTransactionValueUsd: parseFloat(process.env.MIN_TRANSACTION_VALUE_USD || '0'),
    transactionTypeFilter: process.env.TRANSACTION_TYPE_FILTER || 'ALL',
    priceApiUrl: 'https://api.dexscreener.com/latest/dex/tokens'
  },
  alerts: {
    webhookUrl: process.env.ALERT_WEBHOOK_URL || '',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || ''
    }
  }
};

// Validate configuration
const validationErrors = Validator.validateConfig(rawConfig);
if (validationErrors.length > 0) {
  logger.error('Configuration validation failed:', validationErrors);
  process.exit(1);
}

export const config = rawConfig;