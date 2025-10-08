'use client';

import { useState, useEffect } from 'react';
import { Key, Shield, ExternalLink, ChevronRight, Search } from 'lucide-react';
import KeyVaultEditor from '@/components/KeyVaultEditor';
import { getAzureConfig, validateAzureConfig } from '../config/azure';

interface KeyVault {
  id: string;
  name: string;
  resourceGroup: string;
  subscription: string;
  location: string;
  url: string;
}

// Get Azure configuration
const AZURE_CONFIG = (() => {
  try {
    const fullConfig = getAzureConfig();
    const validation = validateAzureConfig(fullConfig);

    if (!validation.isValid) {
      console.error('Azure configuration validation failed:', validation.errors);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Azure configuration errors:', validation.errors);
      }
    }

    return fullConfig.auth;
  } catch (error) {
    console.error('Failed to load Azure configuration:', error);
    return {
      clientId: '',
      tenantId: '',
      redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
      scope: '',
    };
  }
})();

export default function Home() {
  // PKCE helpers (client-side only)
  const base64UrlEncode = (arrayBuffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = typeof btoa !== 'undefined' ? btoa(binary) : '';
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const generateCodeVerifier = (): string => {
    const length = 64; // between 43 and 128
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint32Array(length);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
    } else {
      for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 4294967296);
    }
    let verifier = '';
    for (let i = 0; i < length; i++) {
      verifier += charset[values[i] % charset.length];
    }
    return verifier;
  };

  const deriveCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
  };
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [keyVaults, setKeyVaults] = useState<KeyVault[]>([]);
  const [filteredKeyVaults, setFilteredKeyVaults] = useState<KeyVault[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeyVault, setSelectedKeyVault] = useState<KeyVault | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [keyVaultToken, setKeyVaultToken] = useState<string | null>(null);
  const [isLoadingKeyVault, setIsLoadingKeyVault] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Check configuration on mount
  useEffect(() => {
    console.log('Component mounting...');
    try {
      const fullConfig = getAzureConfig();
      const validation = validateAzureConfig(fullConfig);
      if (!validation.isValid) {
        setConfigError(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      console.log('Configuration check complete');
    } catch (error) {
      console.error('Configuration error during mount:', error);
      setConfigError(`Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Debug: Log Electron API availability
  useEffect(() => {
    console.log('Checking Electron API availability...');
    console.log('typeof window:', typeof window);
    console.log('window.electronAPI:', typeof window !== 'undefined' ? window.electronAPI : 'window undefined');
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('Electron API detected:', {
        platform: window.electronAPI.platform,
        versions: window.electronAPI.versions
      });
    }
  }, []);

  // Check for auth callback on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      setAuthError(`Authentication failed: ${errorDescription || error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      handleAuthCallback(code);
    } else {
      const storedToken = localStorage.getItem('azure_access_token');
      const storedRefreshToken = localStorage.getItem('azure_refresh_token');
      const storedKeyVaults = localStorage.getItem('azure_key_vaults');

      if (storedToken && storedKeyVaults) {
        try {
          setAccessToken(storedToken);
          if (storedRefreshToken) {
            setRefreshToken(storedRefreshToken);
          }
          const parsedKeyVaults = storedKeyVaults ? JSON.parse(storedKeyVaults) : [];
          setKeyVaults(parsedKeyVaults);
          setFilteredKeyVaults(parsedKeyVaults);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Failed to load stored authentication data:', e);
          localStorage.removeItem('azure_access_token');
          localStorage.removeItem('azure_refresh_token');
          localStorage.removeItem('azure_key_vaults');
        }
      }
    }
  }, []);

  // Filter Key Vaults based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredKeyVaults(keyVaults);
    } else {
      const filtered = keyVaults.filter(vault =>
        vault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.resourceGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.subscription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredKeyVaults(filtered);
    }
  }, [keyVaults, searchTerm]);

  const initiateAzureLogin = async () => {
    try {
      // Check if we're in Electron
      const isElectron = typeof window !== 'undefined' && window.electronAPI;
      
      // Generate PKCE values
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await deriveCodeChallenge(codeVerifier);
      sessionStorage.setItem('pkce_verifier', codeVerifier);
      
      const authUrl = `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${AZURE_CONFIG.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(AZURE_CONFIG.redirectUri)}&` +
        `scope=${encodeURIComponent(AZURE_CONFIG.scope)}&` +
        `code_challenge=${encodeURIComponent(codeChallenge)}&` +
        `code_challenge_method=S256&` +
        `response_mode=query&` +
        `prompt=select_account&` +
        `state=${encodeURIComponent(window.location.pathname)}`;
      
      if (isElectron && window.electronAPI) {
        try {
          setIsLoading(true);
          setAuthError(null);
          console.log('Using Electron OAuth flow');
          
          // Use Electron's OAuth handler
          const result = await window.electronAPI.invoke('oauth-login', authUrl);
          console.log('oauth-login result:', result);
          
          if (result && typeof result === 'object' && 'code' in result) {
            const storedVerifier = sessionStorage.getItem('pkce_verifier') || undefined;
            console.log('Proceeding to token exchange with override redirectUri');
            await handleAuthCallback(result.code, (result as any).redirectUri, storedVerifier);
          } else if (typeof result === 'string') {
            const storedVerifier = sessionStorage.getItem('pkce_verifier') || undefined;
            console.log('Proceeding to token exchange with string code');
            await handleAuthCallback(result, undefined, storedVerifier);
          }
        } catch (error) {
          console.error('Electron OAuth error:', error);
          setAuthError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('Using browser OAuth flow');
        // Browser flow - mark that we're waiting for auth (for polling)
        sessionStorage.setItem('awaiting_auth', 'true');
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Error in initiateAzureLogin:', error);
      setAuthError(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Poll for authentication when waiting
  useEffect(() => {
    if (isAuthenticated) return;
    
    const checkAuth = () => {
      const awaitingAuth = sessionStorage.getItem('awaiting_auth');
      if (!awaitingAuth) return;
      
      // Check if tokens appeared in localStorage
      const token = localStorage.getItem('azure_access_token');
      const vaults = localStorage.getItem('azure_key_vaults');
      
      if (token && vaults) {
        // Auth completed in browser, reload the page
        sessionStorage.removeItem('awaiting_auth');
        window.location.reload();
      }
    };
    
    // Check every 2 seconds
    const interval = setInterval(checkAuth, 2000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleAuthCallback = async (code: string, overrideRedirectUri?: string, codeVerifier?: string) => {
    setIsLoading(true);
    try {
      console.log('Starting token exchange', { codePresent: !!code, overrideRedirectUri, codeVerifierPresent: !!codeVerifier });
      // Exchange authorization code for access token and Key Vault list
      const response = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: AZURE_CONFIG.clientId,
          // Use the exact redirectUri used during Electron OAuth if provided
          redirectUri: overrideRedirectUri || AZURE_CONFIG.redirectUri,
          tenantId: AZURE_CONFIG.tenantId,
          code_verifier: codeVerifier || sessionStorage.getItem('pkce_verifier') || undefined,
        }),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        console.error('Token exchange failed', response.status, details);
        throw new Error('Failed to exchange authorization code');
      }

      const data = await response.json();
      console.log('Token exchange success; updating state');
      
      // Store token and Key Vaults in localStorage
      localStorage.setItem('azure_access_token', data.token.access_token);
      if (data.token.refresh_token) {
        localStorage.setItem('azure_refresh_token', data.token.refresh_token);
        setRefreshToken(data.token.refresh_token);
      }
      localStorage.setItem('azure_key_vaults', JSON.stringify(data.keyVaults));
      
      // Set state
      setAccessToken(data.token.access_token);
      setKeyVaults(data.keyVaults);
      setFilteredKeyVaults(data.keyVaults);
      setIsAuthenticated(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Failed to handle auth callback:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      try { sessionStorage.removeItem('pkce_verifier'); } catch {}
      setIsLoading(false);
    }
  };

  // refreshKeyVaults was unused; removed to satisfy linter

  const signOut = () => {
    localStorage.removeItem('azure_access_token');
    localStorage.removeItem('azure_refresh_token');
    localStorage.removeItem('azure_key_vaults');
    setAccessToken(null);
    setRefreshToken(null);
    setKeyVaultToken(null);
    setIsAuthenticated(false);
    setKeyVaults([]);
    setFilteredKeyVaults([]);
    setSearchTerm('');
    setSelectedKeyVault(null);
    setAuthError(null);
  };

  const selectKeyVault = async (keyVault: KeyVault) => {
    setIsLoadingKeyVault(true);
    // Try to get a Key Vault specific token before selecting the vault
    if (refreshToken && accessToken) {
      try {
        const response = await fetch('/api/auth/keyvault-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
            clientId: AZURE_CONFIG.clientId,
            managementToken: accessToken
          })
        });

        if (response.ok) {
          const tokenData = await response.json();
          console.log('Got Key Vault token:', tokenData.source);
          setKeyVaultToken(tokenData.access_token);
        } else {
          console.warn('Failed to get Key Vault token, using management token');
          setKeyVaultToken(accessToken);
        }
      } catch (error) {
        console.warn('Error getting Key Vault token:', error);
        setKeyVaultToken(accessToken);
      }
    } else {
      setKeyVaultToken(accessToken);
    }
    
    setSelectedKeyVault(keyVault);
    setIsLoadingKeyVault(false);
  };

  // Show Key Vault Editor if a vault is selected
  if (selectedKeyVault) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedKeyVault(null)}
                  className="text-blue-600 hover:text-blue-800 mr-4"
                >
                  ← Back to Key Vaults
                </button>
                <Key className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedKeyVault.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {selectedKeyVault.resourceGroup} • {selectedKeyVault.subscription}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <KeyVaultEditor 
            keyVault={selectedKeyVault}
            accessToken={keyVaultToken || accessToken}
          />
        </main>
      </div>
    );
  }
  // Show Key Vault selection if authenticated but no vault selected
  if (isAuthenticated && !selectedKeyVault) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Key className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Azure Key Vault Advanced Editor
                </h1>
              </div>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <Shield className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Select a Key Vault
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Choose the Azure Key Vault you want to manage from the list below.
            </p>
            
            {/* Search Box */}
            <div className="max-w-md mx-auto mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search Key Vaults..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {isLoading || isLoadingKeyVault ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isLoadingKeyVault ? 'Preparing Key Vault access...' : 'Loading your Key Vaults...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Results Summary */}
              {searchTerm && (
                <div className="text-center text-sm text-gray-600 mb-4">
                  {filteredKeyVaults.length === 0 
                    ? `No Key Vaults found matching "${searchTerm}"`
                    : `Found ${filteredKeyVaults.length} Key Vault${filteredKeyVaults.length === 1 ? '' : 's'} matching "${searchTerm}"`
                  }
                </div>
              )}
              
              {filteredKeyVaults.map((vault) => (
                <div
                  key={vault.id}
                  onClick={() => selectKeyVault(vault)}
                  className="bg-white rounded-lg border shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-3 rounded-lg mr-4">
                        <Key className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {vault.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {vault.resourceGroup} • {vault.location}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {vault.subscription}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
              
              {keyVaults.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-yellow-100 p-4 rounded-full w-fit mx-auto mb-4">
                    <Key className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Key Vaults Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You don't have access to any Key Vaults, or they may be in a different subscription.
                  </p>
                  <button
                    onClick={() => window.open('https://portal.azure.com', '_blank')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Azure Portal
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Show login page if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Azure Key Vault Advanced Editor
              </h1>
            </div>
            <a
              href="/demo"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Demo
            </a>
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-100 p-6 rounded-full">
              <Shield className="h-16 w-16 text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Secure Azure Key Vault Management
          </h2>
          
          <p className="text-xl text-gray-600 mb-12 max-w-lg mx-auto">
            Advanced secret management with batch operations, secure editing, and comprehensive audit trails.
          </p>
          
          {/* Configuration Error Display */}
          {configError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-lg mx-auto">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Configuration Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{configError}</p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setConfigError(null)}
                      className="text-sm text-red-600 hover:text-red-500 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Auth Error Display */}
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-lg mx-auto">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication Failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{authError}</p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setAuthError(null)}
                      className="text-sm text-red-600 hover:text-red-500 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Redirecting to Azure...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={initiateAzureLogin}
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg shadow-lg"
              >
                <ExternalLink className="h-6 w-6 mr-3" />
                Sign in with Azure
              </button>
              
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                You&apos;ll be redirected to Microsoft Azure to sign in securely. After authentication, 
                you&apos;ll return here to select and manage your Key Vaults.
              </p>
              
              <div className="bg-white rounded-lg border p-6 mt-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-4 text-center">
                  What happens next?
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                  <li>Sign in to your Microsoft Azure account</li>
                  <li>Grant permissions for Key Vault access</li>
                  <li>Return to this page automatically</li>
                  <li>Select the Key Vault you want to manage</li>
                  <li>Start managing your secrets securely</li>
                </ol>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Permission Requirements</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    To access Key Vault secrets, you'll need one of these permissions:
                  </p>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• <strong>Key Vault Secrets User</strong> (to read secrets)</li>
                    <li>• <strong>Key Vault Secrets Officer</strong> (to manage secrets)</li>
                    <li>• <strong>Key Vault Contributor</strong> (full access)</li>
                  </ul>
                  <p className="text-blue-600 text-xs mt-2">
                    If you get permission errors, contact your Azure administrator or see our troubleshooting guide.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
