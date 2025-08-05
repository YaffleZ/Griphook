'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Edit, Save, X, Search, Download, Upload, Eye, EyeOff, FileText, Calendar, Tag, CheckSquare, Square, Grid, List } from 'lucide-react';
import AddSecretModal from './AddSecretModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import TroubleshootingGuide from './TroubleshootingGuide';
import BatchEditModal from './BatchEditModal';

/**
 * Azure Key Vault Secret interface
 */
interface KeyVaultSecret {
  id: string;
  name: string;
  value: string;
  contentType?: string;
  enabled: boolean;
  createdOn?: Date;
  updatedOn?: Date;
  expiresOn?: Date;
  tags?: { [propertyName: string]: string };
}

/**
 * Key Vault info interface
 */
interface KeyVault {
  id: string;
  name: string;
  resourceGroup: string;
  subscription: string;
  location: string;
  url: string;
}

/**
 * Props interface
 */
interface KeyVaultEditorProps {
  keyVault: KeyVault;
  accessToken: string | null;
}

/**
 * Batch operation interface
 */
interface BatchOperation {
  type: 'update' | 'delete';
  secretName: string;
  newValue?: string;
}

// Custom credential class to use the user's access token - removed, now using API endpoints

/**
 * Create a detailed permission error message with troubleshooting steps
 */
function createPermissionError(keyVaultName: string): string {
  return `Access denied to Key Vault '${keyVaultName}'. Please ensure you have the required permissions:

Required Permissions:
• Key Vault Secrets User (to read secrets)
• Key Vault Secrets Officer (to manage secrets)  
• Key Vault Contributor (full access)

To resolve this issue:
1. Contact your Azure administrator
2. Request Key Vault permissions for this resource
3. Wait a few minutes for permissions to propagate
4. Try refreshing the page

Alternative solutions:
• Check if the Key Vault has access policies configured
• Verify your user account has the correct Azure AD role assignments
• Ensure the Key Vault is not restricted by network access rules`;
}

/**
 * Create user-friendly error message based on error type
 */
function createUserFriendlyError(error: any, context: string): string {
  if (typeof error === 'string') return error;
  if (error?.message) {
    // Handle specific Azure error patterns
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return `Access denied. You don't have permission to ${context}. Please contact your Azure administrator.`;
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return `Resource not found. The Key Vault or secret may have been deleted or moved.`;
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return `Authentication failed. Your session may have expired. Please try signing in again.`;
    }
    return error.message;
  }
  return `Failed to ${context}. Please try again or contact support.`;
}

