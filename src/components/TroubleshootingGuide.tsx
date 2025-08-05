import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Info, Users, Key } from 'lucide-react';
import { getAzureConfig } from '../config/azure';

interface TroubleshootingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TroubleshootingGuide({ isOpen, onClose }: TroubleshootingGuideProps) {
  if (!isOpen) return null;

  const { constants } = getAzureConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
              Key Vault Permission Troubleshooting
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Why am I getting permission errors?</h3>
                <p className="text-blue-700 text-sm">
                  Azure Key Vault requires specific permissions for applications to access secrets on your behalf. 
                  Even though you can access the Key Vault in the Azure Portal, this web application needs 
                  separate permissions to access it using your credentials.
                </p>
              </div>
            </div>
          </div>

          {/* Required Permissions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="h-5 w-5 text-green-600 mr-2" />
              Required Permissions
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">RBAC Roles (Recommended)</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Key Vault Secrets User:</strong> Read secrets</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Key Vault Secrets Officer:</strong> Manage secrets</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Key Vault Contributor:</strong> Full access</span>
                  </li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Access Policies (Legacy)</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Get, List:</strong> Read secrets</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Set, Delete:</strong> Manage secrets</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>All permissions:</strong> Full access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step-by-step Solutions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              Step-by-Step Solutions
            </h3>
            
            <div className="space-y-6">
              {/* Solution 1: RBAC */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Option 1: Assign RBAC Role (Recommended)</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Go to the Azure Portal</li>
                  <li>Navigate to your Key Vault</li>
                  <li>Click "Access control (IAM)" in the left menu</li>
                  <li>Click "Add" → "Add role assignment"</li>
                  <li>Select "Key Vault Secrets User" or "Key Vault Secrets Officer"</li>
                  <li>Search for and select your user account</li>
                  <li>Click "Review + assign"</li>
                  <li>Wait 5-10 minutes for permissions to propagate</li>
                </ol>
                <button
                  onClick={() => window.open('https://portal.azure.com', '_blank')}
                  className="mt-3 inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Azure Portal
                </button>
              </div>

              {/* Solution 2: Access Policy */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Option 2: Configure Access Policy</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Go to the Azure Portal</li>
                  <li>Navigate to your Key Vault</li>
                  <li>Click "Access policies" in the left menu</li>
                  <li>Click "Add Access Policy"</li>
                  <li>Select "Secret Management" from template</li>
                  <li>Click "Select principal" and search for your user account</li>
                  <li>Click "Add" then "Save"</li>
                  <li>Wait 5-10 minutes for permissions to propagate</li>
                </ol>
              </div>

              {/* Solution 3: App Registration */}
              <div className="border rounded-lg p-4 bg-orange-50">
                <h4 className="font-medium text-gray-800 mb-3">Option 3: Enterprise Admin Action Required</h4>
                <div className="bg-orange-100 border border-orange-200 rounded p-3 mb-3">
                  <p className="text-orange-800 text-sm">
                    <strong>Note:</strong> This option requires Global Administrator or Application Administrator privileges.
                  </p>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Go to Azure Active Directory → App registrations</li>
                  <li>Search for "Azure CLI" (Application ID: {constants.azureCliClientId})</li>
                  <li>Click on the application</li>
                  <li>Go to "API permissions"</li>
                  <li>Verify "Azure Key Vault" permissions are listed</li>
                  <li>Click "Grant admin consent" if permissions need consent</li>
                  <li>Contact your IT administrator if you don't have these permissions</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Common Issues */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Issues</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-yellow-400 pl-4">
                <h4 className="font-medium text-gray-800">Permissions not working after assignment</h4>
                <p className="text-sm text-gray-600">
                  Azure permissions can take 5-15 minutes to propagate. Try signing out and signing back in, 
                  or wait a few minutes before testing again.
                </p>
              </div>
              <div className="border-l-4 border-yellow-400 pl-4">
                <h4 className="font-medium text-gray-800">Key Vault not found</h4>
                <p className="text-sm text-gray-600">
                  Ensure the Key Vault exists in a subscription you have access to, and check that 
                  network access rules aren't blocking your connection.
                </p>
              </div>
              <div className="border-l-4 border-yellow-400 pl-4">
                <h4 className="font-medium text-gray-800">Corporate network restrictions</h4>
                <p className="text-sm text-gray-600">
                  Some corporate networks block access to Azure Key Vault. Contact your network 
                  administrator if you can access the Azure Portal but not Key Vault directly.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you're still having issues after trying these solutions:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Contact your Azure administrator</li>
              <li>• Submit an Azure support ticket</li>
              <li>• Check Azure Service Health for any ongoing issues</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
