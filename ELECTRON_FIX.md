# Electron Production Build Fix

## Root Cause Analysis

The "spawn node ENOENT" error occurred because:

1. **Wrong approach**: Initially used `spawn('node', ...)` to start Next.js server, requiring a separate Node binary
2. **Missing static assets**: Next.js standalone build creates `.next/standalone/` but static assets stay in `.next/static/`
3. **Incomplete packaging**: electron-builder wasn't copying the necessary static files into the standalone bundle

## The Fix

### 1. Changed Server Startup (electron/main.js)
- Switched from `spawn('node')` to `fork()` which uses Electron's bundled Node runtime
- Added server readiness polling before loading the window
- Fixed undefined `startUrl` variable and improved error handling

### 2. Created Build Preparation Script (scripts/prepare-electron.js)
Copies required assets into standalone bundle:
- `.next/static/` → `.next/standalone/.next/static/`
- `public/` → `.next/standalone/public/`

### 3. Updated Package Configuration (package.json)
- Modified `build-electron` script to run preparation before packaging
- Simplified `files` array to only include `.next/standalone/**/*`
- Removed redundant `extraResources` configuration

## Testing

The app now launches successfully in production mode:
```powershell
$env:NODE_ENV="production"
npx electron .
```

## Known Issues

**electron-builder file locking**: The Windows build process may fail with "file in use" errors when rebuilding. This is a Windows file locking issue, not a code problem.

**Workarounds**:
1. Close all running Electron/Griphook processes before building
2. Use a fresh PowerShell session
3. Delete `dist/` folder manually before rebuilding
4. Build on CI/CD where clean environments are guaranteed

## Next Steps

For distribution, use GitHub Actions to build installers on clean runners where file locking won't occur.
