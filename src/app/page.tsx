'use client';

import { useState, useEffect } from 'react';
import { Key, Shield, ExternalLink, ChevronRight, Search } from 'lucide-react';
import KeyVaultEditor from '@/components/KeyVaultEditor';
import { getAzureConfig, validateAzureConfig } from '../config/azure';
import { AzureSecureStorage } from '@/utils/secureStorage';

interface KeyVault {
  id: string;
  name: string;
  resourceGroup: string;
  subscription: string;
  location: string;
  url: string;
}

interface SubscriptionInfo {
  subscriptionId?: string;
  displayName?: string;
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
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{message: string, percent: number} | null>(null);
  const [showSubscriptionSelection, setShowSubscriptionSelection] = useState(false);

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

  // Check for auth callback on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
  // const vaultParam = urlParams.get('vault');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      setAuthError(`Authentication failed: ${errorDescription || error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      handleAuthCallback(code);
    } else {
      // Load stored authentication data with automatic migration
      loadStoredAuthData();
    }
  }, []);

  // Function to load stored auth data with migration support
  const loadStoredAuthData = async () => {
    try {
      // First, attempt migration from plain storage if needed
      await AzureSecureStorage.migrateFromPlainStorage();
      
      // Then load from encrypted storage
      const storedToken = await AzureSecureStorage.getAccessToken();
      const storedRefreshToken = await AzureSecureStorage.getRefreshToken();
      const storedKeyVaults = await AzureSecureStorage.getKeyVaults();
      const storedSubs = await AzureSecureStorage.getSubscriptions();

      if (storedToken && storedKeyVaults) {
        console.log('Loading authentication data from encrypted storage');
        setAccessToken(storedToken);
        if (storedRefreshToken) {
          setRefreshToken(storedRefreshToken);
        }
        if (storedSubs) {
          setSubscriptions(storedSubs);
        }
        setKeyVaults(storedKeyVaults);
        setFilteredKeyVaults(storedKeyVaults);
        
        // Always show subscription selection screen for user choice
        console.log('Always showing subscription selection screen for user confirmation');
        // Pre-select all subscriptions so users can see them all and modify if needed
        const allSubscriptionNames = (storedSubs || [])
          .map((sub: SubscriptionInfo) => sub.displayName || sub.subscriptionId || '')
          .filter((name: string) => name !== '');
        setSelectedSubscriptions(allSubscriptionNames);
        setShowSubscriptionSelection(true);
        // Don't set isAuthenticated yet - wait for user to confirm selection
      }
    } catch (e) {
      console.error('Failed to load stored authentication data:', e);
      // Clear all data on error
      AzureSecureStorage.clearAllAzureData();
      // Also clear any remaining plain storage as fallback
      localStorage.removeItem('azure_access_token');
      localStorage.removeItem('azure_refresh_token');
      localStorage.removeItem('azure_key_vaults');
      localStorage.removeItem('azure_subscriptions');
    }
  };

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
      // Generate PKCE pair server-side (avoids crypto.subtle unavailability in
      // non-secure browser contexts such as plain http:// network addresses)
      const pkceRes = await fetch('/api/auth/pkce');
      if (!pkceRes.ok) {
        const body = await pkceRes.text().catch(() => '');
        throw new Error(`Failed to generate PKCE values (${pkceRes.status}): ${body}`);
      }
      const { verifier, challenge } = await pkceRes.json();

      // Store verifier in localStorage — survives full-page cross-origin navigations
      localStorage.setItem('pkce_verifier', verifier);

      const authUrl =
        `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${AZURE_CONFIG.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(AZURE_CONFIG.redirectUri)}&` +
        `scope=${encodeURIComponent(AZURE_CONFIG.scope)}&` +
        `code_challenge=${encodeURIComponent(challenge)}&` +
        `code_challenge_method=S256&` +
        `response_mode=query&` +
        `prompt=select_account&` +
        `state=${encodeURIComponent(window.location.pathname)}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error in initiateAzureLogin:', error);
      setAuthError(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAuthCallback = async (code: string, overrideRedirectUri?: string, codeVerifier?: string) => {
    console.log('handleAuthCallback called');
    setIsLoading(true);
    setLoadingProgress({message: 'Processing Azure authentication response...', percent: 10});
    try {
      console.log('Starting token exchange', { codePresent: !!code, overrideRedirectUri, codeVerifierPresent: !!codeVerifier });
      // Exchange authorization code for access token and Key Vault list
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for smoother animation
      setLoadingProgress({message: 'Exchanging authorization code for access token...', percent: 30});
      
      // Simulate progress while waiting for the API response
      let progressPercent = 30;
      const progressInterval = setInterval(() => {
        if (progressPercent < 45) {
          progressPercent += 1;
          setLoadingProgress({
            message: 'Exchanging authorization code for access token...', 
            percent: progressPercent
          });
        }
      }, 100);
      
      const response = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: AZURE_CONFIG.clientId,
          // Use the exact redirectUri used during Electron OAuth if provided
          redirectUri: overrideRedirectUri || AZURE_CONFIG.redirectUri,
          tenantId: AZURE_CONFIG.tenantId,
          code_verifier: codeVerifier || localStorage.getItem('pkce_verifier') || undefined,
        }),
      });
      
      // Clear the progress interval
      clearInterval(progressInterval);

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        console.error('Token exchange failed', response.status, details);
        throw new Error('Failed to exchange authorization code');
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for smoother animation
      setLoadingProgress({message: 'Discovering your Azure subscriptions...', percent: 50});
      
      // Simulate progress while waiting for the API response
      progressPercent = 50;
      const discoveryInterval = setInterval(() => {
        if (progressPercent < 90) {
          progressPercent += 1;
          setLoadingProgress({
            message: 'Discovering your Azure subscriptions and Key Vaults...', 
            percent: progressPercent
          });
        }
      }, 200);
      
      const data = await response.json();
      console.log('Token exchange success; updating state');
      console.log('API Response Data:', data);
      
      // Clear the progress interval
      clearInterval(discoveryInterval);
      
      // Get the number of subscriptions and key vaults
      const dataSubscriptionsCount = (data.subscriptions || []).length;
      const dataKeyVaultsCount = (data.keyVaults || []).length;
      console.log('Data subscriptions:', data.subscriptions);
      console.log('Data subscriptions count:', dataSubscriptionsCount);
      console.log('Data key vaults count:', dataKeyVaultsCount);
      
      // Update progress with subscription info
      if (dataSubscriptionsCount > 0) {
        setLoadingProgress({message: `Found ${dataSubscriptionsCount} subscription${dataSubscriptionsCount !== 1 ? 's' : ''}, scanning for Key Vaults...`, percent: 92});
        
        // Add a small delay to show the subscription count message
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Show a message indicating we're processing Key Vaults
        setLoadingProgress({message: `Processing Key Vaults from ${dataSubscriptionsCount} subscription${dataSubscriptionsCount !== 1 ? 's' : ''}...`, percent: 95});
        
        // Add a small delay to show the processing message
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Store token, subscriptions, and key vaults in encrypted storage
      console.log('Storing authentication data in encrypted storage...');
      await AzureSecureStorage.setAccessToken(data.token.access_token);
      if (data.token.refresh_token) {
        await AzureSecureStorage.setRefreshToken(data.token.refresh_token);
        setRefreshToken(data.token.refresh_token);
      }
      await AzureSecureStorage.setSubscriptions(data.subscriptions || []);
      await AzureSecureStorage.setKeyVaults(data.keyVaults || []);
      console.log('Authentication data stored securely');
      
      // Set state
      setAccessToken(data.token.access_token);
      setSubscriptions(data.subscriptions || []);
      setKeyVaults([]);
      setFilteredKeyVaults([]);
      console.log('Subscriptions state set:', data.subscriptions || []);

      // Surface any ARM discovery error so the user can see what went wrong
      if (data.discoveryError) {
        console.warn('Subscription discovery error:', data.discoveryError);
        setAuthError(`Signed in successfully, but failed to load subscriptions: ${data.discoveryError}`);
      }

      // Pre-select all subscriptions so users can see them all and modify if needed
      const allSubscriptionNames = (data.subscriptions || [])
        .map((sub: SubscriptionInfo) => sub.displayName || sub.subscriptionId || '')
        .filter((name: string) => name !== '');
      setSelectedSubscriptions(allSubscriptionNames);
      setShowSubscriptionSelection(true);
      
      // Clean up URL
      try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
    } catch (error) {
      console.error('Failed to handle auth callback:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      try { localStorage.removeItem('pkce_verifier'); } catch {}
      setIsLoading(false);
      setLoadingProgress(null);
    }
  };

  // refreshKeyVaults was unused; removed to satisfy linter

  const signOut = () => {
    // Clear encrypted storage
    AzureSecureStorage.clearAllAzureData();
    // Clear any remaining plain storage as fallback
    localStorage.removeItem('azure_access_token');
    localStorage.removeItem('azure_refresh_token');
    localStorage.removeItem('azure_key_vaults');
    localStorage.removeItem('azure_subscriptions');
    // Clear vault cache entries
    Object.keys(localStorage)
      .filter(k => k.startsWith('vault_cache_'))
      .forEach(k => localStorage.removeItem(k));

    setAccessToken(null);
    setRefreshToken(null);
    setKeyVaultToken(null);
    setIsAuthenticated(false);
    setShowSubscriptionSelection(false);
    setSubscriptions([]);
    setSelectedSubscriptions([]);
    setKeyVaults([]);
    setFilteredKeyVaults([]);
    setSearchTerm('');
    setSelectedKeyVault(null);
    setAuthError(null);
    setIsLoading(false);
    setLoadingProgress(null);
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

  const handleSubscriptionSelection = async () => {
    // Load Key Vaults for selected subscriptions
    if (selectedSubscriptions.length > 0) {
      setIsLoading(true);
      setLoadingProgress({message: 'Loading Key Vaults from selected subscriptions...', percent: 0});
      
      try {
        // Get subscription IDs for the selected subscriptions
        const selectedSubscriptionIds = selectedSubscriptions
          .map(subName => {
            const sub = subscriptions.find(s => s.displayName === subName || s.subscriptionId === subName);
            return sub?.subscriptionId;
          })
          .filter((id): id is string => id !== undefined)
          .sort(); // Sort for consistent caching
        
        console.log('Loading Key Vaults for subscriptions:', selectedSubscriptionIds);
        
        // Check if we have cached data for these subscriptions
        const cacheKey = `keyVaults_${selectedSubscriptionIds.join('_')}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            // Check if cache is still valid (less than 5 minutes old)
            if (Date.now() - parsedData.timestamp < 5 * 60 * 1000) {
              console.log('Using cached Key Vaults data');
              setLoadingProgress({message: `Loaded ${parsedData.keyVaults.length} Key Vault${parsedData.keyVaults.length !== 1 ? 's' : ''} from cache`, percent: 100});
              
              // Update state with cached Key Vaults
              setKeyVaults(parsedData.keyVaults);
              setFilteredKeyVaults(parsedData.keyVaults);
              localStorage.setItem('azure_key_vaults', JSON.stringify(parsedData.keyVaults));
              
              // Add a small delay to show the completion message
              await new Promise(resolve => setTimeout(resolve, 300));
              setIsLoading(false);
              setLoadingProgress(null);
              setShowSubscriptionSelection(false);
              setIsAuthenticated(true);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached data:', e);
          }
        }
        
        // Simulate progress while loading Key Vaults
        let progressPercent = 0;
        const progressInterval = setInterval(() => {
          if (progressPercent < 95) {
            progressPercent += 2; // Faster progress updates
            setLoadingProgress({
              message: `Loading Key Vaults from ${selectedSubscriptionIds.length} subscription${selectedSubscriptionIds.length !== 1 ? 's' : ''}...`, 
              percent: progressPercent
            });
          }
        }, 100); // Faster updates
        
        const response = await fetch('/api/keyvault/load-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: accessToken,
            subscriptionIds: selectedSubscriptionIds
          }),
        });
        
        clearInterval(progressInterval);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || 'Failed to load Key Vaults');
        }
        
        const data = await response.json();
        const loadedKeyVaults = data.keyVaults || [];
        
        console.log(`Loaded ${loadedKeyVaults.length} Key Vaults`);
        setLoadingProgress({message: `Loaded ${loadedKeyVaults.length} Key Vault${loadedKeyVaults.length !== 1 ? 's' : ''}`, percent: 100});
        
        // Cache the data
        const cacheData = {
          keyVaults: loadedKeyVaults,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        
        // Update state with loaded Key Vaults
        setKeyVaults(loadedKeyVaults);
        setFilteredKeyVaults(loadedKeyVaults);
        localStorage.setItem('azure_key_vaults', JSON.stringify(loadedKeyVaults));
        
        // Add a small delay to show the completion message
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error('Failed to load Key Vaults:', error);
        setAuthError(error instanceof Error ? error.message : 'Failed to load Key Vaults');
      } finally {
        setIsLoading(false);
        setLoadingProgress(null);
      }
    }
    
    setShowSubscriptionSelection(false);
    setIsAuthenticated(true);
  };

  const toggleSubscription = (subscriptionName: string) => {
    setSelectedSubscriptions(prev => 
      prev.includes(subscriptionName) 
        ? prev.filter(name => name !== subscriptionName)
        : [...prev, subscriptionName]
    );
  };

  const selectAllSubscriptions = () => {
    const allSubscriptionNames = subscriptions
      .map(sub => sub.displayName || sub.subscriptionId || '')
      .filter(name => name !== '');
    setSelectedSubscriptions(allSubscriptionNames);
  };

  const clearSubscriptionSelection = () => {
    setSelectedSubscriptions([]);
  };

  // Show subscription selection if needed
  if (showSubscriptionSelection) {
    console.log('Rendering subscription selection screen');
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
          {isLoading && loadingProgress ? (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${loadingProgress.percent}%` }}
                  ></div>
                </div>
                <p className="text-gray-600">{loadingProgress.message}</p>
                <p className="text-sm text-gray-500">{loadingProgress.percent}% complete</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <div className="bg-blue-100 p-4 rounded-full">
                    <Shield className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Select Subscriptions</h2>
                <p className="text-lg text-gray-600 mb-8">
                  You have access to {subscriptions.length} subscriptions. Select the ones you want to view Key Vaults from.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Your Azure Subscriptions</h3>
                  <div className="space-x-2">
                    <button
                      onClick={selectAllSubscriptions}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSubscriptionSelection}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...subscriptions].sort((a, b) => (a.displayName || a.subscriptionId || '').localeCompare(b.displayName || b.subscriptionId || '')).map((subscription) => (
                    <div 
                      key={subscription.subscriptionId || subscription.displayName} 
                      className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedSubscriptions.includes(subscription.displayName || subscription.subscriptionId || '') 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        const subName = subscription.displayName || subscription.subscriptionId || '';
                        toggleSubscription(subName);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubscriptions.includes(subscription.displayName || subscription.subscriptionId || '')}
                        onChange={() => {
                          const subName = subscription.displayName || subscription.subscriptionId || '';
                          toggleSubscription(subName);
                        }}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.displayName || subscription.subscriptionId}
                        </div>
                        {subscription.subscriptionId && subscription.displayName !== subscription.subscriptionId && (
                          <div className="text-xs text-gray-500">
                            {subscription.subscriptionId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSubscriptionSelection}
                    disabled={selectedSubscriptions.length === 0}
                    className={`px-6 py-2 rounded-md text-sm font-medium ${
                      selectedSubscriptions.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Continue with {selectedSubscriptions.length} subscription{selectedSubscriptions.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                <p>You can change your subscription selection later in the settings.</p>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Select a Key Vault</h2>
            <p className="text-lg text-gray-600 mb-4">Choose a Key Vault below to view and manage secrets.</p>
            
            {selectedSubscriptions.length > 0 && selectedSubscriptions.length < subscriptions.length && (
              <p className="text-sm text-gray-500 mb-4">
                Showing Key Vaults from {selectedSubscriptions.length} of {subscriptions.length} subscriptions. 
                <button 
                  onClick={() => setShowSubscriptionSelection(true)}
                  className="text-blue-600 hover:text-blue-800 ml-1"
                >
                  Change selection
                </button>
              </p>
            )}
            
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

          {isLoading || isLoadingKeyVault || loadingProgress ? (
            <div className="text-center py-12">
              {loadingProgress ? (
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${loadingProgress.percent}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600">{loadingProgress.message}</p>
                  <p className="text-sm text-gray-500">{loadingProgress.percent}% complete</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              )}
              <p className="text-gray-600">
                {isLoadingKeyVault ? 'Preparing Key Vault access...' : 
                 loadingProgress ? loadingProgress.message : 
                 'Finishing sign-in...'}
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
                <div className="text-center py-12 text-gray-600">No Key Vaults found for your subscriptions.</div>
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
            {/* Demo link removed */}
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
              {loadingProgress ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${loadingProgress.percent}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600 text-center">{loadingProgress.message}</p>
                  <p className="text-sm text-gray-500 text-center">{loadingProgress.percent}% complete</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Initializing...</p>
                </div>
              )}
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
