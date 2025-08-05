'use client';

import { useState } from 'react';
import { X, Key, AlertCircle, Info } from 'lucide-react';

interface ConnectionConfig {
  vaultUrl: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  useManagedIdentity: boolean;
}

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: ConnectionConfig) => void;
  loading: boolean;
}

export default function ConnectionModal({ isOpen, onClose, onConnect, loading }: ConnectionModalProps) {
  const [config, setConfig] = useState<ConnectionConfig>({
    vaultUrl: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    useManagedIdentity: true
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate Vault URL
    if (!config.vaultUrl.trim()) {
      newErrors.vaultUrl = 'Key Vault URL is required';
    } else if (!config.vaultUrl.match(/^https:\/\/[\w-]+\.vault\.azure\.net\/?$/)) {
      newErrors.vaultUrl = 'Invalid Key Vault URL format (e.g., https://myvault.vault.azure.net)';
    }

    // Validate Service Principal credentials if not using Managed Identity
    if (!config.useManagedIdentity) {
      if (!config.tenantId?.trim()) {
        newErrors.tenantId = 'Tenant ID is required for Service Principal authentication';
      }
      if (!config.clientId?.trim()) {
        newErrors.clientId = 'Client ID is required for Service Principal authentication';
      }
      if (!config.clientSecret?.trim()) {
        newErrors.clientSecret = 'Client Secret is required for Service Principal authentication';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onConnect(config);
    }
  };

  const handleInputChange = (field: keyof ConnectionConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Key className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Connect to Azure Key Vault
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key Vault URL */}
            <div>
              <label htmlFor="vaultUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Key Vault URL *
              </label>
              <input
                type="url"
                id="vaultUrl"
                value={config.vaultUrl}
                onChange={(e) => handleInputChange('vaultUrl', e.target.value)}
                placeholder="https://myvault.vault.azure.net"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vaultUrl ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.vaultUrl && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.vaultUrl}
                </p>
              )}
            </div>

            {/* Authentication Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authentication Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={config.useManagedIdentity}
                    onChange={() => handleInputChange('useManagedIdentity', true)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Managed Identity (Recommended)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!config.useManagedIdentity}
                    onChange={() => handleInputChange('useManagedIdentity', false)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Service Principal
                  </span>
                </label>
              </div>
            </div>

            {/* Managed Identity Info */}
            {config.useManagedIdentity && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Using Managed Identity</p>
                    <p className="mt-1">
                      This authentication method works when running in Azure (App Service, Container Instances, etc.) 
                      or when using Azure CLI/PowerShell with a signed-in user.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Service Principal Fields */}
            {!config.useManagedIdentity && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Service Principal Authentication</p>
                      <p className="mt-1">
                        Only use this method for development/testing. Never hardcode credentials in production.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant ID *
                  </label>
                  <input
                    type="text"
                    id="tenantId"
                    value={config.tenantId || ''}
                    onChange={(e) => handleInputChange('tenantId', e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.tenantId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.tenantId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.tenantId}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    id="clientId"
                    value={config.clientId || ''}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.clientId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.clientId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.clientId}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Secret *
                  </label>
                  <input
                    type="password"
                    id="clientSecret"
                    value={config.clientSecret || ''}
                    onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                    placeholder="Enter client secret"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.clientSecret ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.clientSecret && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.clientSecret}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
