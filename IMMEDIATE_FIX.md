# Immediate Fix Without Rebuild (If Possible)

## Option 1: Update config.js on Server (Quick Fix)

If you have access to the production server's `dist` folder:

1. **Edit `dist/config.js` directly:**
   ```bash
   cd /path/to/dist
   nano config.js
   ```

2. **Make sure it contains:**
   ```javascript
   window.APP_CONFIG = {
     API_URL: 'http://89.116.32.223:4000'
   };
   ```

3. **Clear browser cache and test**

## Option 2: Rebuild (Recommended)

The new code has **aggressive protection** that will:
- ✅ Reject `merchantcoinwallet.com` URLs at multiple levels
- ✅ Force `http://89.116.32.223:4000` as fallback
- ✅ Work even if old URL is in build

**Steps:**
```bash
cd /path/to/MC_frontend

# 1. Remove/comment old URL from .env
nano .env
# Remove or comment: VITE_API_URL=https://api.merchantcoinwallet.com

# 2. Unset environment variable if set
unset VITE_API_URL

# 3. Rebuild
npm run build

# 4. Deploy dist folder
# Make sure dist/config.js is included
```

## Option 3: Check What's Actually in the Build

To see what URL is embedded in the current build:

```bash
cd dist
grep -r "merchantcoinwallet.com" .
```

If it finds the old URL, the build needs to be redone.

## Verification

After deploying, open browser console. You should see:
- `🔧 Initial API URL set: http://89.116.32.223:4000`
- `✅ Final API URL: http://89.116.32.223:4000`
- API calls going to `http://89.116.32.223:4000`

If you still see `merchantcoinwallet.com`:
1. Check browser cache (hard refresh: Ctrl+Shift+R)
2. Verify config.js is deployed
3. Check server's .env file
4. Rebuild with the new code
