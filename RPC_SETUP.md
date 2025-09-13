# Better RPC Setup for Nyla Coin Alerts

The default Solana RPC has strict rate limits. Here are better alternatives:

## Option 1: Helius (Recommended - 100k free requests/day)
1. Sign up at https://www.helius.dev/
2. Create a new project
3. Copy your API key
4. Update your `.env`:
   ```
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
   ```

## Option 2: QuickNode (10M requests/month free)
1. Sign up at https://www.quicknode.com/
2. Create a Solana Mainnet endpoint
3. Copy the HTTP Provider URL
4. Update your `.env`:
   ```
   SOLANA_RPC_URL=YOUR_QUICKNODE_URL
   ```

## Option 3: Alchemy (300M compute units/month free)
1. Sign up at https://www.alchemy.com/
2. Create a Solana app
3. Copy the HTTPS URL
4. Update your `.env`:
   ```
   SOLANA_RPC_URL=YOUR_ALCHEMY_URL
   ```

## Current Rate Limit Settings
The bot is configured to:
- Poll every 15 seconds
- Process up to 10 transactions per poll
- Wait 500ms between transaction analyses

These settings work well with free RPC tiers.