import { NextRequest, NextResponse } from 'next/server';
import { KeyVaultManagementClient } from '@azure/arm-keyvault';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { TokenCredential } from '@azure/identity';

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

    // 2. Use the access token to discover Key Vaults
    const credential = new UserTokenCredential(tokenData.access_token);
    
    try {
      // Get all subscriptions the user has access to
      const subscriptionClient = new SubscriptionClient(credential);
      const subscriptions = [];
      
      for await (const subscription of subscriptionClient.subscriptions.list()) {
        subscriptions.push(subscription);
      }

      console.log(`Found ${subscriptions.length} subscriptions`);

      // Get Key Vaults from all subscriptions
      const allKeyVaults = [];
      
      for (const subscription of subscriptions) {
        if (subscription.subscriptionId) {
          try {
            const keyVaultClient = new KeyVaultManagementClient(credential, subscription.subscriptionId);
            
            for await (const vault of keyVaultClient.vaults.list()) {
              // Extract resource group from vault ID
              const resourceGroupMatch = vault.id?.match(/\/resourceGroups\/([^\/]+)\//);
              const resourceGroup = resourceGroupMatch ? resourceGroupMatch[1] : 'Unknown';
              
              allKeyVaults.push({
                id: vault.id,
                name: vault.name,
                resourceGroup: resourceGroup,
                subscription: subscription.displayName || subscription.subscriptionId,
                location: vault.location,
                url: `https://${vault.name}.vault.azure.net/`,
              });
            }
          } catch (subscriptionError) {
            console.warn(`Failed to get Key Vaults for subscription ${subscription.subscriptionId}:`, subscriptionError);
            // Continue with other subscriptions
          }
        }
      }

      console.log(`Found ${allKeyVaults.length} Key Vaults across all subscriptions`);

      return NextResponse.json({
        token: tokenData,
        keyVaults: allKeyVaults,
      });

    } catch (azureError) {
      console.error('Failed to query Azure resources:', azureError);
      
      // Fall back to mock data if Azure API fails
      console.log('Falling back to mock data...');
      const mockKeyVaults = [
        {
          id: '/subscriptions/mock-subscription/resourceGroups/demo-rg/providers/Microsoft.KeyVault/vaults/demo-keyvault',
          name: 'demo-keyvault',
          resourceGroup: 'demo-rg',
          subscription: 'Demo Subscription (API call failed)',
          location: 'East US',
          url: 'https://demo-keyvault.vault.azure.net/',
        },
      ];

      return NextResponse.json({
        token: tokenData,
        keyVaults: mockKeyVaults,
      });
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
