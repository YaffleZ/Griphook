'use client';

import { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import Portal from './Portal';

interface AddSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, value: string, contentType?: string, tags?: { [key: string]: string }) => void;
  loading: boolean;
}

export default function AddSecretModal({ isOpen, onClose, onAdd, loading }: AddSecretModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [contentType, setContentType] = useState('');
  const [tags, setTags] = useState<{ key: string; value: string }[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setValue('');
    setContentType('');
    setTags([]);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate secret name
    if (!name.trim()) {
      newErrors.name = 'Secret name is required';
    } else if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      newErrors.name = 'Secret name can only contain letters, numbers, and hyphens';
    } else if (name.length > 127) {
      newErrors.name = 'Secret name must be 127 characters or fewer';
    }

    // Validate secret value
    if (!value.trim()) {
      newErrors.value = 'Secret value is required';
    }

    // Validate tags
    const tagErrors: string[] = [];
    const seenKeys = new Set<string>();
    
    tags.forEach((tag, index) => {
      if (!tag.key.trim()) {
        tagErrors.push(`Tag ${index + 1}: Key is required`);
      } else if (seenKeys.has(tag.key)) {
        tagErrors.push(`Tag ${index + 1}: Duplicate key "${tag.key}"`);
      } else {
        seenKeys.add(tag.key);
      }
      
      if (!tag.value.trim()) {
        tagErrors.push(`Tag ${index + 1}: Value is required`);
      }
    });

    if (tagErrors.length > 0) {
      newErrors.tags = tagErrors.join(', ');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const tagsObject = tags.reduce((acc, tag) => {
        if (tag.key.trim() && tag.value.trim()) {
          acc[tag.key.trim()] = tag.value.trim();
        }
        return acc;
      }, {} as { [key: string]: string });

      onAdd(
        name.trim(),
        value,
        contentType.trim() || undefined,
        Object.keys(tagsObject).length > 0 ? tagsObject : undefined
      );
      
      // Don't reset form here - let the parent component close the modal on success
    }
  };

  const addTag = () => {
    setTags([...tags, { key: '', value: '' }]);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, field: 'key' | 'value', newValue: string) => {
    const updatedTags = [...tags];
    updatedTags[index][field] = newValue;
    setTags(updatedTags);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        {/* Modal Container */}
        <div className="flex items-center justify-center min-h-screen px-4 py-4">
          {/* Modal */}
          <div className="relative w-full max-w-lg p-6 bg-white shadow-xl rounded-lg transform transition-all"
          >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Plus className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Add New Secret
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Secret Name */}
            <div>
              <label htmlFor="secretName" className="block text-sm font-medium text-gray-700 mb-1">
                Secret Name *
              </label>
              <input
                type="text"
                id="secretName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-secret-name"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
                maxLength={127}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Only letters, numbers, and hyphens are allowed. Maximum 127 characters.
              </p>
            </div>

            {/* Secret Value */}
            <div>
              <label htmlFor="secretValue" className="block text-sm font-medium text-gray-700 mb-1">
                Secret Value *
              </label>
              <textarea
                id="secretValue"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter your secret value..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
                  errors.value ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.value && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.value}
                </p>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
                Content Type (Optional)
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Select content type...</option>
                <option value="text/plain">Text</option>
                <option value="application/json">JSON</option>
                <option value="application/x-pem-file">PEM Certificate</option>
                <option value="application/x-pkcs12">PKCS#12</option>
                <option value="application/xml">XML</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Specify the content type to help identify the secret format.
              </p>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tags (Optional)
                </label>
                <button
                  type="button"
                  onClick={addTag}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Tag
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tags.map((tag, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={tag.key}
                        onChange={(e) => updateTag(index, 'key', e.target.value)}
                        placeholder="Key"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                      />
                      <input
                        type="text"
                        value={tag.value}
                        onChange={(e) => updateTag(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        disabled={loading}
                        className="px-2 py-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.tags && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.tags}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
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
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Secret
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Portal>
  );
}
