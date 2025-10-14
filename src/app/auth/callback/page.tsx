'use client';

import { useEffect, useState } from 'react';
import { Key, CheckCircle, ExternalLink } from 'lucide-react';

export default function AuthCallback() {
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    try {
      // Check if running in Electron (guard navigator access)
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      const inElectron = ua.includes('electron');
      setIsElectron(inElectron);

      // Get the authorization code from URL parameters (guard window access)
  const search = typeof window !== 'undefined' ? window.location.search : '';
      const urlParams = new URLSearchParams(search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state') || '';

      if (error) {
        console.error('OAuth error:', error);
        if (typeof window !== 'undefined') {
          window.location.href = `/?error=${encodeURIComponent(error)}`;
        }
        return;
      }

      if (code) {
        // Show success message before redirect
        setIsRedirecting(false);

        if (inElectron) {
          // In Electron, we don't need to redirect - the app will handle the code directly
          console.log('Running in Electron, authentication handled by main process');
        } else {
          // In browser, add a brief delay to avoid redirect races/loops
          if (typeof window !== 'undefined') {
            const target = `/${state}`.replace(/\/+/, '/');
            const href = `${target}?code=${encodeURIComponent(code)}`;
            const delayMs = 400; // small delay to ensure app is ready
            setTimeout(() => {
              try { window.location.href = href; } catch {}
            }, delayMs);
          }
        }
      } else {
        // No code or error, redirect to home
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch (e) {
      console.error('Auth callback processing error:', e);
      // Stop spinner and show success card so user can manually return
      setIsRedirecting(false);
    }
  }, []);

  const handleReturnToApp = () => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const urlParams = new URLSearchParams(search);
      const code = urlParams.get('code');
      const state = urlParams.get('state') || '';

      if (code) {
        const returnUrl = `http://localhost:3000/${state}`.replace(/\/+/, '/') + `?code=${encodeURIComponent(code)}`;
        if (typeof navigator !== 'undefined' && navigator.clipboard && 'writeText' in navigator.clipboard) {
          navigator.clipboard.writeText(returnUrl).catch(() => {/* ignore */});
        }
        try {
          if (typeof window !== 'undefined') {
            window.open(returnUrl, '_blank');
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error('Failed to construct return URL:', e);
    }
  };

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
              You have been successfully authenticated with Azure.
            </p>
            
            {isElectron ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">
                  Returning to the app...
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-900 font-semibold mb-3">
                    📱 Please return to the Griphook app
                  </p>
                  <ol className="text-left text-sm text-blue-800 space-y-2 mb-4">
                    <li>1. Switch back to the Griphook desktop application</li>
                    <li>2. The app should automatically detect your authentication</li>
                    <li>3. Close this browser tab</li>
                  </ol>
                  <button
                    onClick={handleReturnToApp}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab (if app doesn't respond)
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  If the app doesn't respond, click the button above to manually complete authentication.
                </p>
              </>
            )}
            
            <p className="text-sm text-gray-500 mt-4">
              You can safely close this browser tab.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
