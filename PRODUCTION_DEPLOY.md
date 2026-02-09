# 🚀 Production Deployment Guide

## The Problem

- ✅ **Local** (`localhost:5173`) - Working correctly with `http://89.116.32.223:4000`
- ❌ **Production** (`https://merchantcoinwallet.com/`) - Still using old URL `https://api.merchantcoinwallet.com`

**Root Cause:** Production server has the OLD build deployed. The new code with fixes is only on your local machine.

## Solution: Deploy New Build to Production

### Step 1: Build for Production

On your **local machine** (where the code is working):

```bash
cd D:\POS\fda_wallet_p2p\frontend

# Make sure .env doesn't have old URL
# (It should be: VITE_API_URL=http://localhost:4000 or empty)

# Build for production
npm run build
```

This creates a `dist` folder with the new build.

### Step 2: Verify Build Contents

Check that these files are in `dist`:

```bash
# Check these files exist:
dist/index.html          # Should have fix-url.js reference
dist/fix-url.js          # Standalone fix script
dist/config.js          # Runtime config
dist/assets/            # Compiled JS and CSS
```

### Step 3: Upload to Production Server

Upload the **entire `dist` folder** to your production server:

**Option A: Using FTP/SFTP**
- Connect to your server
- Navigate to your web root (where merchantcoinwallet.com is hosted)
- Upload/replace the `dist` folder contents

**Option B: Using SCP (Linux/Mac)**
```bash
scp -r dist/* user@your-server:/path/to/web/root/
```

**Option C: Using Git (if you have a repo)**
```bash
# Commit the new build
git add dist/
git commit -m "Fix: Update API URL to correct backend"
git push

# On server, pull and deploy
ssh user@your-server
cd /path/to/MC_frontend
git pull
# Restart web server if needed
```

### Step 4: Verify Files on Server

SSH into your production server and verify:

```bash
# Check index.html has fix-url.js
grep "fix-url.js" /path/to/web/root/index.html

# Check fix-url.js exists
ls -la /path/to/web/root/fix-url.js

# Check config.js exists
ls -la /path/to/web/root/config.js
```

### Step 5: Clear Browser Cache

After deploying:
1. Open `https://merchantcoinwallet.com/` in browser
2. Open DevTools (F12)
3. Right-click refresh button → "Empty Cache and Hard Reload"
4. Or: Settings → Clear browsing data → Cached images and files

### Step 6: Test Production

1. Open browser console (F12)
2. You should see:
   ```
   🔧 Loading URL fix script...
   ✅✅✅ URL FIX SCRIPT LOADED ✅✅✅
   ```
3. Try to login
4. Check Network tab - requests should go to `http://89.116.32.223:4000`

## Quick Checklist

- [ ] Built new production build (`npm run build`)
- [ ] Verified `dist` folder has all files
- [ ] Uploaded `dist` folder to production server
- [ ] Verified files on server (index.html, fix-url.js, config.js)
- [ ] Cleared browser cache
- [ ] Tested login on production
- [ ] Verified Network tab shows correct URL

## If Still Not Working

1. **Check if files are actually deployed:**
   - Visit: `https://merchantcoinwallet.com/fix-url.js`
   - Should see JavaScript code, not 404

2. **Check browser console:**
   - If you don't see "URL FIX SCRIPT LOADED", the script isn't loading
   - Check Network tab for 404 errors on fix-url.js

3. **Check server logs:**
   - Verify web server is serving the new files
   - Check for any caching (CDN, reverse proxy, etc.)

4. **Verify index.html:**
   - View page source on production
   - Search for "fix-url.js"
   - Should be in `<head>` section

## Important Notes

- **The code is correct** - it works locally
- **Production just needs the new build** - deploy the `dist` folder
- **Browser cache** - always clear after deploying
- **CDN/Proxy cache** - if you use Cloudflare or similar, purge cache there too
