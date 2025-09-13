import { logger } from './logger.js';

export class ChartService {
  constructor() {
    this.priceHistory = [];
    this.maxHistoryLength = 20;
    this.maxDataAge = 2 * 60 * 60 * 1000; // 2 hours
  }
  
  // Security: Clean up old data to prevent memory leaks
  cleanupOldData() {
    const cutoffTime = Date.now() - this.maxDataAge;
    this.priceHistory = this.priceHistory.filter(
      point => point.timestamp.getTime() > cutoffTime
    );
  }

  addPricePoint(price, timestamp = new Date()) {
    // Security: Validate price input
    if (typeof price !== 'number' || price < 0 || price > Number.MAX_SAFE_INTEGER) {
      logger.warn('Invalid price value rejected:', price);
      return;
    }
    
    this.priceHistory.push({ price, timestamp });
    
    // Keep only recent history
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }
    
    // Periodically clean up old data
    if (Math.random() < 0.1) { // 10% chance on each call
      this.cleanupOldData();
    }
  }

  generateAsciiChart(currentPrice) {
    if (this.priceHistory.length < 2) {
      return null;
    }

    const chartHeight = 8;
    const chartWidth = Math.min(this.priceHistory.length, 20);
    
    // Get price range
    const prices = [...this.priceHistory.map(p => p.price), currentPrice];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Prevent division by zero
    if (priceRange === 0) {
      return this.generateFlatChart(currentPrice);
    }

    // Create chart grid
    const chart = Array(chartHeight).fill(null).map(() => Array(chartWidth).fill('　'));
    
    // Plot prices
    for (let i = 0; i < this.priceHistory.length && i < chartWidth; i++) {
      const price = this.priceHistory[i].price;
      const normalizedPrice = (price - minPrice) / priceRange;
      const y = Math.floor((1 - normalizedPrice) * (chartHeight - 1));
      
      // Determine character based on trend
      let char = '•';
      if (i > 0) {
        const prevPrice = this.priceHistory[i - 1].price;
        if (price > prevPrice) char = '📈';
        else if (price < prevPrice) char = '📉';
        else char = '➡️';
      }
      
      chart[y][i] = char;
    }

    // Add current price point
    if (currentPrice && this.priceHistory.length > 0) {
      const normalizedCurrent = (currentPrice - minPrice) / priceRange;
      const y = Math.floor((1 - normalizedCurrent) * (chartHeight - 1));
      const x = Math.min(this.priceHistory.length, chartWidth - 1);
      
      const lastPrice = this.priceHistory[this.priceHistory.length - 1].price;
      let char = '🟡';
      if (currentPrice > lastPrice) char = '🟢';
      else if (currentPrice < lastPrice) char = '🔴';
      
      if (x < chartWidth) {
        chart[y][x] = char;
      }
    }

    // Convert to string
    const chartLines = chart.map(row => row.join('')).join('\n');
    
    // Add price labels
    const topLabel = `$${this.formatPrice(maxPrice)}`;
    const bottomLabel = `$${this.formatPrice(minPrice)}`;
    const trend = this.calculateTrend();
    
    // Add trend indicator to chart
    const trendIndicator = this.getTrendIndicator(trend, this.calculatePriceChange(currentPrice));
    
    return {
      chart: chartLines,
      topPrice: topLabel,
      bottomPrice: bottomLabel,
      trend: trend,
      priceChange: this.calculatePriceChange(currentPrice),
      trendIndicator: trendIndicator
    };
  }

  generateFlatChart(price) {
    const chartWidth = Math.min(this.priceHistory.length, 20);
    const line = '➡️'.repeat(chartWidth);
    
    return {
      chart: line,
      topPrice: `$${this.formatPrice(price)}`,
      bottomPrice: `$${this.formatPrice(price)}`,
      trend: 'flat',
      priceChange: 0
    };
  }

  calculateTrend() {
    if (this.priceHistory.length < 3) return 'neutral';
    
    // Simple moving average comparison
    const recentPrices = this.priceHistory.slice(-5).map(p => p.price);
    const olderPrices = this.priceHistory.slice(-10, -5).map(p => p.price);
    
    if (olderPrices.length === 0) return 'neutral';
    
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
    
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (percentChange > 2) return 'uptrend';
    if (percentChange < -2) return 'downtrend';
    return 'neutral';
  }

  calculatePriceChange(currentPrice) {
    if (this.priceHistory.length === 0 || !currentPrice) return 0;
    
    const firstPrice = this.priceHistory[0].price;
    return ((currentPrice - firstPrice) / firstPrice) * 100;
  }

  formatPrice(price) {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  }

  getTrendEmoji(trend) {
    switch (trend) {
      case 'uptrend': return '🐂📈 Bullish Uptrend';
      case 'downtrend': return '🐻📉 Bearish Downtrend';
      default: return '🦀➡️ Crabbing (Neutral)';
    }
  }

  getTransactionImpact(transactionAmount, transactionType, liquidity) {
    if (!liquidity || liquidity === 0) return 'Unknown';
    
    const impactPercent = (transactionAmount / liquidity) * 100;
    
    if (impactPercent < 0.1) return '🟢 Minimal';
    if (impactPercent < 0.5) return '🟡 Low';
    if (impactPercent < 1) return '🟠 Medium';
    if (impactPercent < 5) return '🔴 High';
    return '💥 Very High';
  }

  getTrendIndicator(trend, priceChange) {
    const changeAbs = Math.abs(priceChange);
    
    if (trend === 'uptrend') {
      if (changeAbs > 20) return '🐂🟢🟢🟢 STRONG BULL RUN';
      if (changeAbs > 10) return '🐂🟢🟢 Bullish';
      return '🐂🟢 Slightly Bullish';
    } else if (trend === 'downtrend') {
      if (changeAbs > 20) return '🐻🔴🔴🔴 HEAVY BEAR MARKET';
      if (changeAbs > 10) return '🐻🔴🔴 Bearish';
      return '🐻🔴 Slightly Bearish';
    }
    
    return '🦀➡️ Sideways Movement';
  }
}