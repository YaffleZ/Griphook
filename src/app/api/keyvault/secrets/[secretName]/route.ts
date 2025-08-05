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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secretName: string }> }
) {
  try {
    const { secretName } = await params;
    const { searchParams } = new URL(request.url);
    const keyVaultUrl = searchParams.get('vaultUrl');
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!keyVaultUrl || !accessToken || !secretName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    const secret = await client.getSecret(secretName);

    return NextResponse.json({
      name: secret.name,
      value: secret.value,
      contentType: secret.properties.contentType,
      enabled: secret.properties.enabled ?? true,
      createdOn: secret.properties.createdOn,
      updatedOn: secret.properties.updatedOn,
      expiresOn: secret.properties.expiresOn,
      tags: secret.properties.tags
    });
  } catch (error) {
    console.error('Failed to get secret value:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to get secret value';
    let details = 'An unexpected error occurred while retrieving the secret.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        statusCode = 403;
        details = 'Access denied. You may not have permission to read this secret. Required permissions: Key Vault Secrets User, Key Vault Secrets Officer, or Key Vault Contributor.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401;
        details = 'Authentication failed. Your access token may have expired.';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        statusCode = 404;
        details = 'Secret not found or may have been deleted.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details, statusCode },
      { status: statusCode }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ secretName: string }> }
) {
  try {
    const { secretName } = await params;
    const { searchParams } = new URL(request.url);
    const keyVaultUrl = searchParams.get('vaultUrl');
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const body = await request.json();
    const { value, contentType, tags } = body;

    if (!keyVaultUrl || !accessToken || !secretName || !value) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    const secret = await client.setSecret(secretName, value, {
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
    console.error('Failed to update secret:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to update secret';
    let details = 'An unexpected error occurred while updating the secret.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        statusCode = 403;
        details = 'Access denied. You may not have permission to update this secret. Required permissions: Key Vault Secrets Officer or Key Vault Contributor.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401;
        details = 'Authentication failed. Your access token may have expired.';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        statusCode = 404;
        details = 'Secret not found or Key Vault not accessible.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details, statusCode },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ secretName: string }> }
) {
  try {
    const { secretName } = await params;
    const { searchParams } = new URL(request.url);
    const keyVaultUrl = searchParams.get('vaultUrl');
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!keyVaultUrl || !accessToken || !secretName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    // Begin delete operation (this marks the secret for deletion)
    await client.beginDeleteSecret(secretName);

    return NextResponse.json({
      message: 'Secret deletion initiated successfully',
      secretName: secretName
    });
  } catch (error) {
    console.error('Failed to delete secret:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to delete secret';
    let details = 'An unexpected error occurred while deleting the secret.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        statusCode = 403;
        details = 'Access denied. You may not have permission to delete this secret. Required permissions: Key Vault Secrets Officer or Key Vault Contributor.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401;
        details = 'Authentication failed. Your access token may have expired.';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        statusCode = 404;
        details = 'Secret not found or already deleted.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details, statusCode },
      { status: statusCode }
    );
  }
}
