import { SolanaMonitor } from './solanaMonitor.js';
import { TransactionAnalyzer } from './transactionAnalyzer.js';
import { AlertManager } from './alertManager.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { PriceService } from './priceService.js';
import { ChartService } from './chartService.js';

class NylaAlertBot {
  constructor() {
    this.monitor = new SolanaMonitor();
    this.analyzer = new TransactionAnalyzer(config.nyla.mintAddress);
    this.alertManager = new AlertManager();
    this.processedSignatures = new Set();
  }

  async start() {
    try {
      if (!config.nyla.mintAddress) {
        logger.error('Nyla mint address not configured. Please set NYLA_MINT_ADDRESS in .env file');
        process.exit(1);
      }

      logger.info('Starting Nyla Coin Alert Bot...');
      logger.info(`Monitoring token: ${config.nyla.mintAddress}`);
      logger.info(`Minimum transaction amount: ${config.nyla.minTransactionAmount} NYLA`);
      logger.info(`Minimum transaction value: $${config.nyla.minTransactionValueUsd} USD`);
      
      // Display initial price info
      const priceService = new PriceService();
      const chartService = new ChartService();
      const initialPrice = await priceService.getCurrentPrice();
      if (initialPrice) {
        logger.info(`Current Nyla price: ${priceService.formatPrice(initialPrice.priceUsd)} (${priceService.formatPercentage(initialPrice.priceChange24h)})`);
        logger.info(`24h Volume: ${priceService.formatVolume(initialPrice.volume24h)}`);
        chartService.addPricePoint(initialPrice.priceUsd);
      }
      
      // Start price monitoring for chart updates
      setInterval(async () => {
        try {
          const price = await priceService.getCurrentPrice();
          if (price) {
            chartService.addPricePoint(price.priceUsd);
            logger.debug(`Price updated: ${priceService.formatPrice(price.priceUsd)}`);
          }
        } catch (error) {
          logger.error('Error updating price for chart:', error);
        }
      }, 60000); // Update every minute

      await this.monitor.startMonitoring(
        config.nyla.mintAddress,
        async (signature) => {
          if (this.processedSignatures.has(signature)) {
            return;
          }
          this.processedSignatures.add(signature);
          
          setTimeout(() => {
            this.processedSignatures.delete(signature);
          }, 300000);

          logger.info(`Processing transaction: ${signature}`);
          
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const analysis = await this.analyzer.analyzeTransaction(
            this.monitor.connection,
            signature
          );

          if (analysis && analysis.length > 0) {
            logger.info(`Found ${analysis.length} Nyla transactions`);
            
            // Get current price for USD value calculation
            const currentPrice = await priceService.getCurrentPrice();
            logger.info(`Using price: $${currentPrice?.priceUsd || 'N/A'} for value calculation`);
            
            for (const transaction of analysis) {
              const transactionValueUsd = currentPrice ? transaction.amount * currentPrice.priceUsd : 0;
              logger.info(`Transaction: ${transaction.type} ${transaction.amount.toFixed(2)} NYLA ($${transactionValueUsd.toFixed(2)} USD)`);
              
              // Check transaction type filter
              const typeFilter = config.nyla.transactionTypeFilter;
              if (typeFilter === 'BUY_ONLY' && transaction.type !== 'BUY') {
                logger.info(`Skipping: SELL transaction (filter set to BUY_ONLY)`);
              } else if (typeFilter === 'SELL_ONLY' && transaction.type !== 'SELL') {
                logger.info(`Skipping: BUY transaction (filter set to SELL_ONLY)`);
              } else if (transaction.amount < config.nyla.minTransactionAmount) {
                logger.info(`Skipping: Below NYLA threshold (${transaction.amount} < ${config.nyla.minTransactionAmount})`);
              } else if (transactionValueUsd < config.nyla.minTransactionValueUsd) {
                logger.info(`Skipping: Below USD threshold ($${transactionValueUsd.toFixed(2)} < $${config.nyla.minTransactionValueUsd})`);
              } else {
                logger.info(`✅ Sending alert: ${transaction.type} transaction meets all thresholds`);
                await this.alertManager.sendAlert(transaction);
              }
            }
          } else {
            logger.info(`No DEX trades found in transaction ${signature}`);
          }
        }
      );

      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  stop() {
    logger.info('Stopping Nyla Alert Bot...');
    this.monitor.stopMonitoring();
    process.exit(0);
  }
}

const bot = new NylaAlertBot();
bot.start();