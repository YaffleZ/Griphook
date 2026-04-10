import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function GET() {
  try {
    // Generate a cryptographically secure code verifier (43-128 chars, URL-safe)
    const verifier = base64UrlEncode(randomBytes(48)); // 48 bytes → 64 base64url chars

    // Derive S256 code challenge: BASE64URL(SHA256(verifier))
    const challenge = base64UrlEncode(
      createHash('sha256').update(verifier).digest()
    );

    return NextResponse.json({ verifier, challenge });
  } catch (err) {
    console.error('PKCE generation failed:', err);
    return NextResponse.json(
      { error: 'PKCE generation failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
