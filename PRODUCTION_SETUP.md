# Production Deployment Guide

## Problem: ERR_NAME_NOT_RESOLVED

If you're seeing `ERR_NAME_NOT_RESOLVED` for `https://api.merchantcoinwallet.com`, it means:
1. The domain DNS is not configured correctly, OR
2. The backend server is not running at that domain, OR
3. The environment variable was set incorrectly during build

## Solution Options

### Option 1: Runtime Configuration (Recommended for Production)

The app now supports **runtime configuration** via a `config.js` file. This allows you to change the API URL without rebuilding.

#### Steps:

1. **Create `public/config.js` file:**
   ```javascript
   window.APP_CONFIG = {
     API_URL: 'https://your-actual-api-domain.com'
   };
   ```

2. **Update `index.html` to load config.js before the app:**
   ```html
   <head>
     <script src="/config.js"></script>
     <!-- other scripts -->
   </head>
   ```

3. **Deploy `config.js` with your build** - This file will be served from the `public` folder.

4. **Benefits:**
   - ✅ Change API URL without rebuilding
   - ✅ Different configs for different environments
   - ✅ Easy to update in production

### Option 2: Build-Time Environment Variable

Set the environment variable **before building**:

```bash
# Windows PowerShell
$env:VITE_API_URL="https://your-actual-api-domain.com"
npm run build

# Linux/Mac
VITE_API_URL=https://your-actual-api-domain.com npm run build
```

### Option 3: Use Relative URLs (If Same Domain)

If your frontend and backend are on the same domain, use relative URLs:

```javascript
// In config.js
window.APP_CONFIG = {
  API_URL: ''  // Empty string = relative URLs
};
```

Then all API calls will be relative to the current domain.

## Configuration Priority

The app checks for API URL in this order (highest to lowest priority):

1. **`window.APP_CONFIG.API_URL`** (Runtime config - highest priority)
2. **`VITE_API_URL`** (Build-time env var)
3. **`http://localhost:4000`** (Default fallback)

## Troubleshooting

### Check Current API URL

Open browser console and check:
```javascript
console.log('Current API URL:', window.APP_CONFIG?.API_URL || import.meta.env.VITE_API_URL);
```

### Verify DNS

Make sure your API domain resolves:
```bash
# Windows
nslookup api.merchantcoinwallet.com

# Linux/Mac
dig api.merchantcoinwallet.com
```

### Test Backend

Test if backend is accessible:
```bash
curl https://api.merchantcoinwallet.com/health
```

### Common Issues

1. **Domain not configured**: Set up DNS A record pointing to your server IP
2. **Backend not running**: Start your backend server
3. **CORS issues**: Make sure backend allows requests from your frontend domain
4. **SSL certificate**: Ensure HTTPS certificate is valid

## Quick Fix for Current Issue

If `api.merchantcoinwallet.com` doesn't exist yet:

1. **Temporary fix**: Use your actual backend URL
   ```javascript
   // public/config.js
   window.APP_CONFIG = {
     API_URL: 'https://your-actual-backend-url.com'
   };
   ```

2. **Or use IP address** (not recommended for production):
   ```javascript
   window.APP_CONFIG = {
     API_URL: 'http://123.456.789.0:4000'
   };
   ```

3. **Rebuild with correct URL**:
   ```bash
   VITE_API_URL=https://your-actual-backend-url.com npm run build
   ```
