# Server Build Fix - Still Getting Old URL

## The Problem

After rebuilding on the server, you're still seeing `https://api.merchantcoinwallet.com`. This means:

1. **Server has `.env` file with old URL**, OR
2. **Server environment variable is set to old URL**, OR
3. **`config.js` is not being deployed correctly**

## Quick Fix Steps

### Step 1: Check Server's .env File

On your server, check if there's a `.env` file with the old URL:

```bash
cd /path/to/MC_frontend
cat .env
```

If you see:
```
VITE_API_URL=https://api.merchantcoinwallet.com
```

**Delete or comment it out**, or change it to:
```
VITE_API_URL=http://89.116.32.223:4000
```

### Step 2: Check Server Environment Variables

Check if the environment variable is set:

```bash
echo $VITE_API_URL
```

If it shows `https://api.merchantcoinwallet.com`, unset it:

```bash
unset VITE_API_URL
```

### Step 3: Verify config.js is Deployed

Make sure `config.js` is in your `dist` folder after build:

```bash
ls -la dist/config.js
cat dist/config.js
```

It should show:
```javascript
window.APP_CONFIG = {
  API_URL: 'http://89.116.32.223:4000'
};
```

### Step 4: Rebuild Without Old Env Var

Rebuild with the correct URL explicitly:

```bash
cd /path/to/MC_frontend
unset VITE_API_URL  # Remove old env var
npm run build
```

### Step 5: Verify Built Files

Check the built JavaScript file doesn't contain the old URL:

```bash
grep -r "merchantcoinwallet.com" dist/
```

If it finds anything, the build still has the old URL embedded.

### Step 6: Deploy and Clear Cache

1. Deploy the new `dist` folder
2. Make sure `dist/config.js` is accessible at `/config.js`
3. Clear browser cache (Ctrl+Shift+R)
4. Check browser console for config logs

## Alternative: Force Runtime Config Only

If build-time env vars keep causing issues, you can:

1. **Remove VITE_API_URL from .env** (or set it empty)
2. **Rely only on config.js** (runtime config)
3. The inline fallback in `index.html` will also work

## Verify It's Working

After deploying, open browser console. You should see:

```
✅ Runtime config loaded: http://89.116.32.223:4000
🔧 API Configuration Status: { currentUrl: "http://89.116.32.223:4000", ... }
```

If you still see `merchantcoinwallet.com`, check:
- Browser cache (hard refresh)
- Server's .env file
- Server's environment variables
- That config.js is actually deployed
