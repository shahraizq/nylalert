import notifier from 'node-notifier';
import { logger } from './logger.js';
import { config } from './config.js';
import { PriceService } from './priceService.js';
import { ChartService } from './chartService.js';
import { ChartGenerator } from './chartGenerator.js';
import { discordRateLimiter } from './security/rateLimiter.js';

export class AlertManager {
  constructor() {
    this.alertHistory = new Map();
    this.cooldownPeriod = 60000; // 1 minute cooldown per address
    this.priceService = new PriceService();
    this.chartService = new ChartService();
    this.chartGenerator = new ChartGenerator();
  }

  async sendAlert(transaction) {
    const alertKey = `${transaction.from}-${transaction.to}`;
    const lastAlert = this.alertHistory.get(alertKey);
    
    if (lastAlert && Date.now() - lastAlert < this.cooldownPeriod) {
      logger.debug('Skipping alert due to cooldown period');
      return;
    }

    const message = this.formatAlertMessage(transaction);
    
    this.sendDesktopNotification(transaction.type, message);
    
    // Send Discord alert
    if (config.alerts.discordWebhookUrl) {
      await this.sendDiscordAlert(transaction);
    }
    
    if (config.alerts.telegram.botToken && config.alerts.telegram.chatId) {
      await this.sendTelegramAlert(message);
    }
    
    if (config.alerts.webhookUrl) {
      await this.sendWebhookAlert(transaction);
    }

    this.alertHistory.set(alertKey, Date.now());
    logger.info(`Alert sent for ${transaction.type} transaction`, transaction);
  }

  formatAlertMessage(transaction) {
    const emoji = transaction.type === 'BUY' ? '🟢' : '🔴';
    const action = transaction.type === 'BUY' ? 'BOUGHT' : 'SOLD';
    
    return `${emoji} ${action} ${transaction.amount.toFixed(2)} NYLA\n` +
           `From: ${transaction.from ? transaction.from.slice(0, 8) : 'Unknown'}...\n` +
           `To: ${transaction.to ? transaction.to.slice(0, 8) : 'Unknown'}...\n` +
           `Time: ${transaction.timestamp.toLocaleString()}\n` +
           `TX: ${transaction.signature.slice(0, 16)}...`;
  }

  sendDesktopNotification(type, message) {
    notifier.notify({
      title: `Nyla Coin ${type} Alert`,
      message: message,
      sound: true,
      wait: false
    });
  }

