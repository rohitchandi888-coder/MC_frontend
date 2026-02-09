// STANDALONE URL FIX SCRIPT - ULTRA AGGRESSIVE VERSION
// This script MUST load FIRST before any other scripts
// Backend is at: https://merchantcoinwallet.com/api

(function() {
  'use strict';
  
  const CORRECT_URL = 'https://merchantcoinwallet.com/api';
  const OLD_BAD_URL = '89.116.32.223:4000';
  
  console.log('🔧🔧🔧 LOADING URL FIX SCRIPT... 🔧🔧🔧');
  
  // FORCE correct config immediately
  window.APP_CONFIG = window.APP_CONFIG || {};
  // Check if URL contains old HTTP IP address or wrong endpoint
  const currentUrl = String(window.APP_CONFIG.API_URL || '');
  if (!window.APP_CONFIG.API_URL || 
      currentUrl.includes(OLD_BAD_URL) || 
      (currentUrl.includes('merchantcoinwallet.com') && !currentUrl.includes('/api'))) {
    window.APP_CONFIG.API_URL = CORRECT_URL;
    console.log('✅ Forced APP_CONFIG.API_URL to:', CORRECT_URL);
  }
  
  // Intercept fetch - MUST be done before any modules load
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let urlToFix = null;
    let fixedUrl = null;
    let wasFixed = false;
    
    // Handle string URL
    if (args[0] && typeof args[0] === 'string') {
      urlToFix = args[0];
      // Check for old IP address or wrong endpoint
      if (urlToFix.includes(OLD_BAD_URL) || (urlToFix.includes('merchantcoinwallet.com') && !urlToFix.includes('/api'))) {
        fixedUrl = urlToFix.replace(/https?:\/\/[^\/]*89\.116\.32\.223:4000/g, CORRECT_URL);
        fixedUrl = fixedUrl.replace(/https?:\/\/merchantcoinwallet\.com\/ap\//g, 'https://merchantcoinwallet.com/api/');
        console.error('🚨🚨🚨 [FIX SCRIPT] INTERCEPTED fetch() with OLD URL:', urlToFix);
        console.warn('✅✅✅ [FIX SCRIPT] FIXING to:', fixedUrl);
        args[0] = fixedUrl;
        wasFixed = true;
      }
    }
    // Handle Request object
    else if (args[0] && args[0] instanceof Request) {
      urlToFix = args[0].url;
      // Check for old IP address or wrong endpoint
      if (urlToFix && (urlToFix.includes(OLD_BAD_URL) || (urlToFix.includes('merchantcoinwallet.com') && !urlToFix.includes('/api')))) {
        fixedUrl = urlToFix.replace(/https?:\/\/[^\/]*89\.116\.32\.223:4000/g, CORRECT_URL);
        fixedUrl = fixedUrl.replace(/https?:\/\/merchantcoinwallet\.com\/ap\//g, 'https://merchantcoinwallet.com/api/');
        console.error('🚨🚨🚨 [FIX SCRIPT] INTERCEPTED Request object with OLD URL:', urlToFix);
        console.warn('✅✅✅ [FIX SCRIPT] FIXING to:', fixedUrl);
        // Create new Request with fixed URL, preserving all options
        const newInit = {
          method: args[0].method,
          headers: args[0].headers,
          body: args[0].body,
          mode: args[0].mode,
          credentials: args[0].credentials,
          cache: args[0].cache,
          redirect: args[0].redirect,
          referrer: args[0].referrer,
          integrity: args[0].integrity
        };
        args[0] = new Request(fixedUrl, newInit);
        wasFixed = true;
      }
    }
    
    // Log ALL fetch calls for debugging
    if (args[0]) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url || args[0];
      if (typeof url === 'string' && url.includes('/auth/')) {
        console.log('📡 [FIX SCRIPT] Fetch call detected:', url, wasFixed ? '✅ FIXED' : '');
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    if (typeof url === 'string' && (url.includes(OLD_BAD_URL) || (url.includes('merchantcoinwallet.com') && !url.includes('/api')))) {
      let fixedUrl = url.replace(/https?:\/\/[^\/]*89\.116\.32\.223:4000/g, CORRECT_URL);
      fixedUrl = fixedUrl.replace(/https?:\/\/merchantcoinwallet\.com\/ap\//g, 'https://merchantcoinwallet.com/api/');
      console.error('🚨🚨🚨 [FIX SCRIPT] INTERCEPTED XHR open() with OLD URL:', url);
      console.warn('✅✅✅ [FIX SCRIPT] FIXING to:', fixedUrl);
      url = fixedUrl;
      this._url = fixedUrl;
    }
    return originalXHROpen.call(this, method, url, ...rest);
  };
  
  // Monitor XHR send
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && (this._url.includes(OLD_BAD_URL) || (this._url.includes('merchantcoinwallet.com') && !this._url.includes('/api')))) {
      console.error('🚨 [FIX SCRIPT] XHR send() detected OLD URL:', this._url);
    }
    return originalSend.apply(this, args);
  };
  
  console.log('✅✅✅ URL FIX SCRIPT FULLY LOADED ✅✅✅');
  console.log('   Interceptor active - monitoring ALL network requests');
  console.log('   Old URL pattern:', OLD_BAD_URL);
  console.log('   Correct URL:', CORRECT_URL);
  console.log('   Check console for 🚨 messages when intercepting');
  
  // Verify interceptor is working
  setTimeout(function() {
    console.log('🔍 [FIX SCRIPT] Interceptor verification:');
    console.log('   - window.fetch intercepted:', window.fetch !== originalFetch);
    console.log('   - XMLHttpRequest.open intercepted:', XMLHttpRequest.prototype.open !== originalXHROpen);
    console.log('   - APP_CONFIG.API_URL:', window.APP_CONFIG?.API_URL);
  }, 1000);
})();
