// API Configuration
// Priority order:
// 1. window.APP_CONFIG?.API_URL (runtime config, highest priority)
// 2. VITE_API_URL (build-time env var)
// 3. http://localhost:4000 (default fallback)

// Get API URL with runtime support
function getApiUrlFromConfig(): string {
  // Check for runtime configuration (useful for production deployments)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.API_URL) {
    return (window as any).APP_CONFIG.API_URL;
  }
  
  // Check build-time environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default fallback
  return 'http://localhost:4000';
}

export const API_URL = getApiUrlFromConfig();

// Helper function to build API endpoint URLs
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_URL}/${cleanEndpoint}`;
};

// Log the API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔧 API URL configured:', API_URL);
}
