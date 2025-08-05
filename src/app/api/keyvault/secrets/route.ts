import { NextRequest, NextResponse } from 'next/server';
import { SecretClient } from '@azure/keyvault-secrets';
import { AccessToken, TokenCredential } from '@azure/core-auth';

// Custom credential class to use the user's access token for Key Vault operations
class KeyVaultTokenCredential implements TokenCredential {
  constructor(private accessToken: string) {}

  async getToken(scopes: string | string[]): Promise<AccessToken | null> {
    // For Key Vault operations, we need the vault.azure.net scope
    // The token should already have the appropriate scope from the OAuth flow
    return {
      token: this.accessToken,
      expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyVaultUrl = searchParams.get('vaultUrl');
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!keyVaultUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing vault URL or access token' },
        { status: 400 }
      );
    }

    console.log('Attempting to list secrets from Key Vault:', keyVaultUrl);
    
    // Log user identity from token for debugging
    try {
      const tokenParts = accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('Using identity:', {
        upn: payload.upn || payload.unique_name,
        name: payload.name,
        oid: payload.oid,
        tid: payload.tid,
        aud: payload.aud,
        scope: payload.scp || payload.scope
      });
    } catch (err) {
      console.warn('Could not decode token:', err);
    }

    // Create credential using the user's access token
    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    const secrets = [];
    const startTime = Date.now();
    
    // List all secret properties (without values for security)
    // Optimized: Skip version history lookup for faster initial loading
    for await (const secretProperties of client.listPropertiesOfSecrets()) {
      secrets.push({
        id: secretProperties.id || '',
        name: secretProperties.name,
        contentType: secretProperties.contentType,
        enabled: secretProperties.enabled ?? true,
        createdOn: secretProperties.createdOn, // Use current version's creation date for speed
        updatedOn: secretProperties.updatedOn,
        expiresOn: secretProperties.expiresOn,
        tags: secretProperties.tags
      });
    }

    const loadTime = Date.now() - startTime;
    console.log(`Successfully listed ${secrets.length} secrets in ${loadTime}ms`);
    
    return NextResponse.json({ 
      secrets,
      metadata: {
        count: secrets.length,
        loadTimeMs: loadTime
      }
    });
  } catch (error) {
    console.error('Failed to list secrets:', error);
    
    // Provide more specific error information based on error type
    let statusCode = 500;
    let errorMessage = 'Failed to list secrets';
    let details = 'An unexpected error occurred while listing secrets.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific Azure Key Vault error patterns
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        statusCode = 403;
        details = 'Access denied. You may not have the required permissions to list secrets in this Key Vault. Required permissions: Key Vault Secrets User, Key Vault Secrets Officer, or Key Vault Contributor.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401;
        details = 'Authentication failed. Your access token may have expired or is invalid.';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        statusCode = 404;
        details = 'Key Vault not found. Please verify the Key Vault URL is correct.';
      } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('timeout')) {
        statusCode = 502;
        details = 'Network error occurred while connecting to Azure Key Vault. Please try again.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details,
        statusCode
      },
      { status: statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyVaultUrl = searchParams.get('vaultUrl');
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const body = await request.json();
    const { name, value, contentType, tags } = body;

    if (!keyVaultUrl || !accessToken || !name || !value) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    const secret = await client.setSecret(name, value, {
      contentType,
      tags
    });

    return NextResponse.json({
      id: secret.properties.id || '',
      name: secret.name,
      contentType: secret.properties.contentType,
      enabled: secret.properties.enabled ?? true,
      createdOn: secret.properties.createdOn,
      updatedOn: secret.properties.updatedOn,
      expiresOn: secret.properties.expiresOn,
      tags: secret.properties.tags
    });
  } catch (error) {
    console.error('Failed to create secret:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to create secret';
    let details = 'An unexpected error occurred while creating the secret.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        statusCode = 403;
        details = 'Access denied. You may not have permission to create secrets in this Key Vault. Required permissions: Key Vault Secrets Officer or Key Vault Contributor.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401;
        details = 'Authentication failed. Your access token may have expired.';
      } else if (error.message.includes('409') || error.message.includes('Conflict')) {
        statusCode = 409;
        details = 'A secret with this name already exists. Choose a different name or update the existing secret.';
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        statusCode = 400;
        details = 'Invalid secret name or value. Please check the secret name contains only letters, numbers, and hyphens.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details, statusCode },
      { status: statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyVaultUrl = searchParams.get('vaultUrl');
    const secretName = searchParams.get('secretName');
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!keyVaultUrl || !accessToken || !secretName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    await client.beginDeleteSecret(secretName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete secret:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete secret' },
      { status: 500 }
    );
  }
}
