# Griphook — Azure Key Vault Secrets Editor

A modern, secure web application for managing Azure Key Vault secrets. Run it locally with Docker — no Azure app registration or server configuration required.

*Named after the goblin vault keeper at Gringotts — your trusted guardian for Azure Key Vault secrets.*

![Griphook](https://img.shields.io/badge/Griphook-Azure%20Key%20Vault-gold)
![Next.js](https://img.shields.io/badge/Next.js-15+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3+-blue)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)

## � Quick Start

Pull the pre-built image and run — no configuration needed:

```bash
docker run -d --name griphook -p 3000:3000 ghcr.io/yafflez/griphook:latest
```

Then open **http://localhost:3000** and sign in with your Azure account.

> **Corporate/VPN networks with TLS inspection?** See the [Docker guide](DOCKER.md#corporate-networks) for mounting your CA certificate.

---

## ✨ Features

### 🔐 Authentication
- OAuth 2.0 PKCE flow via the Azure CLI public client — **no app registration required**
- Works with any Azure tenant (personal, work, school)
- Users can only access Key Vaults they already have RBAC permissions on

### 📝 Secret Management
- **Show / Hide All Values** — batch-reveal or hide all secrets at once
- **Batch Edit** — edit multiple secrets in a single modal
- **Add New Secrets** — with optional content type and tags
- **In-place Editing** — edit values directly in the table or card view
- **Secure Deletion** — confirmation dialog before any delete

### 🔍 Search & Browse
- **Search by name or value** — searches loaded secret values too
- **Table and Card views** — toggle between layouts
- **Subscription selection** — pick which subscriptions to load Key Vaults from (sorted alphabetically)
- **Multi-vault support** — browse across all your accessible Key Vaults

### 🛡️ Security
- **AES-256-GCM** encrypted local storage for tokens and metadata
- **PKCE** generated server-side — no dependency on `window.crypto.subtle`
- Secret values lazy-loaded on demand, never cached server-side
- All operations run under the signed-in user's identity

---

## 🐳 Docker

### Pull from registry (recommended)

```bash
docker run -d --name griphook -p 3000:3000 ghcr.io/yafflez/griphook:latest
```

### Build locally

```bash
git clone https://github.com/YaffleZ/Griphook.git
cd Griphook
docker build -t griphook:latest .
docker run -d --name griphook -p 3000:3000 griphook:latest
```

### Docker Compose

```bash
docker compose up -d
```

See **[DOCKER.md](DOCKER.md)** for production configuration, corporate TLS setup, and troubleshooting.

---

## 🔧 Development

### Prerequisites
- Node.js 20+
- An Azure account with access to at least one Key Vault

### Run locally

```bash
git clone https://github.com/YaffleZ/Griphook.git
cd Griphook
npm install
npm run dev
```

Open **http://localhost:3000**.

> The dev server starts with `NODE_OPTIONS=--use-system-ca` via `cross-env` so corporate CA certificates are trusted automatically.

### Environment variables

No variables are required. Optionally override defaults in `.env.local`:

```env
# Leave unset to use the Azure CLI public client (recommended)
# NEXT_PUBLIC_AZURE_CLIENT_ID=your-custom-client-id
# NEXT_PUBLIC_AZURE_TENANT_ID=your-specific-tenant-id

DEMO_MODE=false
APP_NAME="Griphook"
```

---

## 🔑 Azure Permissions Required

Griphook uses your signed-in identity. You need the following RBAC roles on each Key Vault you want to manage:

| Role | Access |
|------|--------|
| **Key Vault Secrets User** | List and read secrets |
| **Key Vault Secrets Officer** | Full secret management (create, update, delete) |

---

## 📖 Documentation

- [DOCKER.md](DOCKER.md) — Docker setup, corporate TLS, production deployment
- [INSTALL.md](INSTALL.md) — Step-by-step usage guide
- [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md) — Architecture and API reference
- [ENCRYPTION.md](ENCRYPTION.md) — Local encryption implementation details

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

## 📄 License

MIT — see [LICENSE](LICENSE).

- **Styling**: Tailwind CSS for responsive design
- **Azure Integration**: Azure SDK for JavaScript
- **Authentication**: Azure Active Directory OAuth 2.0

### Performance Features
- **Optimized Loading**: Secret metadata loads without expensive version history
- **Batch Operations**: Parallel processing for multiple secret operations
- **On-Demand Values**: Secret values loaded only when needed
- **Browser Caching**: Local state caching for improved performance

## 📖 Usage

1. **Sign in** with your Azure AD account
2. **Select a Key Vault** from your accessible Key Vaults
3. **Manage Secrets**:
   - View all secrets in a clean, searchable interface
   - Click to reveal secret values
   - Add new secrets with the "Add Secret" button
   - Edit existing secrets in-place
   - Delete secrets with confirmation dialogs
   - Perform batch operations on multiple secrets

## 🔒 Security Features

### 🛡️ **Data Protection**
- **AES-256-GCM Encryption**: All sensitive authentication data encrypted locally using Web Crypto API
- **Device-bound Keys**: Encryption keys derived using PBKDF2 with 100,000 iterations and tied to device fingerprint
- **Automatic Migration**: Seamless upgrade from plain text storage to encrypted storage for existing users
- **Zero Trust Architecture**: Authentication tokens, refresh tokens, and subscription data never stored in plain text

### 🔐 **Access Control**
- **User-Level Access Control**: Each user can only access Key Vaults they have permissions to
- **No Server-Side Secret Storage**: Secret values are never cached server-side
- **Browser-Only Caching**: Secure caching in user's browser only (now encrypted)
- **Audit Trails**: All operations are logged under the user's identity
- **Input Validation**: Comprehensive validation for all user inputs

### 📋 **For More Details**
See [ENCRYPTION.md](ENCRYPTION.md) for complete technical documentation of the encryption implementation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

For issues and questions:
- Check the [Issues](../../issues) page
- Review Azure Key Vault [documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- Consult Azure AD [authentication documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

## 🐳 Docker

Griphook is fully containerized for easy deployment and distribution:

- **Zero Configuration**: `docker-compose up -d` (no Azure config needed!)
- **Manual Build**: `npm run docker:build && npm run docker:run`
- **Pull from Registry**: `docker pull yourusername/griphook:latest`

Users authenticate with their own Azure tenant - no pre-configuration required.

See [DOCKER.md](DOCKER.md) for comprehensive Docker setup, deployment, and troubleshooting guide.
