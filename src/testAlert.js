import { AlertManager } from './alertManager.js';
import { logger } from './logger.js';

async function testDiscordAlert() {
  const alertManager = new AlertManager();
  
  // Add some fake price history for chart demo with timestamps
  const prices = [0.00012, 0.00011, 0.00013, 0.00014, 0.00013, 0.00015, 0.00016, 0.00014, 0.00017, 0.00018];
  const now = Date.now();
  for (let i = 0; i < prices.length; i++) {
    const timestamp = new Date(now - (prices.length - i) * 5 * 60 * 1000); // 5 minutes apart
    alertManager.chartService.addPricePoint(prices[i], timestamp);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const testTransaction = {
    type: 'BUY',
    amount: 1234.56,
    from: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
    to: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    signature: '5eykt4UsFv8P8NJdTREpY2vzHKJLpDp6vKEHAZvA3pCpPQJBdg',
    timestamp: new Date(),
    fee: 0.000005
  };
  
  logger.info('Sending test alert with price chart to Discord...');
  await alertManager.sendAlert(testTransaction);
  logger.info('Test alert sent! Check your Discord channel.');
  
  setTimeout(() => {
    logger.info('Test complete. You can close this with Ctrl+C');
  }, 2000);
}

testDiscordAlert().catch(error => {
  logger.error('Test failed:', error);
});