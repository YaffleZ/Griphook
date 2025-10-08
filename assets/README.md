# Icon Requirements for Griphook Desktop App

## Required Icon Files

You'll need to create the following icon files for the desktop application:

### Windows (.ico format)
- `assets/icon.ico` - Windows app icon (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)

### macOS (.icns format)  
- `assets/icon.icns` - macOS app icon (1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16)

### Linux (.png format)
- `assets/icon.png` - Linux app icon (512x512 PNG)

## Creating Icons

### Option 1: Use Electron Icon Maker
```bash
npm install -g electron-icon-maker
electron-icon-maker --input=assets/icon-source.png --output=assets/
```

### Option 2: Online Tools
- Use online converters like:
  - https://convertio.co/png-ico/ (for .ico)
  - https://cloudconvert.com/png-to-icns (for .icns)

### Option 3: Manual Creation
- Create a high-resolution PNG (1024x1024) of your app icon
- Use tools like GIMP, Photoshop, or online converters
- Ensure the icon represents Azure Key Vault management (keys, security, vault themes)

## Icon Design Suggestions

For Griphook (Azure Key Vault editor), consider:
- 🔐 Key or lock symbol
- 🏛️ Vault/safe imagery  
- ⚡ Azure blue colors (#0078D4)
- 🛡️ Security/shield elements
- Clean, modern design that works at small sizes

## Temporary Icons

Until you create custom icons, you can use placeholder icons:
- Download Azure-themed icons from Microsoft's design resources
- Use simple geometric shapes with Azure colors
- Ensure 1024x1024 base resolution for best quality scaling