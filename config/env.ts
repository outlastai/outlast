import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Load environment variables from root .env file
 * This ensures all modules use the same configuration
 */
export function loadEnv(): void {
  // Load from root .env file
  const envPath = resolve(__dirname, '../.env');
  config({ path: envPath });
  
  // Also try loading from current directory (for backward compatibility)
  config();
}

// Auto-load on import
loadEnv();

