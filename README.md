# Nyla Coin Alert Bot

A real-time monitoring bot for Nyla coin transactions on Solana blockchain that sends alerts for buy/sell activities.

## Features

- Real-time monitoring of Nyla coin transactions
- Buy/sell detection and classification
- Desktop notifications
- Discord alerts via webhook (no credentials needed)
- Telegram alerts support
- Webhook integration
- Configurable transaction thresholds
- Transaction cooldown to prevent spam

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` file and add:
   - `NYLA_MINT_ADDRESS`: The Nyla coin mint address on Solana
   - `MIN_TRANSACTION_AMOUNT`: Minimum transaction amount to trigger alerts (default: 100)
   - `DISCORD_WEBHOOK_URL`: Your Discord webhook URL (see below for setup)
   - `TELEGRAM_BOT_TOKEN` (optional): For Telegram alerts
   - `TELEGRAM_CHAT_ID` (optional): Your Telegram chat ID
   - `ALERT_WEBHOOK_URL` (optional): Webhook URL for custom integrations

### Discord Webhook Setup

To create a Discord webhook:

1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Choose the channel for alerts
5. Copy the webhook URL
6. Paste it in `DISCORD_WEBHOOK_URL` in your `.env` file

## Usage

Start the bot:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Alert Types

The bot sends alerts through:
1. Desktop notifications (always enabled)
2. Discord embeds (when webhook URL is configured)
3. Telegram messages (if configured)
4. Webhook POST requests (if configured)

## Configuration

- Adjust `MIN_TRANSACTION_AMOUNT` to filter small transactions
- The bot has a 1-minute cooldown per address pair to prevent spam
- Logs are saved to `nyla-alerts.log`

## Webhook Format

When configured, the bot sends POST requests with this format:
```json
{
  "type": "BUY" | "SELL",
  "amount": 123.45,
  "from": "wallet_address",
  "to": "wallet_address",
  "signature": "transaction_signature",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "fee": 0.000005
}
```