import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './config.js';
import { logger } from './logger.js';

export class SolanaMonitor {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment,
      wsEndpoint: null // Disable WebSocket to avoid 401 errors
    });
    this.lastSignature = null;
    this.isMonitoring = false;
  }

  async startMonitoring(mintAddress, onTransaction) {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      logger.info(`Starting to monitor Nyla coin: ${mintAddress}`);
      
      this.isMonitoring = true;
      
      // Polling approach instead of WebSocket
      const pollInterval = setInterval(async () => {
        if (!this.isMonitoring) {
          clearInterval(pollInterval);
          return;
        }
        
        try {
          // Get recent signatures for the token
          const signatures = await this.connection.getSignaturesForAddress(
            mintPubkey,
            {
              limit: 10, // Reduced to avoid rate limits
              until: this.lastSignature
            }
          );
          
          if (signatures.length > 0) {
            // Process new transactions
            const newSignatures = signatures.filter(sig => !sig.err);
            
            if (newSignatures.length > 0) {
              // Update last signature
              this.lastSignature = newSignatures[0].signature;
              
              // Process each new transaction with rate limiting
              for (const sigInfo of newSignatures.reverse()) {
                try {
                  await onTransaction(sigInfo.signature, {
                    slot: sigInfo.slot,
                    blockTime: sigInfo.blockTime
                  });
                  // Small delay between transactions
                  await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                  logger.debug(`Skipping transaction ${sigInfo.signature} due to error`);
                }
              }
            }
          }
        } catch (error) {
          if (error.message?.includes('429') || error.message?.includes('Too many requests')) {
            logger.debug('Rate limit hit, will retry next interval');
          } else {
            logger.error('Error polling for transactions:', error);
          }
        }
      }, 15000); // Poll every 15 seconds to avoid rate limits
      
      logger.info('Monitoring started successfully (polling mode)');
      return pollInterval;
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
    this.isMonitoring = false;
    logger.info('Monitoring stopped');
  }
}