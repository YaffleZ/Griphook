#!/bin/bash

# Icon Generator Script for Griphook Desktop App
# Creates all required icon formats from a source PNG image

echo "🎨 Griphook Icon Generator"
echo "=========================="

# Check if source image exists
SOURCE_IMAGE="assets/icon-source.png"
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    echo ""
    echo "Please create a high-resolution PNG image (1024x1024) and save it as:"
    echo "  assets/icon-source.png"
    echo ""
    echo "Icon design suggestions:"
    echo "  🔐 Key or lock symbol"
    echo "  🏛️ Vault/safe imagery"
    echo "  ⚡ Azure blue colors (#0078D4)"
    echo "  🛡️ Security/shield elements"
    exit 1
fi

echo "✅ Found source image: $SOURCE_IMAGE"

# Create assets directory if it doesn't exist
mkdir -p assets

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing electron-icon-maker instead..."
    
    # Install electron-icon-maker if not already installed
    if ! command -v electron-icon-maker &> /dev/null; then
        echo "📦 Installing electron-icon-maker..."
        npm install -g electron-icon-maker
    fi
    
    echo "🔨 Generating icons with electron-icon-maker..."
    electron-icon-maker --input="$SOURCE_IMAGE" --output=assets/
    
    echo "✅ Icons generated successfully!"
    echo ""
    echo "Generated files:"
    ls -la assets/*.ico assets/*.icns assets/*.png 2>/dev/null
    
else
    echo "🔨 Generating icons with ImageMagick..."
    
    # Generate Windows ICO (multiple sizes in one file)
    echo "  📱 Creating Windows icon (icon.ico)..."
    convert "$SOURCE_IMAGE" -resize 256x256 \
            \( -clone 0 -resize 128x128 \) \
            \( -clone 0 -resize 64x64 \) \
            \( -clone 0 -resize 48x48 \) \
            \( -clone 0 -resize 32x32 \) \
            \( -clone 0 -resize 16x16 \) \
            assets/icon.ico
    
    # Generate Linux PNG
    echo "  🐧 Creating Linux icon (icon.png)..."
    convert "$SOURCE_IMAGE" -resize 512x512 assets/icon.png
    
    # Generate macOS ICNS (requires additional tools)
    echo "  🍎 Creating macOS icon (icon.icns)..."
    if command -v iconutil &> /dev/null; then
        # Create iconset directory
        mkdir -p assets/icon.iconset
        
        # Generate all required sizes for macOS
        convert "$SOURCE_IMAGE" -resize 16x16 assets/icon.iconset/icon_16x16.png
        convert "$SOURCE_IMAGE" -resize 32x32 assets/icon.iconset/icon_16x16@2x.png
        convert "$SOURCE_IMAGE" -resize 32x32 assets/icon.iconset/icon_32x32.png
        convert "$SOURCE_IMAGE" -resize 64x64 assets/icon.iconset/icon_32x32@2x.png
        convert "$SOURCE_IMAGE" -resize 128x128 assets/icon.iconset/icon_128x128.png
        convert "$SOURCE_IMAGE" -resize 256x256 assets/icon.iconset/icon_128x128@2x.png
        convert "$SOURCE_IMAGE" -resize 256x256 assets/icon.iconset/icon_256x256.png
        convert "$SOURCE_IMAGE" -resize 512x512 assets/icon.iconset/icon_256x256@2x.png
        convert "$SOURCE_IMAGE" -resize 512x512 assets/icon.iconset/icon_512x512.png
        convert "$SOURCE_IMAGE" -resize 1024x1024 assets/icon.iconset/icon_512x512@2x.png
        
        # Create ICNS file
        iconutil -c icns assets/icon.iconset -o assets/icon.icns
        
        # Clean up iconset directory
        rm -rf assets/icon.iconset
        
        echo "  ✅ macOS icon created successfully"
    else
        echo "  ⚠️  iconutil not found (macOS only). Using fallback method..."
        # Fallback: just create a large PNG that electron-builder can handle
        convert "$SOURCE_IMAGE" -resize 1024x1024 assets/icon.icns.png
        echo "  📝 Created icon.icns.png - rename to icon.icns on macOS or use online converter"
    fi
    
    echo "✅ Icons generated successfully!"
fi

echo ""
echo "📋 Generated Icon Files:"
echo "  📱 assets/icon.ico   (Windows)"
echo "  🐧 assets/icon.png   (Linux)" 
echo "  🍎 assets/icon.icns  (macOS)"
echo ""
echo "🚀 You can now build the desktop app with:"
echo "  npm run build-electron"
echo ""
echo "💡 Tip: Test your icons by building and installing the app!"