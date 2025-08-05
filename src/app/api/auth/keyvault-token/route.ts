import { NextRequest, NextResponse } from 'next/server';

/**
 * Exchange management token for Key Vault data plane token
 * This is needed because Azure doesn't always support multiple resource scopes in a single token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken, clientId, managementToken } = body;

    // If we have a refresh token, try to get a new Key Vault token
    if (refreshToken && clientId) {
      console.log('Requesting Key Vault specific token using refresh token...');

      try {
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'https://vault.azure.net/user_impersonation',
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          console.log('Key Vault token received successfully');
          console.log('Key Vault token scope:', tokenData.scope);

          return NextResponse.json({
            access_token: tokenData.access_token,
            scope: tokenData.scope,
            expires_in: tokenData.expires_in,
            source: 'refresh_token'
          });
        } else {
          const errorText = await tokenResponse.text();
          console.warn('Key Vault token exchange failed:', errorText);
        }
      } catch (refreshError) {
        console.warn('Error using refresh token:', refreshError);
      }
    }
    
    // Fallback: use the management token for Key Vault operations
    console.log('Falling back to management token for Key Vault access');
    
    // Decode the token to check its scope
    let tokenScope = 'unknown';
    if (managementToken) {
      try {
        const tokenParts = managementToken.split('.');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        tokenScope = payload.scp || payload.scope || 'unknown';
        console.log('Management token scope:', tokenScope);
      } catch (err) {
        console.warn('Could not decode management token:', err);
      }
    }
    
    return NextResponse.json({ 
      access_token: managementToken,
      scope: tokenScope,
      source: 'management_token',
      note: 'Using management token for Key Vault operations. Ensure user has Key Vault Data Reader/Contributor permissions.'
    });

  } catch (error) {
    console.error('Failed to get Key Vault token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get Key Vault token' },
      { status: 500 }
    );
  }
}
