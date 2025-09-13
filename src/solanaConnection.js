import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './config.js';
import { logger } from './logger.js';

export class SolanaMonitor {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    this.subscriptionId = null;
  }

  async startMonitoring(mintAddress, onTransaction) {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      logger.info(`Starting to monitor Nyla coin: ${mintAddress}`);

      this.subscriptionId = this.connection.onLogs(
        mintPubkey,
        (logs, context) => {
          if (logs.err === null) {
            onTransaction(logs.signature, context);
          }
        },
        'confirmed'
      );

      logger.info('Monitoring started successfully');
      return this.subscriptionId;
    } catch (error) {
      logger.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  async getTransaction(signature) {
    try {
      const transaction = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      return transaction;
    } catch (error) {
      logger.error(`Failed to get transaction ${signature}:`, error);
      return null;
    }
  }

  stopMonitoring() {
    if (this.subscriptionId) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      logger.info('Monitoring stopped');
    }
  }
}