export default function KeyVaultEditor({ keyVault, accessToken }: KeyVaultEditorProps) {
  // State management
  const [secrets, setSecrets] = useState<KeyVaultSecret[]>([]);
  const [selectedSecrets, setSelectedSecrets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [editingSecrets, setEditingSecrets] = useState<Set<string>>(new Set());
  const [secretValues, setSecretValues] = useState<{ [key: string]: string }>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<any>(null);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [secretsLoadTime, setSecretsLoadTime] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  /**
   * Load secrets from Key Vault using API
   */
  useEffect(() => {
    if (keyVault && accessToken) {
      loadSecrets();
    }
  }, [keyVault, accessToken]);

  /**
   * Load all secrets from Key Vault using API endpoint (optimized)
   */
  const loadSecrets = async () => {
    if (!accessToken || !keyVault) return;

    try {
      setLoading(true);
      setError(null);
      setLoadingProgress({ current: 0, total: 1 });
      
      const startTime = Date.now();
      const response = await fetch(`/api/keyvault/secrets?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 403) {
          console.error('Permission denied (403):', errorData);
          await checkPermissions();
          setError(`Access denied: ${errorData.details || 'You do not have permission to list secrets in this Key Vault.'}`);
          return;
        } else if (response.status === 401) {
          console.error('Authentication failed (401):', errorData);
          await checkPermissions();
          setError(`Authentication failed: ${errorData.details || 'Your access token may have expired.'}`);
          return;
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to load secrets');
      }

      const data = await response.json();
      const loadTime = Date.now() - startTime;
      setSecretsLoadTime(data.metadata?.loadTimeMs || loadTime);
      
      setSecrets(data.secrets.map((secret: any) => ({
        ...secret,
        value: '', // Will be loaded on demand
      })));

      setLoadingProgress(null);
    } catch (err) {
      console.error('Failed to load secrets:', err);
      setError(createUserFriendlyError(err, 'load secrets from Key Vault'));
      setLoadingProgress(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load secret value on demand using API
   */
  const loadSecretValue = async (secretName: string) => {
    if (!accessToken || !keyVault) return;
    
    try {
      const response = await fetch(`/api/keyvault/secrets/${encodeURIComponent(secretName)}?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load secret value');
      }

      const secret = await response.json();
      
      setSecretValues(prev => ({
        ...prev,
        [secretName]: secret.value || ''
      }));
    } catch (err) {
      console.error(`Failed to load secret value for ${secretName}:`, err);
      setError(createUserFriendlyError(err, `load secret value for ${secretName}`));
    }
  };

  /**
   * Batch load multiple secret values in parallel for better performance
   */
  const batchLoadSecretValues = async (secretNames: string[]) => {
    if (!accessToken || !keyVault || secretNames.length === 0) return;

    try {
      setLoading(true);
      setLoadingProgress({ current: 0, total: secretNames.length });

      // Batch size of 10 to avoid overwhelming the API
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < secretNames.length; i += batchSize) {
        batches.push(secretNames.slice(i, i + batchSize));
      }

      let loaded = 0;
      for (const batch of batches) {
        const response = await fetch('/api/keyvault/secrets/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            keyVaultUrl: keyVault.url,
            secretNames: batch
          })
        });

        if (response.ok) {
          const data = await response.json();
          setSecretValues(prev => ({
            ...prev,
            ...data.secretValues
          }));
          loaded += data.metadata?.successful || 0;
          setLoadingProgress({ current: loaded, total: secretNames.length });
        }
      }

      setLoadingProgress(null);
    } catch (err) {
      console.error('Failed to batch load secret values:', err);
      setError(createUserFriendlyError(err, 'batch load secret values'));
      setLoadingProgress(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a new secret using API
   */
  const addSecret = async (name: string, value: string, contentType?: string, tags?: { [key: string]: string }) => {
    if (!accessToken || !keyVault) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/keyvault/secrets?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name, value, contentType, tags })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 403) {
          console.error('Permission denied (403) when adding secret:', errorData);
          await checkPermissions();
          setError(`Access denied: ${errorData.details || 'You do not have permission to create secrets in this Key Vault.'}`);
          return;
        } else if (response.status === 401) {
          console.error('Authentication failed (401) when adding secret:', errorData);
          await checkPermissions();
          setError(`Authentication failed: ${errorData.details || 'Your access token may have expired.'}`);
          return;
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to add secret');
      }

      const newSecret = await response.json();

      // Refresh the secrets list to show the new secret
      await loadSecrets();
      
      // Close modal and reset form on success
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add secret:', err);
      setError(createUserFriendlyError(err, 'add secret'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a secret using API
   */
  const updateSecret = async (name: string, value: string) => {
    if (!accessToken || !keyVault) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/keyvault/secrets/${encodeURIComponent(name)}?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ value })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update secret');
      }
      
      // Update local state
      setSecretValues(prev => ({
        ...prev,
        [name]: value
      }));
      
      setEditingSecrets(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });

      await loadSecrets();
    } catch (err) {
      console.error('Failed to update secret:', err);
      setError(createUserFriendlyError(err, 'update secret'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete selected secrets using API
   */
  const deleteSecrets = async () => {
    if (!accessToken || !keyVault || selectedSecrets.size === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Delete each selected secret
      for (const secretName of selectedSecrets) {
        const response = await fetch(`/api/keyvault/secrets?vaultUrl=${encodeURIComponent(keyVault.url)}&secretName=${encodeURIComponent(secretName)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          const errorMessage = errorData.error || `Failed to delete secret ${secretName}`;
          throw new Error(errorMessage);
        }
      }

      setSelectedSecrets(new Set());
      setIsDeleteModalOpen(false);
      await loadSecrets();
    } catch (err) {
      console.error('Failed to delete secrets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete secrets';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle secret selection for batch operations
   */
  const toggleSecretSelection = (secretName: string) => {
    setSelectedSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(secretName)) {
        newSet.delete(secretName);
      } else {
        newSet.add(secretName);
      }
      return newSet;
    });
  };

  /**
   * Toggle secret visibility
   */
  const toggleSecretVisibility = async (secretName: string) => {
    if (!visibleSecrets.has(secretName) && !secretValues[secretName]) {
      await loadSecretValue(secretName);
    }
    
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(secretName)) {
        newSet.delete(secretName);
      } else {
        newSet.add(secretName);
      }
      return newSet;
    });
  };

  /**
   * Start editing a secret
   */
  const startEditing = async (secretName: string) => {
    // Load the secret value if not already loaded
    if (!secretValues[secretName]) {
      await loadSecretValue(secretName);
    }
    
    // Make the secret visible and start editing immediately
    setVisibleSecrets(prev => new Set([...prev, secretName]));
    setEditingSecrets(prev => new Set([...prev, secretName]));
  };

  /**
   * Cancel editing a secret
   */
  const cancelEditing = (secretName: string) => {
    setEditingSecrets(prev => {
      const newSet = new Set(prev);
      newSet.delete(secretName);
      return newSet;
    });
  };

  /**
   * Export secrets to JSON (without values for security)
   */
  const exportSecrets = () => {
    const exportData = secrets.map(secret => ({
      name: secret.name,
      contentType: secret.contentType,
      enabled: secret.enabled,
      tags: secret.tags,
      createdOn: secret.createdOn,
      updatedOn: secret.updatedOn,
      expiresOn: secret.expiresOn
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyvault-secrets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Get current identity information for debugging
   */
  const getIdentityInfo = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('/api/debug/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });

      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data.identity);
        setShowDebug(true);
      }
    } catch (err) {
      console.error('Failed to get identity info:', err);
    }
  };

  /**
   * Check Key Vault permissions and get detailed guidance
   */
  const checkPermissions = async () => {
    if (!accessToken || !keyVault) return;

    try {
      const response = await fetch('/api/keyvault/check-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyVaultUrl: keyVault.url,
          accessToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPermissionCheck(data);
        
        if (!data.hasAccess) {
          setShowPermissionHelp(true);
          setError(data.guidance?.description || 'Access denied to Key Vault');
        }
      }
    } catch (err) {
      console.error('Failed to check permissions:', err);
    }
  };

  /**
   * Load all secret values for batch editing (optimized with parallel loading)
   */
  const loadAllSecretValues = async () => {
    if (!accessToken || !keyVault) return;

    try {
      setLoading(true);
      setError(null);

      // Find secrets that don't have values loaded yet
      const secretsToLoad = secrets.filter(secret => !secretValues[secret.name]).map(s => s.name);
      
      if (secretsToLoad.length === 0) {
        return; // All values already loaded
      }

      // Use batch loading for better performance
      await batchLoadSecretValues(secretsToLoad);
    } catch (err) {
      console.error('Failed to load all secret values:', err);
      setError(createUserFriendlyError(err, 'load all secret values'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle batch edit & add - load all values and open modal
   */
  const handleBatchEdit = async () => {
    // Allow batch operations even if no secrets exist (for adding new ones)
    // Load all secret values first (if any exist)
    await loadAllSecretValues();
    
    // Open the batch edit modal
    setIsBatchEditModalOpen(true);
  };

  /**
   * Handle batch save from modal
   */
  const handleBatchSave = async (updates: Array<{ name: string; value: string }>, newSecrets: Array<{ name: string; value: string }>, deletedSecrets: Array<{ name: string }>) => {
    if (!accessToken || !keyVault) return;

    try {
      setLoading(true);
      setError(null);

      let successCount = 0;
      let errorCount = 0;

      // Update existing secrets
      for (const update of updates) {
        try {
          const response = await fetch(`/api/keyvault/secrets/${encodeURIComponent(update.name)}?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ value: update.value })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update secret');
          }

          // Update local state
          setSecretValues(prev => ({
            ...prev,
            [update.name]: update.value
          }));

          successCount++;
        } catch (err) {
          console.error(`Failed to update secret ${update.name}:`, err);
          errorCount++;
        }
      }

      // Create new secrets
      for (const newSecret of newSecrets) {
        try {
          const response = await fetch(`/api/keyvault/secrets?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ 
              name: newSecret.name, 
              value: newSecret.value 
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create secret');
          }

          successCount++;
        } catch (err) {
          console.error(`Failed to create secret ${newSecret.name}:`, err);
          errorCount++;
        }
      }

      // Delete secrets
      for (const deletedSecret of deletedSecrets) {
        try {
          const response = await fetch(`/api/keyvault/secrets/${encodeURIComponent(deletedSecret.name)}?vaultUrl=${encodeURIComponent(keyVault.url)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete secret');
          }

          successCount++;
        } catch (err) {
          console.error(`Failed to delete secret ${deletedSecret.name}:`, err);
          errorCount++;
        }
      }

      // Show results
      const totalOperations = updates.length + newSecrets.length + deletedSecrets.length;
      if (errorCount === 0) {
        console.log(`Successfully processed ${successCount} secret${successCount !== 1 ? 's' : ''} (${updates.length} updated, ${newSecrets.length} created, ${deletedSecrets.length} deleted)`);
      } else {
        setError(`Processed ${successCount}/${totalOperations} secrets successfully (${errorCount} failed)`);
      }

      // Reload secrets to get updated metadata and reflect all changes
      await loadSecrets();
    } catch (err) {
      console.error('Failed to perform batch operation:', err);
      setError(createUserFriendlyError(err, 'perform batch operation'));
    } finally {
      setLoading(false);
    }
  };

  // Filter secrets based on search term
  const filteredSecrets = secrets.filter(secret =>
    secret.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Key Vault Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Key className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-blue-800 font-medium">
            Connected to: {keyVault.url}
          </span>
          <span className="ml-auto text-blue-600 text-sm">
            {keyVault.resourceGroup} • {keyVault.location}
            {secretsLoadTime && (
              <span className="ml-2 text-blue-500">
                • Loaded in {secretsLoadTime}ms
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <X className="h-6 w-6 text-red-600 mr-3 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-3">
                {permissionCheck?.guidance?.issue || (error.includes('Access denied') ? 'Permission Required' : 'Error')}
              </h3>
              <div className="text-red-700 mb-4 whitespace-pre-line leading-relaxed">
                {permissionCheck?.guidance?.description || error}
              </div>
              
              {/* Detailed Permission Guidance */}
              {permissionCheck?.guidance && (
                <div className="space-y-4 mb-4">
                  {/* User Information */}
                  {permissionCheck.guidance.userInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Current User Information:</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Name:</strong> {permissionCheck.guidance.userInfo.name}</p>
                        <p><strong>Email:</strong> {permissionCheck.guidance.userInfo.upn}</p>
                        <p><strong>Object ID:</strong> {permissionCheck.guidance.userInfo.objectId}</p>
                        <p><strong>Key Vault:</strong> {permissionCheck.guidance.keyVaultName}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Solutions */}
                  {permissionCheck.guidance.solutions && (
                    <div className="bg-white rounded-lg border border-red-200 p-4">
                      <h4 className="font-medium text-red-800 mb-3">Solutions:</h4>
                      <div className="space-y-3">
                        {permissionCheck.guidance.solutions.map((solution: any, index: number) => (
                          <div key={index} className="border-l-4 border-blue-400 pl-4">
                            <h5 className="font-medium text-gray-800">{solution.title}</h5>
                            <p className="text-sm text-gray-600 mb-2">{solution.description}</p>
                            <div className="flex gap-2">
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {solution.action}
                              </span>
                              {solution.azurePortalUrl && (
                                <button
                                  onClick={() => window.open(solution.azurePortalUrl, '_blank')}
                                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                  Open in Azure Portal
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Causes */}
                  {permissionCheck.guidance.causes && (
                    <details className="bg-gray-50 rounded-lg p-4">
                      <summary className="font-medium text-gray-800 cursor-pointer">
                        Possible Causes (click to expand)
                      </summary>
                      <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                        {permissionCheck.guidance.causes.map((cause: string, index: number) => (
                          <li key={index}>{cause}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              
              {error.includes('Access denied') && !permissionCheck?.guidance && (
                <div className="bg-white rounded-lg border border-red-200 p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Quick Solutions:</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Azure Portal:</p>
                      <button
                        onClick={() => window.open(`https://portal.azure.com/#@/resource${keyVault.id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Open Key Vault in Azure Portal
                      </button>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Documentation:</p>
                      <button
                        onClick={() => window.open('https://docs.microsoft.com/en-us/azure/key-vault/general/assign-access-policy', '_blank')}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Azure Key Vault Access Policies
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    setPermissionCheck(null);
                    setShowPermissionHelp(false);
                    loadSecrets();
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setPermissionCheck(null);
                    setShowPermissionHelp(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Dismiss
                </button>
                {!showPermissionHelp && (
                  <button
                    onClick={() => setShowPermissionHelp(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Show Troubleshooting Guide
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      {showDebug && debugInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Identity Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Name:</strong> {debugInfo.name || 'N/A'}</p>
                  <p><strong>UPN:</strong> {debugInfo.userPrincipalName || 'N/A'}</p>
                  <p><strong>Object ID:</strong> {debugInfo.objectId}</p>
                  <p><strong>Tenant ID:</strong> {debugInfo.tenantId}</p>
                </div>
                <div>
                  <p><strong>Token Scope:</strong> {debugInfo.scope || 'N/A'}</p>
                  <p><strong>Roles:</strong> {debugInfo.roles?.length ? debugInfo.roles.join(', ') : 'None'}</p>
                  <p><strong>Expires:</strong> {new Date(debugInfo.expiresAt).toLocaleString()}</p>
                  <p><strong>Client ID:</strong> {debugInfo.clientId}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <p><strong>Note:</strong> This is the identity being used to access your Key Vault. 
                If you're getting access denied errors, this user needs appropriate Key Vault permissions.</p>
              </div>
            </div>
            <button
              onClick={() => setShowDebug(false)}
              className="ml-2 text-gray-600 hover:text-gray-800 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search and View Toggle */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search secrets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="h-4 w-4" />
                Cards
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={!accessToken}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add Secret
            </button>

            <button
              onClick={handleBatchEdit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              Batch Edit
            </button>

            {selectedSecrets.size > 0 && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedSecrets.size})
              </button>
            )}

            <button
              onClick={getIdentityInfo}
              disabled={!accessToken}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Debug Identity
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Loading Secrets</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => loadSecrets()}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setShowPermissionHelp(true)}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Get Help
                </button>
                <button
                  onClick={() => setError(null)}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Progress */}
      {loadingProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-800 font-medium">Loading secret values...</span>
            <span className="text-blue-600 text-sm">
              {loadingProgress.current}/{loadingProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Secrets Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <span className="text-gray-600">
              {loadingProgress 
                ? `Loading secrets... ${loadingProgress.current}/${loadingProgress.total}`
                : 'Loading secrets...'
              }
            </span>
          </div>
        </div>
      ) : filteredSecrets.length === 0 ? (
        <div className="text-center py-12">
          <Key className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No secrets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new secret.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile Card View for Small Screens */}
          <div className="block sm:hidden">
            <div className="space-y-4 p-4">
              {filteredSecrets.map((secret) => {
                const isSelected = selectedSecrets.has(secret.name);
                const isEditing = editingSecrets.has(secret.name);
                const isVisible = visibleSecrets.has(secret.name);
                const value = secretValues[secret.name] || '';
                
                return (
                  <div
                    key={secret.name}
                    className={`border rounded-lg p-4 ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleSecretSelection(secret.name)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isSelected ? 
                            <CheckSquare className="h-4 w-4 text-blue-600" /> : 
                            <Square className="h-4 w-4" />
                          }
                        </button>
                        <h3 className="font-medium text-gray-900">{secret.name}</h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleSecretVisibility(secret.name)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={isVisible ? 'Hide value' : 'Show value'}
                        >
                          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {!isEditing ? (
                          <button
                            onClick={() => startEditing(secret.name)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit secret"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => updateSecret(secret.name, value)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Save changes"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => cancelEditing(secret.name)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Cancel editing"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(isVisible || isEditing) && (
                      <div className="mb-3">
                        {isEditing ? (
                          <textarea
                            value={value}
                            onChange={(e) => setSecretValues(prev => ({ ...prev, [secret.name]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px] font-mono text-sm"
                            placeholder="Enter secret value..."
                          />
                        ) : value ? (
                          <div className="font-mono text-xs bg-gray-100 p-2 rounded border break-all max-h-20 overflow-y-auto">
                            {value}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Loading...</span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        secret.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {secret.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {secret.contentType && secret.contentType !== 'text/plain' && (
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
                          {secret.contentType}
                        </span>
                      )}
                      {secret.updatedOn && (
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          {new Date(secret.updatedOn).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <button
                      onClick={() => {
                        if (selectedSecrets.size === filteredSecrets.length) {
                          setSelectedSecrets(new Set());
                        } else {
                          setSelectedSecrets(new Set(filteredSecrets.map(s => s.name)));
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {selectedSecrets.size === filteredSecrets.length ? 
                        <CheckSquare className="h-4 w-4" /> : 
                        <Square className="h-4 w-4" />
                      }
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSecrets.map((secret) => {
                  const isSelected = selectedSecrets.has(secret.name);
                  const isEditing = editingSecrets.has(secret.name);
                  const isVisible = visibleSecrets.has(secret.name);
                  const value = secretValues[secret.name] || '';
                  
                  return (
                    <tr key={secret.name} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                      {/* Selection Checkbox */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleSecretSelection(secret.name)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isSelected ? 
                            <CheckSquare className="h-4 w-4 text-blue-600" /> : 
                            <Square className="h-4 w-4" />
                          }
                        </button>
                      </td>
                      
                      {/* Secret Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {secret.name}
                        </div>
                      </td>
                      
                      {/* Secret Value */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 min-h-[60px]">
                          <div className="text-sm text-gray-900 max-w-xs flex-1">
                            {isEditing ? (
                              <textarea
                                value={value}
                                onChange={(e) => setSecretValues(prev => ({ ...prev, [secret.name]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-[44px]"
                                placeholder="Enter secret value..."
                              />
                            ) : isVisible ? (
                              value ? (
                                <div className="font-mono text-xs bg-gray-100 p-2 rounded border break-all max-h-[44px] overflow-y-auto">
                                  {value}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Loading...</span>
                              )
                            ) : (
                              <span className="text-gray-400">••••••••</span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleSecretVisibility(secret.name)}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                            title={isVisible ? 'Hide value' : 'Show value'}
                          >
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                      
                      {/* Updated Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {secret.updatedOn ? new Date(secret.updatedOn).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {!isEditing ? (
                            <button
                              onClick={() => startEditing(secret.name)}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit secret"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => updateSecret(secret.name, value)}
                                className="text-gray-400 hover:text-green-600 transition-colors"
                                title="Save changes"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => cancelEditing(secret.name)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Cancel editing"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Cards View
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSecrets.map((secret) => {
            const isSelected = selectedSecrets.has(secret.name);
            const isEditing = editingSecrets.has(secret.name);
            const isVisible = visibleSecrets.has(secret.name);
            const value = secretValues[secret.name] || '';
            
            return (
              <div
                key={secret.name}
                className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleSecretSelection(secret.name)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isSelected ? 
                          <CheckSquare className="h-4 w-4 text-blue-600" /> : 
                          <Square className="h-4 w-4" />
                        }
                      </button>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{secret.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            secret.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {secret.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {secret.contentType && secret.contentType !== 'text/plain' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {secret.contentType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleSecretVisibility(secret.name)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={isVisible ? 'Hide value' : 'Show value'}
                      >
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      
                      {!isEditing ? (
                        <button
                          onClick={() => startEditing(secret.name)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit secret"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => updateSecret(secret.name, value)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Save changes"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cancelEditing(secret.name)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Cancel editing"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {/* Secret Value */}
                  {(isVisible || isEditing) && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Secret Value
                      </label>
                      {isEditing ? (
                        <textarea
                          value={value}
                          onChange={(e) => setSecretValues(prev => ({ ...prev, [secret.name]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px] font-mono text-sm"
                          placeholder="Enter secret value..."
                        />
                      ) : value ? (
                        <div className="font-mono text-sm bg-gray-100 p-3 rounded border break-all max-h-32 overflow-y-auto">
                          {value}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic text-sm">Loading...</div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 text-sm">
                    {secret.updatedOn && (
                      <div className="flex items-center text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Updated: {new Date(secret.updatedOn).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {secret.tags && Object.keys(secret.tags).length > 0 && (
                      <div>
                        <div className="flex items-center text-gray-500 mb-1">
                          <Tag className="h-4 w-4 mr-1" />
                          <span>Tags:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(secret.tags).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              title={`${key}: ${value}`}
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddSecretModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addSecret}
        loading={loading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteSecrets}
        secretCount={selectedSecrets.size}
        loading={loading}
      />

      <BatchEditModal
        isOpen={isBatchEditModalOpen}
        onClose={() => setIsBatchEditModalOpen(false)}
        secrets={secrets}
        secretValues={secretValues}
        onSave={handleBatchSave}
        loading={loading}
      />

      {/* Debug Info */}
      {showDebug && debugInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
          <div className="flex items-center">
            <h4 className="text-gray-800 font-medium mr-2">Debug Info:</h4>
            <button
              onClick={() => setShowDebug(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* Troubleshooting Guide */}
      <TroubleshootingGuide
        isOpen={showPermissionHelp}
        onClose={() => setShowPermissionHelp(false)}
      />
    </div>
  );
}
