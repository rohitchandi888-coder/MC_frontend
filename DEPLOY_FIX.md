# 🚨 CRITICAL: Deploy Fix Script

## The Problem

The production build still has the old URL embedded. Even with the interceptor in `index.html`, if the old `index.html` is being served, it won't work.

## Solution: Deploy Fix Script

I've created a **standalone fix script** that works independently.

### Option 1: Quick Fix (No Rebuild Needed)

1. **Copy `public/fix-url.js` to your server's `dist` folder:**
   ```bash
   # On your server
   cd /path/to/MC_frontend/dist
   # Upload fix-url.js here
   ```

2. **Add this line to your existing `index.html` (in the `<head>` section, BEFORE other scripts):**
   ```html
   <script src="/fix-url.js"></script>
   ```

3. **Clear browser cache and test**

### Option 2: Full Rebuild (Recommended)

1. **Rebuild the frontend:**
   ```bash
   cd /path/to/MC_frontend
   npm run build
   ```

2. **Deploy the entire `dist` folder**

3. **Clear browser cache**

## Verify It's Working

After deploying, open browser console. You should see:
```
🔧 Loading URL fix script...
✅✅✅ URL FIX SCRIPT LOADED ✅✅✅
```

When you try to login, you should see:
```
🚨 [FIX SCRIPT] Intercepted fetch with OLD URL: https://api.merchantcoinwallet.com/auth/login
✅ [FIX SCRIPT] Fixed to: http://89.116.32.223:4000/auth/login
```

## If Still Not Working

1. **Check if fix-url.js is accessible:**
   - Open: `https://merchantcoinwallet.com/fix-url.js`
   - Should see JavaScript code, not 404

2. **Check browser console:**
   - If you don't see "URL FIX SCRIPT LOADED", the script isn't loading
   - Check Network tab for fix-url.js request

3. **Verify script is in index.html:**
   - View page source
   - Search for "fix-url.js"
   - Should be in `<head>` section

## Files to Deploy

1. `dist/fix-url.js` (standalone fix script)
2. `dist/index.html` (updated with fix-url.js reference)
3. `dist/config.js` (runtime config)

All three files must be in the `dist` folder on your server!
