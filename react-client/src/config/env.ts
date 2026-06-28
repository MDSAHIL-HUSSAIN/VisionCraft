/**
 * Environment configuration for Adobe Express Add-on
 * 
 * This file provides type-safe access to environment variables
 * injected at build time by webpack.
 */

interface EnvironmentConfig {
  API_URL: string;
  PYTHON_SERVER_URL: string;
  VERSION: string;
  DEBUG: boolean;
}

// Access webpack-injected environment variables
// These are defined in webpack.config.js using DefinePlugin
declare const __ENV__: EnvironmentConfig;

/**
 * Application configuration
 * Falls back to defaults if environment variables are not set
 */
export const config: EnvironmentConfig = {
  API_URL: typeof __ENV__ !== 'undefined' && __ENV__.API_URL 
    ? __ENV__.API_URL 
    : 'http://localhost:1',
  
  PYTHON_SERVER_URL: typeof __ENV__ !== 'undefined' && __ENV__.PYTHON_SERVER_URL
    ? __ENV__.PYTHON_SERVER_URL
    : 'http://127.0.0.1:2',
  
  VERSION: typeof __ENV__ !== 'undefined' && __ENV__.VERSION
    ? __ENV__.VERSION
    : '1.0.0',
  
  DEBUG: typeof __ENV__ !== 'undefined' && __ENV__.DEBUG
    ? __ENV__.DEBUG
    : false,
};

// Export individual values for convenience
export const API_URL = config.API_URL;
export const PYTHON_SERVER_URL = config.PYTHON_SERVER_URL;
export const VERSION = config.VERSION;
export const DEBUG = config.DEBUG;

// Log configuration in debug mode (only during development)
if (config.DEBUG) {
  console.log('🔧 Add-on Configuration:', config);
}

export default config;