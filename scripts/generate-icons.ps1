# Icon Generator Script for Griphook Desktop App
# Creates all required icon formats from a source PNG image

Write-Host "🎨 Griphook Icon Generator" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

# Check if source image exists
$sourceImage = "assets\icon-source.png"
if (-not (Test-Path $sourceImage)) {
    Write-Host "❌ Error: Source image not found at $sourceImage" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a high-resolution PNG image (1024x1024) and save it as:" -ForegroundColor Yellow
    Write-Host "  assets\icon-source.png" -ForegroundColor White
    Write-Host ""
    Write-Host "Icon design suggestions:" -ForegroundColor Cyan
    Write-Host "  🔐 Key or lock symbol"
    Write-Host "  🏛️ Vault/safe imagery"
    Write-Host "  ⚡ Azure blue colors (#0078D4)"
    Write-Host "  🛡️ Security/shield elements"
    exit 1
}

Write-Host "✅ Found source image: $sourceImage" -ForegroundColor Green

# Create assets directory if it doesn't exist
if (-not (Test-Path "assets")) {
    New-Item -ItemType Directory -Path "assets" | Out-Null
}

# Check if electron-icon-maker is available
try {
    Get-Command electron-icon-maker -ErrorAction Stop | Out-Null
    Write-Host "🔨 Generating icons with electron-icon-maker..." -ForegroundColor Yellow
    
    # Generate icons
    & electron-icon-maker --input="$sourceImage" --output=assets\
    
    Write-Host "✅ Icons generated successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️  electron-icon-maker not found. Installing..." -ForegroundColor Yellow
    
    try {
        # Install electron-icon-maker globally
        Write-Host "📦 Installing electron-icon-maker..." -ForegroundColor Yellow
        npm install -g electron-icon-maker
        
        Write-Host "🔨 Generating icons..." -ForegroundColor Yellow
        & electron-icon-maker --input="$sourceImage" --output=assets\
        
        Write-Host "✅ Icons generated successfully!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Failed to install electron-icon-maker." -ForegroundColor Red
        Write-Host "Manual alternatives:" -ForegroundColor Yellow
        Write-Host "  1. Use online converters:" -ForegroundColor White
        Write-Host "     - convertio.co/png-ico/ (for .ico files)" -ForegroundColor Cyan
        Write-Host "     - cloudconvert.com/png-to-icns (for .icns files)" -ForegroundColor Cyan
        Write-Host "  2. Use image editing software (GIMP, Photoshop)" -ForegroundColor White
        Write-Host "  3. Install ImageMagick and use the Linux script" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Generated Icon Files:" -ForegroundColor Cyan
Write-Host "  📱 assets\icon.ico   (Windows)" -ForegroundColor White
Write-Host "  🐧 assets\icon.png   (Linux)" -ForegroundColor White  
Write-Host "  🍎 assets\icon.icns  (macOS)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 You can now build the desktop app with:" -ForegroundColor Green
Write-Host "  npm run build-electron" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Test your icons by building and installing the app!" -ForegroundColor Yellow