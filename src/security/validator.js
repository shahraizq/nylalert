import { PublicKey } from '@solana/web3.js';

export class Validator {
  static isValidSolanaAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  static isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  static isValidWebhookUrl(url) {
    if (!url) return true; // Optional
    if (!this.isValidUrl(url)) return false;
    
    const parsed = new URL(url);
    // Only allow Discord and known webhook providers
    const allowedHosts = [
      'discord.com',
      'discordapp.com',
      'slack.com',
      'webhook.site'
    ];
    
    return allowedHosts.some(host => parsed.hostname.includes(host));
  }

  static isValidNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  static sanitizeForLog(text) {
    if (typeof text !== 'string') return text;
    
    // Mask wallet addresses (keep first 4 and last 4 chars)
    const walletRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    text = text.replace(walletRegex, (match) => {
      if (match.length > 8) {
        return match.slice(0, 4) + '...' + match.slice(-4);
      }
      return match;
    });
    
    // Mask webhook URLs
    const webhookRegex = /https:\/\/discord\.com\/api\/webhooks\/[\w\/]+/g;
    text = text.replace(webhookRegex, 'https://discord.com/api/webhooks/[MASKED]');
    
    // Mask API keys
    const apiKeyRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
    text = text.replace(apiKeyRegex, '[API-KEY-MASKED]');
    
    return text;
  }

  static validateConfig(config) {
    const errors = [];
    
    // Validate Solana config
    if (!config.solana?.rpcUrl || !this.isValidUrl(config.solana.rpcUrl)) {
      errors.push('Invalid Solana RPC URL');
    }
    
    // Validate Nyla config
    if (!config.nyla?.mintAddress || !this.isValidSolanaAddress(config.nyla.mintAddress)) {
      errors.push('Invalid Nyla mint address');
    }
    
    if (!this.isValidNumber(config.nyla?.minTransactionAmount, 0)) {
      errors.push('Invalid minimum transaction amount');
    }
    
    if (!this.isValidNumber(config.nyla?.minTransactionValueUsd, 0)) {
      errors.push('Invalid minimum transaction value USD');
    }
    
    // Validate alerts config
    if (config.alerts?.webhookUrl && !this.isValidWebhookUrl(config.alerts.webhookUrl)) {
      errors.push('Invalid webhook URL');
    }
    
    if (config.alerts?.discordWebhookUrl && !this.isValidWebhookUrl(config.alerts.discordWebhookUrl)) {
      errors.push('Invalid Discord webhook URL');
    }
    
    return errors;
  }
}