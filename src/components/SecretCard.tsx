'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Edit, Save, X, Calendar, Tag } from 'lucide-react';

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

interface SecretCardProps {
  secret: KeyVaultSecret;
  isSelected: boolean;
  isEditing: boolean;
  isVisible: boolean;
  value: string;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  onToggleVisibility: () => void;
  onValueChange: (value: string) => void;
}

export default function SecretCard({
  secret,
  isSelected,
  isEditing,
  isVisible,
  value,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onToggleVisibility,
  onValueChange
}: SecretCardProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update localValue when the value prop changes (e.g., when secret value is loaded)
  useEffect(() => {
    setLocalValue(value);
  }, [value, secret.name]);

  const handleSave = () => {
    onSave(localValue);
  };

  const handleCancel = () => {
    setLocalValue(value);
    onCancel();
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const isExpired = secret.expiresOn && new Date(secret.expiresOn) < new Date();

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
      isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
    } ${!secret.enabled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 break-words" title={secret.name}>
                {secret.name}
              </h3>
              {secret.contentType && (
                <p className="text-xs text-gray-500 mt-1">
                  Type: {secret.contentType}
                </p>
              )}
              {isExpired && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                  Expired
                </span>
              )}
              {!secret.enabled && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                  Disabled
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={onToggleVisibility}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={isVisible ? 'Hide value' : 'Show value'}
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            
            {!isEditing ? (
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit secret"
              >
                <Edit className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex space-x-1">
                <button
                  onClick={handleSave}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Save changes"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancel}
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

      {/* Value */}
      {isVisible && (
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Secret Value
          </label>
          {isEditing ? (
            <textarea
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                onValueChange(e.target.value);
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Enter secret value..."
            />
          ) : (
            <div className="bg-gray-50 rounded-md p-3">
              <code className="text-sm text-gray-800 break-all">
                {value || 'Loading...'}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {secret.tags && Object.keys(secret.tags).length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center mb-2">
            <Tag className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-xs font-medium text-gray-700">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(secret.tags).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 text-xs text-gray-500 space-y-1">
        {secret.createdOn && (
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>Created: {formatDate(secret.createdOn)}</span>
          </div>
        )}
        {secret.updatedOn && (
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>Updated: {formatDate(secret.updatedOn)}</span>
          </div>
        )}
        {secret.expiresOn && (
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span className={isExpired ? 'text-red-600 font-medium' : ''}>
              Expires: {formatDate(secret.expiresOn)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
