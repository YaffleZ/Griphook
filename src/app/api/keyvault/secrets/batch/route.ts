import { NextRequest, NextResponse } from 'next/server';
import { SecretClient } from '@azure/keyvault-secrets';
import { AccessToken, TokenCredential } from '@azure/core-auth';

// Custom credential class to use the user's access token for Key Vault operations
class KeyVaultTokenCredential implements TokenCredential {
  constructor(private accessToken: string) {}

  async getToken(scopes: string | string[]): Promise<AccessToken | null> {
    return {
      token: this.accessToken,
      expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyVaultUrl, secretNames } = body;
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!keyVaultUrl || !accessToken || !secretNames || !Array.isArray(secretNames)) {
      return NextResponse.json(
        { error: 'Missing required parameters: keyVaultUrl, secretNames array' },
        { status: 400 }
      );
    }

    if (secretNames.length === 0) {
      return NextResponse.json({ secretValues: {} });
    }

    if (secretNames.length > 50) {
      return NextResponse.json(
        { error: 'Too many secrets requested. Maximum 50 secrets per batch.' },
        { status: 400 }
      );
    }

    const credential = new KeyVaultTokenCredential(accessToken);
    const client = new SecretClient(keyVaultUrl, credential);

    const secretValues: { [key: string]: string } = {};
    const errors: { [key: string]: string } = {};
    const startTime = Date.now();

    // Load secrets in parallel for better performance
    const loadPromises = secretNames.map(async (secretName: string) => {
      try {
        const secret = await client.getSecret(secretName);
        secretValues[secretName] = secret.value || '';
      } catch (error) {
        console.error(`Failed to load secret ${secretName}:`, error);
        errors[secretName] = error instanceof Error ? error.message : 'Failed to load secret';
      }
    });

    // Wait for all parallel operations to complete
    await Promise.allSettled(loadPromises);

    const loadTime = Date.now() - startTime;
    console.log(`Batch loaded ${Object.keys(secretValues).length}/${secretNames.length} secrets in ${loadTime}ms`);

    return NextResponse.json({
      secretValues,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      metadata: {
        requested: secretNames.length,
        successful: Object.keys(secretValues).length,
        failed: Object.keys(errors).length,
        loadTimeMs: loadTime
      }
    });

  } catch (error) {
    console.error('Failed to batch load secrets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to batch load secrets' },
      { status: 500 }
    );
  }
}
