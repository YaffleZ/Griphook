# Griphook — Technical Documentation

## Overview

Griphook is a Next.js 15 web application that provides a browser-based GUI for managing Azure Key Vault secrets. It is distributed as a Docker image and requires no server-side Azure credentials — all authentication happens in the user's browser via OAuth 2.0 PKCE.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 with App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Azure SDK | `@azure/keyvault-secrets`, `@azure/arm-keyvault`, `@azure/arm-subscriptions`, `@azure/core-auth` |
| Icons | Lucide React |
| Containerisation | Docker (multi-stage Alpine build) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main page — sign-in, vault picker, auth callback
│   ├── layout.tsx                  # Root layout
│   ├── globals.css
│   ├── auth/callback/page.tsx      # OAuth redirect landing — forwards code to page.tsx
│   ├── demo/page.tsx               # Demo/overview page
│   └── api/
│       ├── auth/
│       │   ├── pkce/route.ts       # GET — generate PKCE verifier + challenge (server-side)
│       │   └── exchange/route.ts   # POST — token exchange + ARM vault discovery
│       ├── keyvault/
│       │   ├── secrets/route.ts    # GET list, POST create, DELETE secret
│       │   ├── secrets/[secretName]/route.ts  # GET value, PUT update
│       │   ├── secrets/batch/route.ts          # POST — batch load values in parallel
│       │   └── check-permissions/route.ts      # GET — RBAC check for current identity
│       ├── debug/identity/route.ts # GET — decode token claims (dev)
│       └── health/route.ts         # GET — liveness probe
├── components/
│   ├── KeyVaultEditor.tsx          # Main vault UI — table/card view, toolbar, modals
│   ├── AddSecretModal.tsx
│   ├── BatchEditModal.tsx
│   ├── DeleteConfirmModal.tsx
│   ├── ConnectionModal.tsx
│   ├── SecretCard.tsx
│   ├── TroubleshootingGuide.tsx
│   └── Portal.tsx
├── config/
│   └── azure.ts                    # Azure config — client ID, tenant, redirect URI, scope
├── utils/
│   └── secureStorage.ts            # AES-256-GCM encrypted localStorage wrapper
```

---

## Authentication Flow

### Overview

Griphook uses **OAuth 2.0 PKCE** with the **Azure CLI public client** (`1950a258-227b-4e31-a9cf-717495945fc2`). This client ID is pre-registered by Microsoft and allows any Azure user to sign in without an app registration.

### Step-by-step

1. **PKCE generation** — browser calls `GET /api/auth/pkce`. The server generates a random 48-byte verifier, hashes it with SHA-256, and returns `{ verifier, challenge }`. Node.js `crypto` is used (not `window.crypto.subtle`) so it works over plain HTTP.
2. **Verifier storage** — verifier is stored in `localStorage` (survives full-page navigation).
3. **Auth redirect** — browser is redirected to `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` with the challenge, scopes, and `redirect_uri=http://localhost:3000`.
4. **Callback** — Microsoft redirects back to `http://localhost:3000?code=...`. The auth callback handler in `page.tsx` picks up the code.
5. **Token exchange** — `POST /api/auth/exchange` sends the code + verifier to Microsoft's token endpoint. Returns an access token plus discovers subscriptions and Key Vaults via ARM.
6. **Encrypted storage** — tokens and vault metadata are stored encrypted via `AzureSecureStorage` (AES-256-GCM, key derived from device fingerprint via PBKDF2).
7. **Key Vault requests** — all Key Vault API calls pass the access token as `Authorization: Bearer <token>` to the Next.js API routes, which forward it to the Azure SDK.

### Scopes requested

```
https://management.azure.com/user_impersonation
https://vault.azure.net/user_impersonation
offline_access openid profile
```

---

## API Routes

### `GET /api/auth/pkce`
Generates a PKCE pair server-side using Node.js `crypto`.

