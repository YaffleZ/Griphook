# How to Create Your Griphook App Icon

I've created SVG icon designs for you! Now you need to convert one to PNG format.

## 📁 Available SVG Icons

1. **`assets/icon-source.svg`** - Key icon with "GRIPHOOK" text
2. **`assets/icon-clean.svg`** - Clean key icon without text (recommended for app icon)

## 🔄 Convert SVG to PNG (Choose one method)

### Method 1: Online Converter (Easiest)
1. Go to https://convertio.co/svg-png/
2. Upload `assets/icon-clean.svg`
3. Set output size to 1024x1024 pixels
4. Download and save as `assets/icon-source.png`

### Method 2: Using Inkscape (Free Software)
1. Download Inkscape: https://inkscape.org/
2. Open `assets/icon-clean.svg` in Inkscape
3. Go to File → Export PNG Image
4. Set width and height to 1024 pixels
5. Export as `assets/icon-source.png`

### Method 3: Using PowerShell (if you have ImageMagick)
```powershell
# Install ImageMagick first: https://imagemagick.org/script/download.php#windows
magick "assets\icon-clean.svg" -resize 1024x1024 "assets\icon-source.png"
```

### Method 4: Using Node.js (if you prefer)
```bash
npm install -g svg2png-cli
svg2png "assets/icon-clean.svg" "assets/icon-source.png" --width=1024 --height=1024
```

### Method 5: Use Browser
1. Open `assets/icon-clean.svg` in Chrome/Edge
2. Right-click → Inspect Element
3. In Console, paste:
```javascript
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1024;
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0, 1024, 1024);
  const link = document.createElement('a');
  link.download = 'icon-source.png';
  link.href = canvas.toDataURL();
  link.click();
};
img.src = 'data:image/svg+xml;base64,' + btoa(document.documentElement.outerHTML);
```

## 🎨 Icon Design Features

The SVG icons include:
- **Azure Blue Colors** (#0078D4, #005A9E) - Microsoft's official Azure branding
- **Key Symbol** - Represents access and security
- **Clean Design** - Works well at small sizes (16x16 to 1024x1024)
- **Professional Look** - Gradient background with highlights
- **Security Elements** - Small lock symbols in corners (subtle)

## ✅ After Creating PNG

Once you have `assets/icon-source.png`:

1. **Generate all icon formats:**
   ```powershell
   .\scripts\generate-icons.ps1
   ```

2. **Test the desktop app:**
   ```bash
   npm install --save-dev electron electron-builder concurrently wait-on cross-env
   npm run electron-dev
   ```

## 🎯 Recommended

Use **`assets/icon-clean.svg`** as it's specifically designed for app icons:
- No text (works better at small sizes)
- Clear, bold design
- Professional appearance
- Follows icon design best practices

The key symbolizes:
- 🔐 **Security** - Azure Key Vault protection
- 🗝️ **Access** - Managing secrets and credentials  
- 🏛️ **Trust** - Like Griphook guarding Gringotts vaults