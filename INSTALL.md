# 📥 How to Install Griphook Desktop App

**Griphook** is your trusted Azure Key Vault secrets guardian - a native desktop application for Windows, macOS, and Linux.

## 🚀 Quick Installation

### Step 1: Download for Your Operating System

Visit the **[Releases Page](https://github.com/YaffleZ/Griphook/releases/latest)** and download:

#### Windows Users
- **`Griphook Setup 1.0.0.exe`** - Recommended installer
- **`Griphook 1.0.0.exe`** - Portable version (no installation required)

#### macOS Users  
- **`Griphook-1.0.0.dmg`** - Disk image installer
- **`Griphook-1.0.0-mac.zip`** - Portable app bundle

#### Linux Users
- **`Griphook-1.0.0.AppImage`** - Universal portable application
- **`griphook_1.0.0_amd64.deb`** - Debian/Ubuntu package

### Step 2: Install the Application

#### Windows Installation
1. Download `Griphook Setup 1.0.0.exe`
2. Double-click to run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

#### macOS Installation
1. Download `Griphook-1.0.0.dmg`
2. Open the disk image
3. Drag Griphook to Applications folder
4. Launch from Applications or Spotlight

#### Linux Installation

**AppImage (Universal):**
1. Download `Griphook-1.0.0.AppImage`
2. Make executable: `chmod +x Griphook-1.0.0.AppImage`
3. Run: `./Griphook-1.0.0.AppImage`

**Debian/Ubuntu:**
1. Download `griphook_1.0.0_amd64.deb`
2. Install: `sudo dpkg -i griphook_1.0.0_amd64.deb`
3. Run: `griphook` or find in applications menu

### Step 3: First Launch

1. **Launch Griphook** from your applications
2. **Sign in with Azure** - Use your existing Azure account
3. **Select Key Vaults** - Choose which vaults to manage
4. **Start managing secrets** - Full batch editing, adding, and deletion capabilities

## 🔐 Authentication & Security

- **No setup required** - Uses Azure's standard authentication
- **Your permissions** - Only access Key Vaults you already have access to
- **Secure by design** - Same security as Azure CLI and Azure Portal
- **Multi-tenant support** - Works with any Azure organization

## ✨ Key Features

- 🔑 **Batch Operations** - Edit multiple secrets simultaneously
- ➕ **Add New Secrets** - Create secrets with metadata and tags
- 🗑️ **Secure Deletion** - Confirmation dialogs with dependency warnings
- 🔍 **Search & Filter** - Quick search across all secrets
- 🏛️ **Multi-Vault Support** - Manage secrets across multiple Key Vaults
- ⚡ **Performance Optimized** - Fast loading without version history overhead
- 🎨 **Modern Interface** - Clean, responsive design with dark/light themes

## 🆘 Troubleshooting

### Installation Issues

**Windows:** If you get a security warning, click "More info" → "Run anyway"

**macOS:** If you get "App can't be opened," go to System Preferences → Security & Privacy → Allow

**Linux:** Ensure you have the required dependencies installed

### Authentication Issues

1. **Check Azure permissions** - Ensure you have Key Vault access in Azure Portal
2. **Try signing out and back in** - Use the app's sign-out option
3. **Corporate networks** - May require proxy/firewall configuration

### Performance Issues

- **Close other applications** using significant memory
- **Check internet connection** for Azure API calls
- **Restart the application** if it becomes unresponsive

## 🔄 Auto-Updates

Griphook automatically checks for updates and will notify you when new versions are available. Updates include:

- 🐛 **Bug fixes** and security patches
- ✨ **New features** and improvements  
- 🎨 **UI enhancements** and usability improvements

## 📞 Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/YaffleZ/Griphook/issues)
- **Documentation:** [Complete setup guide](https://github.com/YaffleZ/Griphook#readme)
- **Source Code:** [Open source on GitHub](https://github.com/YaffleZ/Griphook)

## 🎯 System Requirements

### Minimum Requirements
- **Windows:** 10 or 11 (64-bit)
- **macOS:** 10.14 Mojave or later  
- **Linux:** Ubuntu 18.04+ or equivalent
- **Memory:** 4GB RAM
- **Storage:** 200MB free space
- **Network:** Internet connection for Azure authentication

### Recommended
- **Memory:** 8GB+ RAM for optimal performance
- **Storage:** 1GB+ free space for cached data
- **Network:** Stable broadband connection

---

**Ready to secure your Azure Key Vault secrets with Griphook?** 

[![Download Latest Release](https://img.shields.io/badge/Download-Latest%20Release-blue?style=for-the-badge&logo=download)](https://github.com/YaffleZ/Griphook/releases/latest)