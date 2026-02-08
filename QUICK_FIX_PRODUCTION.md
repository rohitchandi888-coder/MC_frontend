# Quick Fix for Production ERR_NAME_NOT_RESOLVED

## The Problem
You're seeing: `POST https://api.merchantcoinwallet.com/auth/login net::ERR_NAME_NOT_RESOLVED`

This means the domain `api.merchantcoinwallet.com` doesn't exist or DNS isn't configured.

## Quick Fix (2 Steps)

### Step 1: Edit `public/config.js`

Open `frontend/public/config.js` and change the API URL to your actual backend:

```javascript
window.APP_CONFIG = {
  API_URL: 'https://your-actual-backend-domain.com'
  // OR if backend is on same domain:
  // API_URL: ''  // empty = relative URLs
};
```

### Step 2: Rebuild and Deploy

```bash
npm run build
```

Deploy the `dist` folder including the `config.js` file.

## That's It!

The app will now use the URL from `config.js` instead of the hardcoded one.

## No Rebuild Needed Next Time

If you need to change the API URL later, just:
1. Edit `public/config.js`
2. Deploy the file
3. **No rebuild needed!**

## Verify It Works

After deploying, open browser console and check:
```javascript
console.log(window.APP_CONFIG?.API_URL);
```

You should see your configured URL.