**Response:**
```json
{ "verifier": "<base64url>", "challenge": "<base64url-sha256>" }
```

### `POST /api/auth/exchange`
Exchanges an OAuth code for tokens and discovers Key Vaults.

**Body:**
```json
{
  "code": "<auth code>",
  "clientId": "<client id>",
  "redirectUri": "<redirect uri>",
  "tenantId": "<tenant or 'common'>",
  "code_verifier": "<pkce verifier>"
}
```

**Response:**
```json
{
  "token": { "access_token": "...", "refresh_token": "..." },
  "subscriptions": [...],
  "keyVaults": [...],
  "discoveryError": null
}
```

### `GET /api/keyvault/secrets?vaultUrl=<url>`
Lists secret metadata (name, enabled, dates, tags) — no values loaded.

### `GET /api/keyvault/secrets/[secretName]?vaultUrl=<url>`
Returns a single secret's current value.

### `PUT /api/keyvault/secrets/[secretName]?vaultUrl=<url>`
Updates a secret's value.

### `POST /api/keyvault/secrets?vaultUrl=<url>`
Creates a new secret.

### `DELETE /api/keyvault/secrets?vaultUrl=<url>&secretName=<name>`
Deletes a secret.

### `POST /api/keyvault/secrets/batch`
Batch-loads multiple secret values in parallel (batches of 10).

**Body:**
```json
{ "keyVaultUrl": "...", "secretNames": ["secret1", "secret2"] }
```

---

## Key Vault Editor — UI State

`KeyVaultEditor.tsx` manages:

| State | Purpose |
|-------|---------|
| `secrets` | Secret metadata list (no values) |
| `secretValues` | Map of name → loaded value |
| `visibleSecrets` | Set of names currently shown in clear text |
| `editingSecrets` | Set of names currently being edited |
| `selectedSecrets` | Set of names checked for batch operations |
| `searchTerm` | Filters `filteredSecrets` by name and loaded value |
| `viewMode` | `'table'` or `'cards'` |

### Secret loading strategy

- **Metadata** — loaded on mount via `GET /api/keyvault/secrets` (fast, no values)
- **Individual values** — loaded on-demand when a user clicks the eye icon
- **All values** — "Show All Values" button calls `batchLoadSecretValues` then adds all names to `visibleSecrets`
- **Batch edit** — loads all unloaded values before opening the modal

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | No | `1950a258-227b-4e31-a9cf-717495945fc2` | Azure CLI public client |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | No | `common` | Azure tenant |
| `APP_NAME` | No | `Griphook` | Display name |
| `NODE_EXTRA_CA_CERTS` | No | — | Custom CA bundle path |
| `NODE_OPTIONS` | No | `--use-system-ca` (dev) | Applied by npm scripts via cross-env |

---

## Corporate TLS

The npm dev/start scripts set `NODE_OPTIONS=--use-system-ca` via `cross-env` so the Node.js process trusts the OS certificate store, allowing Azure API calls through corporate TLS inspection proxies.

In Docker, `NODE_EXTRA_CA_CERTS` can be set to trust a mounted PEM file. The Dockerfile also installs `ca-certificates` and copies `./certs/corporate-ca.pem` if present.

---

## Security Notes

- Secret values are **never stored server-side** — the Next.js API routes act as a thin authenticated proxy
- All tokens are stored **encrypted in the browser** (AES-256-GCM) — see [ENCRYPTION.md](ENCRYPTION.md)
- PKCE verifier is generated server-side to avoid `window.crypto.subtle` being unavailable over plain HTTP
- The app runs as a non-root user inside Docker
- Input validation is applied to all API endpoints (vault URL format, secret name pattern)

---

## Azure Permissions Required

| Role | Grants |
|------|--------|
| Key Vault Secrets User | `get`, `list` |
| Key Vault Secrets Officer | `get`, `list`, `set`, `delete` |

Additionally, the user's account needs **Reader** access on subscriptions for vault discovery via ARM.
