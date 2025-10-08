# Griphook - Azure Key Vault Advanced Secrets Editor

A modern, secure application for managing Azure Key Vault secrets with advanced features including batch editing, adding new secrets, and deletion capabilities. Available as both a web application and native desktop app.

*Named after the goblin vault keeper at Gringotts - your trusted guardian for Azure Key Vault secrets.*

![Griphook](https://img.shields.io/badge/Griphook-Azure%20Key%20Vault-gold)
![Next.js](https://img.shields.io/badge/Next.js-15+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3+-blue)
![Electron](https://img.shields.io/badge/Electron-Desktop%20App-blue)

## 📥 Download Desktop App

**🖥️ Native Desktop Application Available!**

Download the latest release for your operating system:

[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/YaffleZ/Griphook/releases/latest)
[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/YaffleZ/Griphook/releases/latest)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-orange?style=for-the-badge&logo=linux)](https://github.com/YaffleZ/Griphook/releases/latest)

### 🎯 For End Users: Simple Installation
1. **[Download the installer](https://github.com/YaffleZ/Griphook/releases/latest)** for your operating system
2. **Run the installer** (Windows: `.exe`, macOS: `.dmg`, Linux: `.AppImage` or `.deb`)
3. **Launch Griphook** and sign in with your Azure account
4. **Start managing** your Azure Key Vault secrets!

📖 **Need help?** See the **[Installation Guide](INSTALL.md)** for detailed instructions.

### 🔧 For Developers: Build from Source

## ✨ Features

### 🔐 **Secure Authentication**
- **Azure AD OAuth** authentication with user-delegated permissions
- **Individual user permissions** - users can only access Key Vaults they have access to
- **Local browser caching** for improved performance and security

### 📝 **Secret Management**
- **Batch Operations**: Select and manage multiple secrets simultaneously
- **Add New Secrets**: Create secrets with metadata, tags, and content types
- **Secure Deletion**: Confirmation dialogs with warnings about dependencies
- **In-place Editing**: Edit secret values directly in the interface

### 🔍 **Advanced Features**
- **Search & Filter**: Quick search across all secret names and Key Vaults
- **Multi-Key Vault Support**: Manage secrets across multiple Key Vaults
- **Performance Optimized**: Fast secret loading without expensive version history lookups
- **Real-time Updates**: Instant feedback for all operations
- **Audit Information**: View creation dates, update times, and expiration dates

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Tailwind CSS**: Clean, modern interface
- **Loading States**: Clear indicators for ongoing operations
- **Error Handling**: Comprehensive error messages and recovery guidance

### 🖥️ **Desktop App Benefits**
- **Native Performance**: Faster startup and better resource management
- **Offline Capabilities**: Some features work without internet (viewing cached data)
- **System Integration**: Native notifications, system tray, and OS-specific menus
- **Auto-Updates**: Seamless updates delivered automatically
- **Enhanced Security**: Runs in isolated environment with better credential protection

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Azure AD application registration with appropriate permissions
- Access to Azure Key Vaults you want to manage

### Quick Start Options

#### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Griphook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with your Azure account

#### Option 2: Docker (Recommended for Easy Setup) 🐳

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Griphook
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with your Azure account

**Alternative Docker commands:**
```bash
# Build and run manually
npm run docker:build
npm run docker:run

# Or pull from registry (when available)
docker pull yourusername/griphook:latest
docker run -d -p 3000:3000 yourusername/griphook:latest
```

📖 **For detailed Docker setup instructions, see [DOCKER.md](DOCKER.md)**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your Azure tenant ID:
   ```env
   # Azure AD Configuration (uses Azure CLI public client - no app registration needed!)
   NEXT_PUBLIC_AZURE_TENANT_ID=your-azure-tenant-id-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with your Azure account

#### Option 3: Desktop Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YaffleZ/Griphook.git
   cd Griphook
   ```

2. **Install dependencies**
   ```bash
   npm install
   # Also install Electron dependencies
   npm install --save-dev electron electron-builder concurrently wait-on cross-env
   ```

3. **Run in development mode**
   ```bash
   npm run electron-dev
   ```
   This will start the Next.js dev server and launch the Electron app.

4. **Build desktop app**
   ```bash
   # For current platform
   npm run build-electron
   
   # For specific platforms
   npm run electron-build -- --win  # Windows
   npm run electron-build -- --mac  # macOS  
   npm run electron-build -- --linux # Linux
   ```

   **Or use the build scripts:**
   ```bash
   # Windows
   .\scripts\build-desktop.ps1
   
   # macOS/Linux
   ./scripts/build-desktop.sh
   ```

## Azure Setup

### Required Permissions

Your Azure identity (Service Principal or Managed Identity) needs the following Key Vault permissions:

- **Secret permissions**: Get, List, Set, Delete
- **Optional**: Backup, Restore, Recover, Purge (for advanced operations)

## 🔧 Setup (Simplified!)

### ✅ **No Configuration Required!**
This application uses the **Azure CLI public client ID** with multi-tenant support, which means:
- ✅ No need to create a custom Azure AD app registration
- ✅ No admin consent required in most organizations  
- ✅ Works out-of-the-box with `http://localhost:3000` redirect URI
- ✅ Same security and permissions as Azure CLI
- ✅ Users authenticate with their own Azure tenant automatically

### 📋 **What You Need:**
1. **Azure Account** - Any valid Azure account with appropriate permissions
2. **Key Vault Access** - You need RBAC permissions on the Key Vaults you want to manage:
   - **Key Vault Secrets User** (for read access)
   - **Key Vault Secrets Officer** (for full secret management)

## 🏗️ Architecture

### Authentication Flow
- **User Authentication**: Azure AD OAuth with user-delegated permissions
- **Key Vault Access**: Each user's Azure AD token is used to access Key Vaults
- **Security**: Users can only access Key Vaults they have permissions to

### Technology Stack
- **Frontend**: Next.js 15+ with App Router, React, TypeScript
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

- **User-Level Access Control**: Each user can only access Key Vaults they have permissions to
- **No Server-Side Secret Storage**: Secret values are never cached server-side
- **Browser-Only Caching**: Secure caching in user's browser only
- **Audit Trails**: All operations are logged under the user's identity
- **Input Validation**: Comprehensive validation for all user inputs

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
