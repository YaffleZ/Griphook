# Griphook Desktop Build Script for Windows
# Builds the desktop application for distribution

Write-Host "🏗️  Building Griphook Desktop Application..." -ForegroundColor Green

# Set environment for electron build
$env:BUILD_TARGET = "electron"

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build Next.js for static export
Write-Host "⚛️  Building Next.js application..." -ForegroundColor Yellow
npm run build

# Check if export command exists in package.json, if not use next export directly
$packageJson = Get-Content "package.json" | ConvertFrom-Json
if ($packageJson.scripts.export) {
    npm run export
} else {
    npx next export
}

# Build Electron app
Write-Host "🖥️  Building Electron application..." -ForegroundColor Yellow
npm run electron-build

Write-Host "✅ Build complete! Check the 'dist' folder for installers." -ForegroundColor Green
Write-Host ""
Write-Host "Available files:" -ForegroundColor Cyan
Get-ChildItem "dist" | Format-Table Name, Length, LastWriteTime