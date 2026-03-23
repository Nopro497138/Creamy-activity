# PvZ Discord Activity

## Quick Start

1. **Set up Discord App:**
   - Go to discord.com/developers/applications → Your App
   - Activities → Settings → Enable Activities
   - Activities → URL Mappings → Root: `your-domain.com`
   - OAuth2 → Add redirect: `https://discord.com/oauth2/authorize`

2. **Configure environment:**
   ```
   cp .env.example .env
   # Fill in DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
   ```

3. **Add sprites:** Follow `client/assets/SPRITE_DOWNLOAD_INSTRUCTIONS.md`

4. **Install and run:**
   ```bash
   npm install
   node server.js   # Production
   # OR for dev:
   npm run dev      # Runs server + vite dev server
   ```

5. **Local testing with tunnel:**
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   # Copy the https://xxx.trycloudflare.com URL
   # Paste it in Developer Portal → Activities → URL Mappings → Root
   ```

6. **In Discord:**
   - Join a Voice Channel
   - Click the Activity (rocket) button
   - Select your app

## Deploy to Railway
```bash
git push  # Railway auto-deploys
# Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in Railway Variables
```
