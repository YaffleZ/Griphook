# Griphook Desktop App Development Guide

This guide covers building, developing, and distributing the Griphook desktop application using Electron.

## 🖥️ Overview

Griphook desktop app wraps the Next.js web application in Electron to provide:
- Native Windows, macOS, and Linux applications
- Better system integration and performance
- Offline capabilities for cached data
- Auto-update functionality
- Enhanced security with isolated environment

## 📋 Prerequisites

### Development Requirements
- Node.js 18+ and npm
- Git
- Platform-specific build tools:
  - **Windows**: Visual Studio Build Tools or Visual Studio Community
  - **macOS**: Xcode Command Line Tools
  - **Linux**: Build essentials (`build-essential` on Ubuntu)

### For Distribution
- GitHub account (for automated releases)
- Optional: Code signing certificates for Windows/macOS

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Install main dependencies
npm install

# Install Electron dependencies
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

### 2. Development Mode
```bash
# Start Next.js dev server + Electron app
npm run electron-dev
```

This command:
1. Starts Next.js development server on http://localhost:3000
2. Waits for the server to be ready
3. Launches Electron app pointing to the dev server
4. Enables hot reload for both Next.js and Electron code

### 3. Build for Production
```bash
# Build Next.js for static export
BUILD_TARGET=electron npm run build
npm run export

# Build Electron app for current platform
npm run electron-build

# Or use platform-specific commands
npm run electron-build -- --win     # Windows
npm run electron-build -- --mac     # macOS
npm run electron-build -- --linux   # Linux
```

## 🏗️ Build Scripts

### Automated Build Scripts

#### Windows (PowerShell)
```powershell
.\scripts\build-desktop.ps1
```

#### macOS/Linux (Bash)
```bash
./scripts/build-desktop.sh
```

These scripts:
1. Set `BUILD_TARGET=electron` environment variable
2. Clean previous builds
3. Install dependencies if needed
4. Build and export Next.js app
5. Build Electron app with electron-builder
6. Output installers in `dist/` folder

## 📦 Distribution

### Manual Distribution

After building, you'll find installers in the `dist/` folder:

- **Windows**: 
  - `Griphook Setup 1.0.0.exe` (NSIS installer)
  - `Griphook 1.0.0.exe` (portable executable)
- **macOS**:
  - `Griphook-1.0.0.dmg` (disk image)
  - `Griphook-1.0.0-mac.zip` (portable app)
- **Linux**:
  - `Griphook-1.0.0.AppImage` (portable application)
  - `griphook_1.0.0_amd64.deb` (Debian package)

### Automated Releases with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/build-desktop.yml`) that:

1. **Triggers on**:
   - Git tags starting with `v` (e.g., `v1.0.0`)
   - Manual workflow dispatch

2. **Builds for**:
   - Windows (latest)
   - macOS (latest) 
   - Linux (Ubuntu latest)

3. **Creates**:
   - Build artifacts for each platform
   - GitHub release with all installers
   - Release notes with download links

#### To Create a Release:
```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# 1. Build apps for all platforms
# 2. Create a GitHub release
# 3. Upload installers as release assets
```

## 🔧 Configuration

### Electron Builder Configuration

The build configuration is in `package.json` under the `build` key:

```json
{
  "build": {
    "appId": "com.griphook.app",
    "productName": "Griphook",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "electron/**/*", 
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Development"
    }
  }
}
```

### Next.js Configuration

The app uses dynamic configuration in `next.config.ts`:

```typescript
const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  output: isElectron ? 'export' : 'standalone',
  ...(isElectron && {
    basePath: '',
    assetPrefix: './',
    trailingSlash: true,
    images: { unoptimized: true }
  })
};
```

## 🎨 Icons and Branding

### Required Icon Files

Create these icons in the `assets/` folder:

- `assets/icon.ico` - Windows icon (multi-size ICO)
- `assets/icon.icns` - macOS icon (ICNS format)
- `assets/icon.png` - Linux icon (512x512 PNG)

### Icon Creation Tools

```bash
# Option 1: electron-icon-maker
npm install -g electron-icon-maker
electron-icon-maker --input=assets/icon-source.png --output=assets/

# Option 2: Use online converters
# - convertio.co for ICO files
# - cloudconvert.com for ICNS files
```

## 🔒 Code Signing (Optional)

### Windows Code Signing

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "password",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

### macOS Code Signing

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name",
      "hardenedRuntime": true,
      "entitlements": "assets/entitlements.plist"
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json out dist
npm install
```

#### 2. Icon Issues
- Ensure icon files exist in correct formats
- Check file paths in build configuration
- Use proper icon sizes (see assets/README.md)

#### 3. Windows Build Issues
- Install Visual Studio Build Tools
- Run in elevated PowerShell if needed
- Check Windows Defender / antivirus blocking

#### 4. macOS Build Issues  
- Install Xcode Command Line Tools: `xcode-select --install`
- For notarization, set up Apple ID in environment variables

#### 5. Linux Build Issues
- Install build dependencies: `sudo apt install build-essential`
- For AppImage: `sudo apt install fuse`

### Debug Mode

Run with debug output:
```bash
DEBUG=electron-builder npm run electron-build
```

## 📖 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder Documentation](https://www.electron.build/)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

When contributing to the desktop app:

1. Test builds on multiple platforms
2. Update this documentation for any configuration changes
3. Ensure GitHub Actions workflow still works
4. Test the installation process on clean systems
5. Update version numbers in package.json for releases