  async sendTelegramAlert(message) {
    try {
      const url = `https://api.telegram.org/bot${config.alerts.telegram.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.alerts.telegram.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      if (!response.ok) {
        logger.error('Failed to send Telegram alert:', await response.text());
      }
    } catch (error) {
      logger.error('Error sending Telegram alert:', error);
    }
  }

  async sendWebhookAlert(transaction) {
    try {
      const response = await fetch(config.alerts.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transaction.type,
          amount: transaction.amount,
          from: transaction.from,
          to: transaction.to,
          signature: transaction.signature,
          timestamp: transaction.timestamp,
          fee: transaction.fee
        })
      });
      
      if (!response.ok) {
        logger.error('Failed to send webhook alert:', await response.text());
      }
    } catch (error) {
      logger.error('Error sending webhook alert:', error);
    }
  }

  async sendDiscordAlert(transaction) {
    try {
      const emoji = transaction.type === 'BUY' ? '🟢' : '🔴';
      const color = transaction.type === 'BUY' ? 0x22c55e : 0xef4444;
      const action = transaction.type === 'BUY' ? 'BOUGHT' : 'SOLD';
      
      // Fetch current price
      const priceData = await this.priceService.getCurrentPrice();
      
      // Update chart with current price
      if (priceData) {
        this.chartService.addPricePoint(priceData.priceUsd);
      }
      
      // Generate chart
      const chartData = this.chartService.generateAsciiChart(priceData?.priceUsd);
      
      // Generate real chart image
      let chartBuffer = null;
      if (this.chartService.priceHistory.length > 2) {
        chartBuffer = await this.chartGenerator.generatePriceChart(
          this.chartService.priceHistory,
          priceData?.priceUsd,
          chartData?.trend || 'neutral'
        );
      }
      
      // Determine market sentiment emoji based on transaction type and trend
      let marketSentiment = '';
      if (chartData?.trend === 'uptrend' && transaction.type === 'BUY') {
        marketSentiment = ' 🐂💚';
      } else if (chartData?.trend === 'downtrend' && transaction.type === 'SELL') {
        marketSentiment = ' 🐻❤️';
      } else if (chartData?.trend === 'uptrend' && transaction.type === 'SELL') {
        marketSentiment = ' ⚠️';
      } else if (chartData?.trend === 'downtrend' && transaction.type === 'BUY') {
        marketSentiment = ' 🔥';
      }
      
      const embed = {
        embeds: [{
          title: `${emoji} Nyla Coin ${transaction.type} Alert${marketSentiment}`,
          description: `**${action} ${transaction.amount.toFixed(2)} NYLA**\n${chartData?.trendIndicator || ''}`,
          color: color,
          fields: [
            {
              name: '💰 Current Price',
              value: priceData ? `${this.priceService.formatPrice(priceData.priceUsd)} (${this.priceService.formatPercentage(priceData.priceChange24h)})` : 'N/A',
              inline: true
            },
            {
              name: '💵 Transaction Value',
              value: priceData ? `$${(transaction.amount * priceData.priceUsd).toFixed(2)}` : 'N/A',
              inline: true
            },
            {
              name: '📊 24h Volume',
              value: priceData ? this.priceService.formatVolume(priceData.volume24h) : 'N/A',
              inline: true
            },
            {
              name: '📈 Price Trend',
              value: chartData ? this.chartService.getTrendEmoji(chartData.trend) : 'N/A',
              inline: true
            },
            {
              name: '💥 Market Impact',
              value: priceData ? this.chartService.getTransactionImpact(transaction.amount * priceData.priceUsd, transaction.type, priceData.liquidity) : 'Unknown',
              inline: true
            },
            {
              name: '📊 Session Change',
              value: chartData ? `${chartData.priceChange >= 0 ? '+' : ''}${chartData.priceChange.toFixed(2)}%` : 'N/A',
              inline: true
            },
            {
              name: 'From',
              value: `\`${transaction.from ? transaction.from.slice(0, 20) + '...' : 'Unknown'}\``,
              inline: true
            },
            {
              name: 'To',
              value: `\`${transaction.to ? transaction.to.slice(0, 20) + '...' : 'Unknown'}\``,
              inline: true
            },
            {
              name: 'Fee',
              value: `${transaction.fee} SOL`,
              inline: true
            },
            {
              name: '🌊 Liquidity',
              value: priceData ? this.priceService.formatVolume(priceData.liquidity) : 'N/A',
              inline: true
            },
            {
              name: '💎 Market Cap',
              value: priceData ? this.priceService.formatVolume(priceData.marketCap) : 'N/A',
              inline: true
            },
            {
              name: '\u200B',
              value: '\u200B',
              inline: true
            },
            {
              name: 'Transaction',
              value: `[View on Solscan](https://solscan.io/tx/${transaction.signature})`
            },
            {
              name: `📊 Price Chart ${chartData ? chartData.trend === 'uptrend' ? '🐂🟢' : chartData.trend === 'downtrend' ? '🐻🔴' : '🦀' : ''}`,
              value: this.generateEnhancedChart(chartData, this.chartService.priceHistory, priceData?.priceUsd),
              inline: false
            }
          ],
          timestamp: transaction.timestamp.toISOString(),
          footer: {
            text: `Nyla Coin Alert Bot${priceData?.dexId ? ` • ${priceData.dexId}` : ''}`
          }
        }]
      };

      // Check rate limit before sending
      const rateLimitCheck = await discordRateLimiter.checkLimit('discord');
      if (!rateLimitCheck.allowed) {
        logger.warn(`Discord rate limit exceeded, waiting ${rateLimitCheck.resetIn}ms`);
        await new Promise(resolve => setTimeout(resolve, rateLimitCheck.resetIn));
      }
      
      // Send with timeout protection
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const response = await fetch(config.alerts.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(embed),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
      
      if (!response.ok) {
        logger.error('Failed to send Discord alert:', await response.text());
        } else {
          logger.info('Discord alert sent successfully');
        }
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          logger.error('Discord webhook timeout after 10 seconds');
        } else {
          logger.error('Error sending Discord alert:', error.message);
        }
      }
    } catch (error) {
      logger.error('Error in sendDiscordAlert:', error.message);
    }
  }

  generateEnhancedChart(chartData, priceHistory, currentPrice) {
    if (!chartData || priceHistory.length < 2) {
      return '```\nInsufficient data for chart\n```';
    }

    try {
      const width = 30;
      const height = 10;
      
      // Get price range with padding
      const prices = [...priceHistory.map(p => p.price), currentPrice].filter(p => p);
      const minPrice = Math.min(...prices) * 0.98;
      const maxPrice = Math.max(...prices) * 1.02;
      const priceRange = maxPrice - minPrice;
      
      // Create visual bars using block characters
      const bars = [];
      const dataPoints = Math.min(priceHistory.length, 20);
      const startIdx = Math.max(0, priceHistory.length - dataPoints);
      
      // Generate sparkline-style chart
      const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      let sparkline = '';
      let prevPrice = null;
      
      for (let i = 0; i < dataPoints; i++) {
        const price = priceHistory[startIdx + i].price;
        const normalized = (price - minPrice) / priceRange;
        const charIndex = Math.floor(normalized * (sparkChars.length - 1));
        const char = sparkChars[Math.max(0, Math.min(charIndex, sparkChars.length - 1))];
        
        // Add trend indicator every few bars
        if (i % 3 === 0 && prevPrice !== null) {
          if (price > prevPrice * 1.001) {
            sparkline += '🟢';
          } else if (price < prevPrice * 0.999) {
            sparkline += '🔴';
          } else {
            sparkline += '⚪';
          }
        }
        
        sparkline += char;
        prevPrice = price;
      }
      
      // Add current price indicator
      if (currentPrice && prevPrice) {
        if (currentPrice > prevPrice * 1.001) {
          sparkline += '🟢📈';
        } else if (currentPrice < prevPrice * 0.999) {
          sparkline += '🔴📉';
        } else {
          sparkline += '⚪➡️';
        }
      }
      
      // Create the formatted output
      const lines = [];
      
      // Header with trend
      const trendEmoji = chartData.trend === 'uptrend' ? '📈🟢' : 
                        chartData.trend === 'downtrend' ? '📉🔴' : '➡️⚪';
      
      lines.push(`**Price Chart** ${trendEmoji}`);
      lines.push('```');
      lines.push(`High: ${this.priceService.formatPrice(maxPrice)}`);
      lines.push(`${sparkline}`);
      lines.push(`Low:  ${this.priceService.formatPrice(minPrice)}`);
      lines.push('```');
      
      // Add legend
      lines.push('`🟢 Up` `🔴 Down` `⚪ Flat`');
      
      // Time range
      const now = new Date();
      const past = new Date(priceHistory[0].timestamp);
      lines.push(`\`${past.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} → ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\``);
      
      return lines.join('\n');
    } catch (error) {
      logger.error('Error generating enhanced chart:', error);
      return '```\nError generating chart\n```';
    }
  }
}