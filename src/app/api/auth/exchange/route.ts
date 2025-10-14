import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { TokenCredential } from '@azure/identity';
import { KeyVaultManagementClient } from '@azure/arm-keyvault';

// Custom credential class to use the user's access token
class UserTokenCredential implements TokenCredential {
  constructor(private accessToken: string) {}

  async getToken(): Promise<any> {
    return {
      token: this.accessToken,
      expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
    };
  }
}

export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const { code, clientId, redirectUri, code_verifier, tenantId } = body;

    console.log('Exchanging authorization code for access token...');

    // 1. Exchange authorization code for access token
    const tokenTenant = tenantId && typeof tenantId === 'string' && tenantId.length > 0 ? tenantId : 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tokenTenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'https://management.azure.com/user_impersonation offline_access',
    });
    if (code_verifier) {
      params.set('code_verifier', code_verifier);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Access token received successfully');
    
    // Log token information (without exposing the actual token)
    console.log('Token scope:', tokenData.scope);
    console.log('Token type:', tokenData.token_type);
    
    // Decode the access token to get user information (for debugging)
    try {
      const tokenParts = tokenData.access_token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('User identity:', {
        oid: payload.oid, // Object ID
        upn: payload.upn, // User Principal Name
        name: payload.name,
        aud: payload.aud, // Audience
        iss: payload.iss, // Issuer
        tid: payload.tid  // Tenant ID
      });
    } catch (err) {
      console.warn('Could not decode token for debugging:', err);
    }

    // 2. Use the access token to discover subscriptions only
    const credential = new UserTokenCredential(tokenData.access_token);

    try {
      // Get all subscriptions the user has access to
      console.log('Fetching subscriptions...');
      const subscriptionClient = new SubscriptionClient(credential);
      const subscriptions: Array<{ subscriptionId?: string; displayName?: string }> = [];
      for await (const subscription of subscriptionClient.subscriptions.list()) {
        subscriptions.push(subscription);
      }
      console.log(`Found ${subscriptions.length} subscriptions`);

      // Return token and subscriptions only - Key Vaults will be loaded separately
      return NextResponse.json({ token: tokenData, subscriptions, keyVaults: [] });

    } catch (azureError) {
      console.error('Failed to query Azure resources:', azureError);
      // Fall back to returning just the token and empty subscriptions if discovery fails
      return NextResponse.json({ token: tokenData, subscriptions: [], keyVaults: [] });
    }

  } catch (error) {
    console.error('Error in token exchange:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to exchange token', details: errorMessage },
      { status: 500 }
    );
  }
}
