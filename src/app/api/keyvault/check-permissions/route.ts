import { NextRequest, NextResponse } from 'next/server';

/**
 * Check Key Vault permissions and provide guidance for resolving access issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyVaultUrl, accessToken } = body;

    if (!keyVaultUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing Key Vault URL or access token' },
        { status: 400 }
      );
    }

    console.log('Checking Key Vault permissions for:', keyVaultUrl);
    
    // Decode the access token to understand what we have
    let tokenInfo = null;
    try {
      const tokenParts = accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      tokenInfo = {
        upn: payload.upn || payload.unique_name,
        name: payload.name,
        oid: payload.oid, // Object ID
        tid: payload.tid, // Tenant ID
        aud: payload.aud, // Audience
        scope: payload.scp || payload.scope || payload.roles,
        appid: payload.appid || payload.azp, // Application ID
        iss: payload.iss // Issuer
      };
      console.log('Token info:', tokenInfo);
    } catch (err) {
      console.warn('Could not decode token:', err);
    }

    // Try a simple Key Vault operation to check permissions
    try {
      const testResponse = await fetch(`${keyVaultUrl}secrets?api-version=7.4`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        return NextResponse.json({
          hasAccess: true,
          message: 'Key Vault access confirmed',
          tokenInfo
        });
      } else {
        const errorText = await testResponse.text();
        console.log('Key Vault access test failed:', testResponse.status, errorText);
        
        return NextResponse.json({
          hasAccess: false,
          status: testResponse.status,
          error: errorText,
          tokenInfo,
          guidance: generatePermissionGuidance(testResponse.status, tokenInfo, keyVaultUrl)
        });
      }
    } catch (networkError) {
      console.error('Network error testing Key Vault access:', networkError);
      return NextResponse.json({
        hasAccess: false,
        error: 'Network error accessing Key Vault',
        tokenInfo,
        guidance: generateNetworkErrorGuidance(keyVaultUrl)
      });
    }

  } catch (error) {
    console.error('Error checking Key Vault permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate specific guidance based on the error status and token information
 */
function generatePermissionGuidance(status: number, tokenInfo: any, keyVaultUrl: string) {
  const keyVaultName = keyVaultUrl.split('//')[1]?.split('.')[0] || 'unknown';
  
  const baseGuidance = {
    keyVaultName,
    userInfo: {
      name: tokenInfo?.name || 'Unknown',
      upn: tokenInfo?.upn || 'Unknown',
      objectId: tokenInfo?.oid || 'Unknown'
    }
  };

  switch (status) {
    case 401:
      return {
        ...baseGuidance,
        issue: 'Authentication Failed',
        description: 'The access token is not valid for Key Vault operations.',
        causes: [
          'Token does not include Key Vault scope',
          'Token has expired',
          'Application not registered for Key Vault access'
        ],
        solutions: [
          {
            title: 'Re-authenticate with Key Vault scope',
            description: 'Sign out and sign in again to get a token with Key Vault permissions',
            action: 'Sign out and try again'
          },
          {
            title: 'Check Azure CLI registration',
            description: 'Ensure Azure CLI application is registered in your tenant',
            action: 'Contact your Azure administrator'
          }
        ]
      };

    case 403:
      return {
        ...baseGuidance,
        issue: 'Permission Denied',
        description: 'Your account is authenticated but lacks Key Vault permissions.',
        causes: [
          'Missing Key Vault RBAC roles',
          'No access policy configured',
          'Application lacks delegated permissions'
        ],
        solutions: [
          {
            title: 'Assign Key Vault RBAC roles',
            description: 'You need Key Vault Secrets User or Key Vault Secrets Officer role',
            action: 'Request permissions from your Azure administrator',
            azurePortalUrl: `https://portal.azure.com/#view/Microsoft_Azure_KeyVault/KeyVaultMenuBlade/~/access-policies/resource%2F${encodeURIComponent(keyVaultUrl.replace('https://', '').replace('/', ''))}`
          },
          {
            title: 'Configure Access Policy',
            description: 'Add your user account to Key Vault access policies',
            action: 'Use Azure Portal to configure access policies'
          },
          {
            title: 'Grant application permissions',
            description: 'Azure CLI application needs delegated permissions for Key Vault',
            action: 'Enterprise admin must grant admin consent'
          }
        ]
      };

    case 404:
      return {
        ...baseGuidance,
        issue: 'Key Vault Not Found',
        description: 'The Key Vault does not exist or is not accessible.',
        causes: [
          'Key Vault name is incorrect',
          'Key Vault is in a different subscription',
          'Network access restrictions'
        ],
        solutions: [
          {
            title: 'Verify Key Vault name',
            description: 'Check that the Key Vault name and URL are correct',
            action: 'Verify in Azure Portal'
          },
          {
            title: 'Check network access',
            description: 'Key Vault may have firewall rules restricting access',
            action: 'Review Key Vault networking settings'
          }
        ]
      };

    default:
      return {
        ...baseGuidance,
        issue: `HTTP ${status} Error`,
        description: 'An unexpected error occurred accessing the Key Vault.',
        solutions: [
          {
            title: 'Try again later',
            description: 'This might be a temporary service issue',
            action: 'Wait a few minutes and retry'
          },
          {
            title: 'Contact support',
            description: 'If the issue persists, contact Azure support',
            action: 'Submit a support ticket'
          }
        ]
      };
  }
}

/**
 * Generate guidance for network-related errors
 */
function generateNetworkErrorGuidance(keyVaultUrl: string) {
  return {
    issue: 'Network Error',
    description: 'Unable to connect to the Key Vault.',
    causes: [
      'Internet connectivity issues',
      'Corporate firewall blocking access',
      'Key Vault network restrictions'
    ],
    solutions: [
      {
        title: 'Check internet connection',
        description: 'Verify you can access other Azure services',
        action: 'Test connectivity to portal.azure.com'
      },
      {
        title: 'Check firewall settings',
        description: 'Corporate networks may block Key Vault access',
        action: 'Contact your network administrator'
      },
      {
        title: 'Review Key Vault networking',
        description: 'Key Vault may be configured for private endpoint access only',
        action: 'Check Key Vault networking configuration in Azure Portal'
      }
    ]
  };
}
