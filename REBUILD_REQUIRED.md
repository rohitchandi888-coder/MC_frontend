# ⚠️ REBUILD REQUIRED FOR PRODUCTION FIX

## The Problem

You're still seeing `https://api.merchantcoinwallet.com` because:
- **The production build was created BEFORE our config fixes**
- The old URL is **hardcoded in the built JavaScript bundle**
- Runtime config can't override what's already embedded in the build

## The Solution: REBUILD

You **MUST rebuild** the frontend for the fixes to work:

```bash
cd frontend
npm run build
```

## After Rebuild

1. **Deploy the new `dist` folder**
2. **Make sure `dist/config.js` is deployed** (or the inline fallback will be used)
3. **Clear browser cache** and test again

## Verify It's Fixed

After rebuilding and deploying, check the browser console. You should see:
- ✅ `Runtime config loaded: http://89.116.32.223:4000`
- ✅ API calls going to `http://89.116.32.223:4000`

If you still see `merchantcoinwallet.com`, the old build is still deployed.

## Quick Check

Open the built file and search for `merchantcoinwallet.com`:
- If found: **Old build, rebuild needed**
- If not found: **New build, but might need cache clear**
