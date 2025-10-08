'use client';

import { useEffect, useState } from 'react';
import { Key, CheckCircle } from 'lucide-react';

export default function AuthCallback() {
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // Get the authorization code from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      console.error('OAuth error:', error);
      // Redirect back to home with error
      window.location.href = `/?error=${encodeURIComponent(error)}`;
      return;
    }

    if (code) {
      // Show success message before redirect
      setIsRedirecting(false);
      
      // Redirect back to home with the authorization code after a short delay
      setTimeout(() => {
        window.location.href = `/${state || ''}?code=${encodeURIComponent(code)}`;
      }, 1500);
    } else {
      // No code or error, redirect to home
      window.location.href = '/';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${isRedirecting ? 'bg-blue-100' : 'bg-green-100'}`}>
            {isRedirecting ? (
              <Key className="h-12 w-12 text-blue-600 animate-pulse" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
          </div>
        </div>
        
        {isRedirecting ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Processing Authentication...
            </h2>
            <p className="text-gray-600">
              Please wait while we complete your Azure sign-in.
            </p>
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              You have been successfully authenticated.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">
                ✓ Returning to Griphook app...
              </p>
            </div>
            <p className="text-sm text-gray-500">
              You can close this browser tab if it doesn't close automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
