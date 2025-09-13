import { config } from './config.js';
import { logger } from './logger.js';

export class PriceService {
  constructor() {
    this.priceCache = null;
    this.cacheTimestamp = 0;
    this.cacheDuration = 30000; // 30 seconds cache
  }

  async getCurrentPrice() {
    try {
      // Check cache first
      if (this.priceCache && Date.now() - this.cacheTimestamp < this.cacheDuration) {
        return this.priceCache;
      }

      // Fetch from DexScreener API
      const response = await fetch(`${config.nyla.priceApiUrl}/${config.nyla.mintAddress}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract price data from the first pair (usually the most liquid)
      if (data.pairs && data.pairs.length > 0) {
        const mainPair = data.pairs[0];
        const priceData = {
          priceUsd: parseFloat(mainPair.priceUsd) || 0,
          priceChange24h: parseFloat(mainPair.priceChange?.h24) || 0,
          volume24h: parseFloat(mainPair.volume?.h24) || 0,
          liquidity: parseFloat(mainPair.liquidity?.usd) || 0,
          fdv: parseFloat(mainPair.fdv) || 0,
          marketCap: parseFloat(mainPair.marketCap) || 0,
          pairAddress: mainPair.pairAddress,
          dexId: mainPair.dexId
        };

        // Update cache
        this.priceCache = priceData;
        this.cacheTimestamp = Date.now();

        return priceData;
      }

      logger.warn('No price data found for Nyla coin');
      return null;
    } catch (error) {
      logger.error('Error fetching price:', error);
      return this.priceCache; // Return cached price if available
    }
  }

  formatPrice(price) {
    if (!price) return 'N/A';
    
    // Format price based on magnitude
    if (price < 0.00001) {
      return `$${price.toExponential(2)}`;
    } else if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(2)}`;
    }
  }

  formatPercentage(percentage) {
    if (!percentage) return '0%';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  formatVolume(volume) {
    if (!volume) return '$0';
    
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`;
    } else {
      return `$${volume.toFixed(2)}`;
    }
  }
}