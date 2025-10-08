#!/bin/bash

# Griphook Desktop Build Script
# Builds the desktop application for distribution

echo "🏗️  Building Griphook Desktop Application..."

# Set environment for electron build
export BUILD_TARGET=electron

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build Next.js for static export
echo "⚛️  Building Next.js application..."
npm run build
npm run export

# Build Electron app
echo "🖥️  Building Electron application..."
npm run electron-build

echo "✅ Build complete! Check the 'dist' folder for installers."
echo ""
echo "Available files:"
ls -la dist/