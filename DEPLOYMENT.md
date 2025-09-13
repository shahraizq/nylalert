# Deployment Guide for Coolify

## 🚀 Quick Deploy to Coolify

### Prerequisites
- Coolify instance running
- GitHub repository or Docker Hub account
- Environment variables ready

### Method 1: Deploy via GitHub (Recommended)

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **In Coolify:**
- Create new application
- Select "Docker Compose"
- Connect your GitHub repository
- Select `docker-compose.coolify.yml` as compose file
- Add environment variables (see below)
- Deploy!

### Method 2: Deploy via Docker Image

1. **Build and push to Docker Hub:**
```bash
# Build the image
chmod +x build.sh
./build.sh

# Tag for Docker Hub
docker tag nyla-bot:latest YOUR_DOCKERHUB_USERNAME/nyla-bot:latest

# Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/nyla-bot:latest
```

2. **In Coolify:**
- Create new application
- Select "Docker Image"
- Image: `YOUR_DOCKERHUB_USERNAME/nyla-bot:latest`
- Add environment variables
- Deploy!

## 🔧 Environment Variables

Add these in Coolify's environment variables section:

```env
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NYLA_MINT_ADDRESS=3HeUeL8ru8DFfRRQGnE11vGrDdNUzqVwBW8hyYHBbonk
MIN_TRANSACTION_AMOUNT=1
MIN_TRANSACTION_VALUE_USD=1000
TRANSACTION_TYPE_FILTER=ALL
DISCORD_WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_URL
```

## 📊 Resource Configuration

The Docker setup is optimized for minimal resources:

- **CPU**: 0.1-0.5 cores (100-500m)
- **Memory**: 128-256MB
- **Disk**: ~100MB for image, 50MB for logs
- **Network**: Minimal bandwidth usage

### Coolify Resource Settings:
1. Go to your application settings
2. Set resource limits:
   - Memory: 256MB
   - CPU: 500m (0.5 cores)
3. Enable auto-restart on failure

## 🔍 Monitoring

### View Logs in Coolify:
1. Go to your application
2. Click "Logs" tab
3. Watch real-time logs

### Health Check:
- Coolify will automatically monitor health
- Restarts on failure
- Alerts on repeated failures

## 🚨 Troubleshooting

### Container Won't Start:
```bash
# Check logs
docker logs nyla-coin-alerts

# Verify environment variables
docker exec nyla-coin-alerts env
```

### High Memory Usage:
- Reduce `NODE_OPTIONS=--max-old-space-size=150`
- Increase polling interval in code

### Rate Limits:
- Use your own RPC endpoint
- Increase delays between requests

## 🔒 Security Notes

1. **Never commit `.env` files**
2. **Use Coolify secrets for sensitive data**
3. **Rotate API keys regularly**
4. **Monitor logs for errors**

## 📈 Performance Optimization

For even smaller footprint:

1. **Use Alpine Linux base** ✅ (already implemented)
2. **Multi-stage builds** ✅ (already implemented)
3. **Remove dev dependencies** ✅ (already implemented)
4. **Compress node_modules** ✅ (already implemented)

### Expected Performance:
- Image size: ~150MB
- Memory usage: 100-200MB
- CPU usage: < 5% average
- Startup time: < 5 seconds

## 🎯 Coolify-Specific Tips

1. **Enable Auto-Deploy:**
   - Set up webhook from GitHub
   - Auto-deploy on push to main

2. **Custom Domain:**
   - Not needed for bot
   - But can add status page

3. **Backup:**
   - Logs are persisted in volume
   - Can backup via Coolify

4. **Scaling:**
   - Single instance is sufficient
   - Don't need load balancing

## 📝 Maintenance

### Update Bot:
```bash
# In Coolify
Click "Redeploy" button
```

### View Metrics:
- CPU/Memory usage in Coolify dashboard
- Transaction counts in logs
- Discord webhook status

### Rotate Logs:
- Automatic via Docker logging driver
- Keeps last 3 files, 10MB each

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Discord webhook created
- [ ] Helius RPC key obtained
- [ ] Resource limits set
- [ ] Health checks enabled
- [ ] Auto-restart configured
- [ ] Logs monitoring setup
- [ ] Backup strategy defined

## 🆘 Need Help?

1. Check Coolify logs
2. Verify environment variables
3. Test webhook manually
4. Check RPC endpoint status
5. Review security settings

The bot is now ready for production deployment with minimal resource usage!