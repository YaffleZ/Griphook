'use client';

import { useEffect } from 'react';
import { Key } from 'lucide-react';

export default function AuthCallback() {
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
      // Redirect back to home with the authorization code
      window.location.href = `/${state || ''}?code=${encodeURIComponent(code)}`;
    } else {
      // No code or error, redirect to home
      window.location.href = '/';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Key className="h-12 w-12 text-blue-600 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Processing Authentication...
        </h2>
        <p className="text-gray-600">
          Please wait while we complete your Azure sign-in.
        </p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
