import { NextRequest, NextResponse } from 'next/server';
import { KeyVaultManagementClient } from '@azure/arm-keyvault';
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

// Helper function to extract resource group from ID
function extractResourceGroup(id: string): string {
  if (!id) return '';
  const parts = id.split('/resourceGroups/');
  if (parts.length < 2) return '';
  return parts[1].split('/')[0] || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, subscriptionIds } = body;

    if (!accessToken || !subscriptionIds || !Array.isArray(subscriptionIds)) {
      return NextResponse.json(
        { error: 'Missing required parameters: accessToken and subscriptionIds array' },
        { status: 400 }
      );
    }

    console.log(`Loading Key Vaults for ${subscriptionIds.length} subscriptions...`);
    
    const credential = new UserTokenCredential(accessToken);
    
    // Process all subscriptions in parallel for better performance
    const subscriptionPromises = subscriptionIds.map(async (subId) => {
      try {
        console.log(`Fetching Key Vaults from subscription: ${subId}`);
        const kvClient = new KeyVaultManagementClient(credential as any, subId);
        const vaultsIter = kvClient.vaults.listBySubscription();
        
        const vaults: Array<{ id: string; name: string; resourceGroup: string; subscription: string; location: string; url: string }> = [];
        
        // Collect all vaults for this subscription
        for await (const v of vaultsIter) {
          const rg = extractResourceGroup(v.id || '');
          vaults.push({
            id: v.id || `${subId}/unknown/${v.name}`,
            name: v.name || 'unknown',
            resourceGroup: rg,
            subscription: subId,
            location: v.location || '',
            url: v.properties?.vaultUri || ''
          });
        }
        
        console.log(`Found ${vaults.length} Key Vaults in subscription ${subId}`);
        return vaults;
      } catch (error) {
        console.error(`Failed to load Key Vaults from subscription ${subId}:`, error);
        return []; // Return empty array for failed subscription
      }
    });
    
    // Wait for all subscriptions to be processed
    const results = await Promise.allSettled(subscriptionPromises);
    
    // Flatten the results into a single array, handling both fulfilled and rejected promises
    const keyVaults = results
      .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
      .map(result => result.value)
      .flat();
    
    console.log(`Found ${keyVaults.length} Key Vaults across ${subscriptionIds.length} selected subscriptions`);
    return NextResponse.json({ keyVaults });

  } catch (error) {
    console.error('Error loading Key Vaults:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load Key Vaults', details: errorMessage },
      { status: 500 }
    );
  }
}