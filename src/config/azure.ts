/**
 * Azure Configuration
 * Centralized configuration for Azure services and authentication
 */

export interface AzureConfig {
  auth: {
    clientId: string;
    tenantId: string; // 'common' for multi-tenant support
    redirectUri: string;
    scope: string;
  };
  endpoints: {
    managementApi: string;
    keyVaultApi: string;
  };
  constants: {
    azureCliClientId: string;
  };
}

/**
 * Get Azure configuration from environment variables
 * Uses multi-tenant 'common' endpoint for universal authentication
 */
export function getAzureConfig(): AzureConfig {
  // Optional tenant ID override (defaults to 'common' for multi-tenant support)
  const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common';
  
  // Optional client ID (defaults to Azure CLI public client)
  const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || getAzureCliClientId();
  
  return {
    auth: {
      clientId,
      tenantId,
      redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
      scope: 'https://management.azure.com/user_impersonation offline_access',
    },
    endpoints: {
      managementApi: 'https://management.azure.com',
      keyVaultApi: 'https://vault.azure.net',
    },
    constants: {
      azureCliClientId: getAzureCliClientId(),
    },
  };
}

/**
 * Get Azure CLI public client ID
 * This is a well-known public client ID for Azure CLI
 */
function getAzureCliClientId(): string {
  return '1950a258-227b-4e31-a9cf-717495945fc2';
}

/**
 * Validate Azure configuration
 * Checks if all required configuration is present and valid
 */
export function validateAzureConfig(config: AzureConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate tenant ID format (should be a GUID or 'common')
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (config.auth.tenantId !== 'common' && !guidRegex.test(config.auth.tenantId)) {
    errors.push('Invalid tenant ID format. Expected a GUID or "common".');
  }

  if (!guidRegex.test(config.auth.clientId)) {
    errors.push('Invalid client ID format. Expected a GUID.');
  }

  if (!config.auth.scope) {
    errors.push('Missing authentication scope.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentInfo() {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isServer: typeof window === 'undefined',
  };
}
