'use client';

import { useState, useEffect } from 'react';
import { X, Save, Download, Upload, AlertTriangle } from 'lucide-react';
import Portal from './Portal';

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

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  secrets: KeyVaultSecret[];
  secretValues: { [key: string]: string };
  onSave: (updates: Array<{ name: string; value: string }>, newSecrets: Array<{ name: string; value: string }>, deletedSecrets: Array<{ name: string }>) => Promise<void>;
  loading: boolean;
}

/**
 * Batch Edit Modal Component
 * Allows users to edit multiple secrets in JSON format for bulk operations
 */
export default function BatchEditModal({
  isOpen,
  onClose,
  secrets,
  secretValues,
  onSave,
  loading
}: BatchEditModalProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalJson, setOriginalJson] = useState('');

  // Focus management for the modal
  useEffect(() => {
    if (isOpen) {
      // Focus the textarea when the modal opens
      const textarea = document.querySelector('textarea');
      if (textarea) {
        setTimeout(() => textarea.focus(), 100);
      }
    }
  }, [isOpen]);

  // Initialize JSON content when modal opens or secrets change
  useEffect(() => {
    if (isOpen) {
      if (secrets.length > 0) {
        // Use simplified format for both views - only name and value
        const simplifiedSecrets = secrets.map(secret => ({
          name: secret.name,
          value: secretValues[secret.name] || ''
        }));

        const jsonString = JSON.stringify(simplifiedSecrets, null, 2);
        setJsonContent(jsonString);
        setOriginalJson(jsonString);
      } else {
        // No existing secrets - start with empty array
        const jsonString = JSON.stringify([], null, 2);
        setJsonContent(jsonString);
        setOriginalJson(jsonString);
      }
      
      setHasChanges(false);
      setIsValidJson(true);
      setErrorMessage('');
      // Always start in full screen mode - no longer resetting to false
    }
  }, [isOpen, secrets, secretValues]);

  // Add keyboard shortcuts for modal controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to close the modal
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);



  // Validate JSON and detect changes
  const handleContentChange = (value: string) => {
    setJsonContent(value);
    setHasChanges(value !== originalJson);

    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        
        // Validate structure
        if (!Array.isArray(parsed)) {
          throw new Error('JSON must be an array of secrets');
        }

        for (let i = 0; i < parsed.length; i++) {
          const secret = parsed[i];
          if (typeof secret !== 'object' || !secret.name || typeof secret.value !== 'string') {
            throw new Error(`Secret at index ${i} must have 'name' and 'value' properties`);
          }
        }

        setIsValidJson(true);
        setErrorMessage('');
      } else {
        setIsValidJson(false);
        setErrorMessage('JSON content cannot be empty');
      }
    } catch (error) {
      setIsValidJson(false);
      setErrorMessage(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!isValidJson || !hasChanges) return;

    try {
      const parsed = JSON.parse(jsonContent);
      
      // Separate updates, new secrets, and deleted secrets
      const updates: Array<{ name: string; value: string }> = [];
      const newSecrets: Array<{ name: string; value: string }> = [];
      const deletedSecrets: Array<{ name: string }> = [];
      
      // Track which secrets are in the JSON
      const secretsInJson = new Set(parsed.map((secret: any) => secret.name));
      
      parsed.forEach((secret: any) => {
        const originalSecret = secrets.find(s => s.name === secret.name);
        
        if (originalSecret) {
          // This is an existing secret - check if value changed
          if (secretValues[secret.name] !== secret.value) {
            updates.push({
              name: secret.name,
              value: secret.value
            });
          }
        } else {
          // This is a new secret
          newSecrets.push({
            name: secret.name,
            value: secret.value
          });
        }
      });

      // Find deleted secrets (original secrets not in the JSON anymore)
      secrets.forEach(originalSecret => {
        if (!secretsInJson.has(originalSecret.name)) {
          deletedSecrets.push({
            name: originalSecret.name
          });
        }
      });

      if (updates.length > 0 || newSecrets.length > 0 || deletedSecrets.length > 0) {
        await onSave(updates, newSecrets, deletedSecrets);
        onClose();
      } else {
        setErrorMessage('No changes, new secrets, or deletions detected');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save changes');
    }
  };

  // Export JSON to file
  const exportJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyvault-secrets-batch-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON from file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleContentChange(content);
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  const changedSecrets = (() => {
    if (!isValidJson || !hasChanges) return { updates: [], newSecrets: [], deletedSecrets: [] };
    try {
      const parsed = JSON.parse(jsonContent);
      const updates: any[] = [];
      const newSecrets: any[] = [];
      const deletedSecrets: any[] = [];
      
      // Track which secrets are in the JSON
      const secretsInJson = new Set(parsed.map((secret: any) => secret.name));
      
      parsed.forEach((secret: any) => {
        const originalSecret = secrets.find(s => s.name === secret.name);
        
        if (originalSecret) {
          // This is an existing secret - check if value changed
          if (secretValues[secret.name] !== secret.value) {
            updates.push(secret);
          }
        } else {
          // This is a new secret
          newSecrets.push(secret);
        }
      });
      
      // Find deleted secrets (original secrets not in the JSON anymore)
      secrets.forEach(originalSecret => {
        if (!secretsInJson.has(originalSecret.name)) {
          deletedSecrets.push(originalSecret);
        }
      });
      
      return { updates, newSecrets, deletedSecrets };
    } catch {
      return { updates: [], newSecrets: [], deletedSecrets: [] };
    }
  })();

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-white">
        <div className="bg-white shadow-xl w-full h-screen max-w-none max-h-none rounded-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Batch Edit Secrets (Full Screen)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Full screen editing mode. Edit, add, or delete secrets in JSON format. Press Escape to close.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-json"
            />
            <label
              htmlFor="import-json"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </label>
            <button
              onClick={exportJson}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* Status */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {secrets.length > 0 
                  ? `Editing ${secrets.length} existing secret${secrets.length !== 1 ? 's' : ''}`
                  : 'Adding new secrets (no existing secrets)'
                }
              </span>
              <div className="flex items-center space-x-4">
                {hasChanges && (changedSecrets.updates.length > 0 || changedSecrets.newSecrets.length > 0 || changedSecrets.deletedSecrets.length > 0) && (
                  <span className="text-blue-600 font-medium">
                    {changedSecrets.updates.length > 0 && (
                      <span>{changedSecrets.updates.length} update{changedSecrets.updates.length !== 1 ? 's' : ''}</span>
                    )}
                    {changedSecrets.updates.length > 0 && (changedSecrets.newSecrets.length > 0 || changedSecrets.deletedSecrets.length > 0) && <span>, </span>}
                    {changedSecrets.newSecrets.length > 0 && (
                      <span>{changedSecrets.newSecrets.length} new secret{changedSecrets.newSecrets.length !== 1 ? 's' : ''}</span>
                    )}
                    {changedSecrets.newSecrets.length > 0 && changedSecrets.deletedSecrets.length > 0 && <span>, </span>}
                    {changedSecrets.deletedSecrets.length > 0 && (
                      <span>{changedSecrets.deletedSecrets.length} deletion{changedSecrets.deletedSecrets.length !== 1 ? 's' : ''}</span>
                    )}
                  </span>
                )}
                <span className={`font-medium ${isValidJson ? 'text-green-600' : 'text-red-600'}`}>
                  {isValidJson ? '✓ Valid JSON' : '✗ Invalid JSON'}
                </span>
              </div>
            </div>
            
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {hasChanges && (changedSecrets.updates.length > 0 || changedSecrets.newSecrets.length > 0 || changedSecrets.deletedSecrets.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Changes to be saved:</h4>
                <div className="space-y-2">
                  {changedSecrets.updates.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-blue-700">Updates ({changedSecrets.updates.length}):</p>
                      <ul className="text-sm text-blue-700 space-y-1 ml-4">
                        {changedSecrets.updates.map((secret: any) => (
                          <li key={secret.name} className="font-mono">
                            • {secret.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {changedSecrets.newSecrets.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-blue-700">New secrets ({changedSecrets.newSecrets.length}):</p>
                      <ul className="text-sm text-blue-700 space-y-1 ml-4">
                        {changedSecrets.newSecrets.map((secret: any) => (
                          <li key={secret.name} className="font-mono text-green-600">
                            + {secret.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {changedSecrets.deletedSecrets.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-blue-700">Deletions ({changedSecrets.deletedSecrets.length}):</p>
                      <ul className="text-sm text-blue-700 space-y-1 ml-4">
                        {changedSecrets.deletedSecrets.map((secret: any) => (
                          <li key={secret.name} className="font-mono text-red-600">
                            - {secret.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* JSON Editor */}
          <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
            <textarea
              value={jsonContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="JSON content will appear here..."
              spellCheck={false}
              aria-label="Batch edit secrets JSON content"
              tabIndex={0}
            />
          </div>

          {/* Instructions */}
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>JSON shows the current secrets with 'name' and 'value' fields</li>
              <li>Edit the 'value' field for any secret you want to update</li>
              <li><strong>Add new secrets:</strong> Add new objects to the array with 'name' and 'value' fields</li>
              <li><strong>Delete secrets:</strong> Remove objects from the array to delete those secrets</li>
              <li>Example: <code>{`{"name": "my-new-secret", "value": "secret-value"}`}</code></li>
              <li>Ensure the JSON remains valid (proper syntax and structure)</li>
              <li>Changes are saved individually for each modified/new/deleted secret</li>
              <li>Use Export/Import to backup or share secret configurations</li>
              <li><strong>Keyboard shortcuts:</strong> Escape to close modal</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValidJson || !hasChanges || loading || (changedSecrets.updates.length === 0 && changedSecrets.newSecrets.length === 0 && changedSecrets.deletedSecrets.length === 0)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes ({changedSecrets.updates.length + changedSecrets.newSecrets.length + changedSecrets.deletedSecrets.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
