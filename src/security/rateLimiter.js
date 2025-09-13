export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  async checkLimit(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request history for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requestTimes = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = validRequests[0];
      const resetTime = oldestRequest + this.windowMs;
      const waitTime = resetTime - now;
      
      return {
        allowed: false,
        resetIn: waitTime,
        remaining: 0
      };
    }
    
    // Add current request
    validRequests.push(now);
    
    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length
    };
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter for Discord webhooks
export const discordRateLimiter = new RateLimiter(5, 5000); // 5 requests per 5 seconds

// Global rate limiter for RPC calls
export const rpcRateLimiter = new RateLimiter(50, 10000); // 50 requests per 10 seconds

// Cleanup every minute
setInterval(() => {
  discordRateLimiter.cleanup();
  rpcRateLimiter.cleanup();
}, 60000);