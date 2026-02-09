// API Configuration
// Priority order:
// 1. window.APP_CONFIG?.API_URL (runtime config, highest priority)
// 2. VITE_API_URL (build-time env var)
// 3. http://localhost:4000 (default fallback)

// CORRECT BACKEND URL - Backend is at https://merchantcoinwallet.com/ap
const CORRECT_API_URL = 'https://merchantcoinwallet.com/ap';

// Get API URL with runtime support - called every time to ensure latest config
function getApiUrlFromConfig(): string {
  // CRITICAL: Always reject the old/broken URL
  const OLD_BAD_URL = 'merchantcoinwallet.com';
  
  // ALWAYS check runtime config first (highest priority)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.API_URL) {
    const runtimeUrl = String((window as any).APP_CONFIG.API_URL).trim();
    // Reject old/bad URLs - force use correct URL
    if (runtimeUrl && !runtimeUrl.includes(OLD_BAD_URL) && runtimeUrl.length > 0) {
      return runtimeUrl;
    }
  }
  
  // Check build-time environment variable
  const buildTimeUrl = import.meta.env.VITE_API_URL;
  if (buildTimeUrl && !String(buildTimeUrl).includes(OLD_BAD_URL)) {
    return String(buildTimeUrl).trim();
  }
  
  // FORCE correct URL - never use the broken one
  return CORRECT_API_URL;
}

// Getter function that resolves API URL dynamically
export function getAPI_URL(): string {
  return getApiUrlFromConfig();
}

// Legacy export for backwards compatibility (resolves at call time)
export const API_URL = getAPI_URL();

// Helper function to build API endpoint URLs
// This function resolves the API URL every time it's called
export const getApiUrl = (endpoint: string): string => {
  // Get fresh API URL every time (in case config.js loaded after module init)
  let apiUrl = getApiUrlFromConfig();
  
  // CRITICAL: Double-check and fix URL if somehow old URL got through
  if (apiUrl.includes('merchantcoinwallet.com') && apiUrl.includes('http://')) {
    console.error('❌ CRITICAL: Old HTTP URL detected, forcing HTTPS!');
    apiUrl = apiUrl.replace('http://', 'https://');
  }
  
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If API_URL is empty, use relative URLs (for reverse proxy)
  if (!apiUrl || apiUrl.trim() === '') {
    return `/ap/${cleanEndpoint}`;
  }
  
  const finalUrl = `${apiUrl}/${cleanEndpoint}`;
  
  // Final safety check on the complete URL
  if (finalUrl.includes('merchantcoinwallet.com') && finalUrl.includes('http://')) {
    console.error('❌ CRITICAL: HTTP URL in final URL, fixing to HTTPS!', finalUrl);
    return finalUrl.replace('http://', 'https://');
  }
  
  return finalUrl;
};

// Log the API URL for debugging (both dev and production)
// This runs at module load, but getApiUrl() will check again on each call
if (typeof window !== 'undefined') {
  // Wait a bit for config.js to load, then log
  setTimeout(() => {
    const currentApiUrl = getApiUrlFromConfig();
    const hasRuntimeConfig = !!(window as any).APP_CONFIG?.API_URL;
    const buildTimeUrl = import.meta.env.VITE_API_URL;
    
    console.log('🔧 API Configuration Status:', {
      currentUrl: currentApiUrl,
      source: hasRuntimeConfig ? '✅ runtime (config.js)' : (buildTimeUrl ? '⚠️ build-time (env)' : '✅ default'),
      runtimeConfig: hasRuntimeConfig ? (window as any).APP_CONFIG?.API_URL : '❌ not found',
      buildTimeUrl: buildTimeUrl || 'not set',
      warning: buildTimeUrl && buildTimeUrl.includes('merchantcoinwallet.com') ? '⚠️ OLD URL IN BUILD - REBUILD NEEDED!' : ''
    });
    
    if (currentApiUrl.includes('merchantcoinwallet.com')) {
      console.error('❌ ERROR: Still using old URL! Rebuild required with correct config.');
    }
  }, 100);
}
