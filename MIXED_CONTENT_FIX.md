# 🔒 Mixed Content Error Fix

## The Problem

**Error:** `Mixed Content: The page at 'https://merchantcoinwallet.com/login' was loaded over HTTPS, but requested an insecure resource 'http://89.116.32.223:4000/auth/login'`

**Cause:** Browsers block HTTP requests from HTTPS pages for security.

## Solutions

### Solution 1: Use HTTPS for Backend (Recommended)

Set up HTTPS for your backend API:

#### Option A: Reverse Proxy with Nginx/LiteSpeed

Configure your web server to proxy API requests:

**For LiteSpeed/Nginx:**
```nginx
# Add to your virtual host config
location /api {
    proxy_pass http://89.116.32.223:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Then update `config.js`:
```javascript
window.APP_CONFIG = {
  API_URL: ''  // Empty = relative URLs, will use /api
};
```

And update your frontend code to use `/api` prefix instead of full URL.

#### Option B: SSL Certificate for Backend

1. Get SSL certificate for `api.merchantcoinwallet.com`
2. Configure backend to use HTTPS
3. Update `config.js`:
   ```javascript
   window.APP_CONFIG = {
     API_URL: 'https://api.merchantcoinwallet.com'
   };
   ```

### Solution 2: Use Relative URLs (Same Domain)

If backend is on the same server:

1. **Set up reverse proxy** (see Solution 1, Option A)
2. **Update config.js:**
   ```javascript
   window.APP_CONFIG = {
     API_URL: ''  // Empty = relative URLs
   };
   ```
3. **Update frontend to use `/api` prefix**

### Solution 3: Temporary Workaround (NOT Recommended for Production)

**Only for testing!** Allow mixed content in browser:

1. Chrome: Click lock icon → Site settings → Insecure content → Allow
2. **This is NOT secure and should NOT be used in production!**

## Quick Fix: Reverse Proxy Setup

### Step 1: Update LiteSpeed/Nginx Config

Add this to your virtual host configuration:

```nginx
# Proxy API requests to backend
location /api {
    proxy_pass http://89.116.32.223:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Step 2: Update Frontend Code

Update `getApiUrl()` to use `/api` prefix:

```typescript
export const getApiUrl = (endpoint: string): string => {
  const apiUrl = getApiUrlFromConfig();
  // If API_URL is empty, use relative URLs
  if (!apiUrl || apiUrl === '') {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `/api/${cleanEndpoint}`;
  }
  // Otherwise use full URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${apiUrl}/${cleanEndpoint}`;
};
```

### Step 3: Update config.js

```javascript
window.APP_CONFIG = {
  API_URL: ''  // Empty = use relative /api URLs
};
```

### Step 4: Restart Web Server

```bash
# LiteSpeed
/usr/local/lsws/bin/lswsctrl restart

# Nginx
sudo systemctl restart nginx
```

## Recommended Approach

**Best solution:** Set up reverse proxy on your frontend server to proxy `/api/*` requests to `http://89.116.32.223:4000/*`. This way:
- ✅ All requests go through HTTPS
- ✅ No Mixed Content errors
- ✅ Backend can stay on HTTP (internal)
- ✅ Single domain for everything

## Verify It's Working

After setup:
1. Visit: `https://merchantcoinwallet.com/api/health`
2. Should return backend response (not 404)
3. Try login - should work without Mixed Content error
