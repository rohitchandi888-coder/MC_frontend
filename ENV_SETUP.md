# Environment Variable Configuration

## Overview
All hardcoded API URLs have been replaced with environment variables for easy configuration across different environments.

## Setup

### 1. Environment File
Create or edit the `.env` file in the `frontend` directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:4000
```

### 2. Available Environments

**Development:**
```env
VITE_API_URL=http://localhost:4000
```

**Production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

**Staging:**
```env
VITE_API_URL=https://staging-api.yourdomain.com
```

## Usage in Code

The API URL is accessed through the `config.ts` file:

```typescript
import { getApiUrl } from './config';

// Use getApiUrl() helper function
const response = await fetch(getApiUrl('auth/login'), {
  method: 'POST',
  // ...
});

// Or use API_URL directly
import { API_URL } from './config';
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  // ...
});
```

## Important Notes

1. **Vite Environment Variables**: Variables must be prefixed with `VITE_` to be exposed to the client-side code.

2. **Restart Required**: After changing `.env` file, you must restart the development server:
   ```bash
   npm run dev
   ```

3. **Build Time**: Environment variables are embedded at build time, not runtime. For production builds:
   ```bash
   npm run build
   ```

4. **Security**: Never commit `.env` files with sensitive data. The `.env` file is already in `.gitignore`.

## Files Updated

All hardcoded `http://localhost:4000` URLs have been replaced in:
- `src/Dashboard.tsx` (22 occurrences)
- `src/App.tsx` (3 occurrences)
- `src/components/profile/Profile.tsx` (3 occurrences)
- `src/components/history/TransactionHistory.tsx` (1 occurrence)
- `src/components/charts/TradingChart.tsx` (1 occurrence)
- `src/components/admin/DisputesPanel.tsx` (1 occurrence)

## Configuration File

The `src/config.ts` file provides:
- `API_URL`: The base API URL from environment variable
- `getApiUrl(endpoint)`: Helper function to build full API endpoint URLs
