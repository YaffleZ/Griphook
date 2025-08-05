import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    // Decode the access token to get user information
    try {
      const tokenParts = accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      const userInfo = {
        // User Identity
        objectId: payload.oid,
        userPrincipalName: payload.upn || payload.unique_name,
        name: payload.name,
        givenName: payload.given_name,
        familyName: payload.family_name,
        
        // Token Details
        audience: payload.aud,
        issuer: payload.iss,
        tenantId: payload.tid,
        appId: payload.appid,
        
        // Permissions & Scope
        scope: payload.scp || payload.scope,
        roles: payload.roles || [],
        
        // Token Timing
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        notBefore: new Date(payload.nbf * 1000).toISOString(),
        
        // Application
        appDisplayName: payload.app_displayname,
        clientId: payload.appid
      };

      console.log('Current user identity:', userInfo);

      return NextResponse.json({
        identity: userInfo,
        message: 'This is the identity being used to access Azure resources'
      });
    } catch (err) {
      console.error('Could not decode token:', err);
      return NextResponse.json(
        { error: 'Invalid access token format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to get identity info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get identity info' },
      { status: 500 }
    );
  }
}
