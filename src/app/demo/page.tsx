'use client';

import { useState } from 'react';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';

export default function DemoPage() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Azure Key Vault Advanced Editor - Demo
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              Demo Environment
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <Key className="h-6 w-6 text-blue-600 mr-3 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-blue-900 mb-2">
                  Welcome to Azure Key Vault Advanced Editor
                </h2>
                <p className="text-blue-800 mb-4">
                  This application provides advanced management capabilities for Azure Key Vault secrets 
                  including batch editing, adding new secrets, and secure deletion operations.
                </p>
                <button
                  onClick={() => setShowDemo(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Features Overview
                </button>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          {showDemo && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Secure Authentication */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Secure Authentication</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Managed Identity support (production)</li>
                  <li>• Service Principal authentication (development)</li>
                  <li>• No credential storage in browser</li>
                  <li>• Azure security best practices</li>
                </ul>
              </div>

              {/* Batch Operations */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Batch Operations</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Select multiple secrets</li>
                  <li>• Bulk deletion with confirmation</li>
                  <li>• Export secret metadata</li>
                  <li>• Efficient Azure SDK usage</li>
                </ul>
              </div>

              {/* Advanced Editing */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Editing</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• In-place secret editing</li>
                  <li>• Content type management</li>
                  <li>• Tag support</li>
                  <li>• Validation and error handling</li>
                </ul>
              </div>

              {/* Modern UI */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Modern Interface</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Responsive design</li>
                  <li>• Real-time updates</li>
                  <li>• Search and filtering</li>
                  <li>• Accessibility focused</li>
                </ul>
              </div>

              {/* Security Features */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Security First</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Click-to-reveal secret values</li>
                  <li>• Input validation</li>
                  <li>• Error boundaries</li>
                  <li>• Audit trail visibility</li>
                </ul>
              </div>

              {/* Developer Experience */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Developer Experience</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• TypeScript with strict mode</li>
                  <li>• Next.js App Router</li>
                  <li>• Tailwind CSS styling</li>
                  <li>• Azure SDK integration</li>
                </ul>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup Guide</h3>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-gray-900">1. Configure Environment</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Copy `.env.example` to `.env.local` and configure your Azure Key Vault URL and authentication method.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-gray-900">2. Set Up Azure Permissions</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Ensure your identity has the required Key Vault permissions: Get, List, Set, Delete for secrets.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-gray-900">3. Start Development</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Run `npm run dev` to start the development server and navigate to the main editor.
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Important Security Notes
                </h3>
                <ul className="space-y-1 text-yellow-800 text-sm">
                  <li>• Never commit Azure credentials to version control</li>
                  <li>• Use Managed Identity in production environments</li>
                  <li>• Regularly rotate Service Principal secrets</li>
                  <li>• Monitor Key Vault access logs</li>
                  <li>• Follow the principle of least privilege</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Key className="h-5 w-5 mr-2" />
              Go to Key Vault Editor
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
