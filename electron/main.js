const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const { URL } = require('url');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;
let nextServer;
let oauthCallbackServer;

const port = process.env.PORT || '3000';
const startUrl = `http://localhost:${port}`; // Always use localhost for OAuth redirect URI compatibility
const allowedOrigin = new URL(startUrl).origin;

async function waitForServer(url, timeoutMs = 30000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (res) => {
        res.destroy();
        console.log(`Server ready after ${Date.now() - startTime}ms`);
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timed out waiting for Next.js server to start after ${timeoutMs}ms.`));
        } else {
          setTimeout(check, 200); // Check every 200ms instead of 500ms
        }
      });
    };

    check();
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    // Hide the menu bar by default (Windows/Linux)
    // Users won't see the classic menu; DevTools is opened programmatically in dev
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Griphook - Azure Key Vault Advanced Editor',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
    backgroundColor: '#1e293b' // Match the app's dark theme
  });

  if (isDev) {
    // In development, connect to the existing dev server
    mainWindow.loadURL(startUrl);
  } else {
    // In production, start the Next.js server
    const isPackaged = app.isPackaged;
    const fs = require('fs');
    
    let serverPath;
    let serverCwd;
    
    if (isPackaged) {
      // When packaged, standalone is in extraResources/standalone
      // This is outside the asar and has proper node_modules for module resolution
      serverPath = path.join(process.resourcesPath, 'standalone', 'server.js');
      serverCwd = path.join(process.resourcesPath, 'standalone');
      console.log('Using extraResources standalone server');
    } else {
      // Development mode
      serverPath = path.join(__dirname, '../.next/standalone/server.js');
      serverCwd = path.join(__dirname, '../.next/standalone');
    }

    console.log('Server path:', serverPath);
    console.log('Server exists:', fs.existsSync(serverPath));
    console.log('Server cwd:', serverCwd);
    console.log('CWD exists:', fs.existsSync(serverCwd));
    console.log('Is packaged:', isPackaged);
    console.log('App path:', app.getAppPath());
    console.log('Resources path:', process.resourcesPath);

    // Ensure static and public assets exist when running un-packaged in production mode
    if (!isPackaged) {
      try {
        const projectRoot = path.join(__dirname, '..');
        const srcStatic = path.join(projectRoot, '.next', 'static');
        const destStatic = path.join(serverCwd, '.next', 'static');
        const srcPublic = path.join(projectRoot, 'public');
        const destPublic = path.join(serverCwd, 'public');

        if (fs.existsSync(srcStatic)) {
          if (!fs.existsSync(destStatic)) {
            console.log('Copying .next/static to standalone...');
            fs.mkdirSync(path.dirname(destStatic), { recursive: true });
            fs.cpSync(srcStatic, destStatic, { recursive: true });
            console.log('✓ Copied .next/static');
          }
        } else {
          console.warn('Warning: source .next/static not found, CSS/JS may not load');
        }

        if (fs.existsSync(srcPublic)) {
          if (!fs.existsSync(destPublic)) {
            console.log('Copying public to standalone...');
            fs.cpSync(srcPublic, destPublic, { recursive: true });
            console.log('✓ Copied public');
          }
        } else {
          console.warn('Warning: public folder not found');
        }
      } catch (copyErr) {
        console.warn('Asset copy step failed:', copyErr);
      }
    }

    if (!fs.existsSync(serverPath)) {
      const error = `Server file not found!\n\nLooking for: ${serverPath}\n\nApp path: ${app.getAppPath()}\nResources path: ${process.resourcesPath}`;
      console.error(error);
      dialog.showErrorBox('Griphook', error);
      app.quit();
      return;
    }

    try {
      nextServer = fork(serverPath, {
        env: {
          ...process.env,
          PORT: port,
          NODE_ENV: 'production'
        },
        cwd: serverCwd,
        stdio: 'pipe'
      });

      // Capture stdout and stderr for debugging
      let serverOutput = '';
      let serverError = '';
      
      if (nextServer.stdout) {
        nextServer.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Next.js:', output);
          serverOutput += output;
          
          // Check if authentication completed
          if (output.includes('Access token received successfully') || output.includes('Found') && output.includes('Key Vaults')) {
            // OAuth callback detected! Focus the main window
            if (mainWindow && !mainWindow.isDestroyed()) {
              console.log('Authentication detected, focusing window...');
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.focus();
              mainWindow.show();
            }
          }
        });
      }
      
      if (nextServer.stderr) {
        nextServer.stderr.on('data', (data) => {
          const error = data.toString();
          console.error('Next.js Error:', error);
          serverError += error;
        });
      }

      nextServer.on('error', (error) => {
        const fullError = `Failed to start bundled Next.js server.\n\nError: ${error.message}\n\nServer Path: ${serverPath}\nServer CWD: ${serverCwd}\n\nStderr:\n${serverError}`;
        console.error(fullError);
        dialog.showErrorBox('Griphook', fullError);
      });

      nextServer.on('exit', (code, signal) => {
        if (!app.isQuitting) {
          const reason = signal ? `signal ${signal}` : `exit code ${code}`;
          const fullError = `The embedded Next.js server stopped unexpectedly (${reason}).\n\nServer Path: ${serverPath}\nServer CWD: ${serverCwd}\n\nLast Output:\n${serverOutput}\n\nErrors:\n${serverError}`;
          console.error(fullError);
          dialog.showErrorBox('Griphook', fullError);

          app.quit();
        }
      });

      // Show window early with loading message
      if (mainWindow) {
        mainWindow.setTitle('Griphook - Starting server...');
        mainWindow.show();
      }

      waitForServer(startUrl)
        .then(() => {
          if (mainWindow) {
            mainWindow.setTitle('Griphook - Azure Key Vault Advanced Editor');
            mainWindow.loadURL(startUrl);
          }
        })
        .catch((error) => {
          dialog.showErrorBox('Griphook', `Timed out waiting for the embedded Next.js server to start.\n\n${error.message}`);
          app.quit();
        });
    } catch (error) {
      dialog.showErrorBox('Griphook', `Unable to launch embedded Next.js server.\n\n${error.message}`);
      app.quit();
    }
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    // Remove app menu and hide menubar on Windows/Linux
    if (process.platform !== 'darwin') {
      try {
        Menu.setApplicationMenu(null);
        if (typeof mainWindow.setMenuBarVisibility === 'function') {
          mainWindow.setMenuBarVisibility(false);
        }
      } catch (e) {
        console.warn('Unable to hide menu bar:', e);
      }
    }

    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation - open Azure OAuth in external browser
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation within the app
    if (parsedUrl.origin === allowedOrigin || isDev) {
      return;
    }

    // Open Azure OAuth and other external URLs in system browser
    event.preventDefault();
    console.log('Opening external URL:', navigationUrl);
    shell.openExternal(navigationUrl);
  });
}

// OAuth callback server for native app authentication
function createOAuthCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);
      
      // Handle root path for loopback redirect (no path to satisfy AAD loopback rules)
      if (url.pathname === '/' || url.pathname === '') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        
        // Send response to browser (explicit UTF-8 to avoid mojibake like âœ“ for ✓)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <title>Authentication Complete</title>
            <style>
              body { font-family: system-ui; text-align: center; padding: 50px; background: #f5f5f5; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
              .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="container">
              ${error ? 
                `<h2 class="error">Authentication Failed</h2><p>Error: ${error}</p>` :
                `<h2 class="success">Authentication Successful!</h2>
                 <p>You can now close this browser window.</p>
                 <p>Returning to the app...</p>`
              }
            </div>
              <script>
              setTimeout(() => window.close(), 800);
              </script>
          </body>
          </html>
        `);
        
        // Close server and resolve with result
        server.close();
        if (error) {
          reject(new Error(error));
        } else {
          resolve(code);
        }
        
        // Focus main window
        if (mainWindow) {
          mainWindow.focus();
          mainWindow.show();
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
    // Listen on random available port
    server.listen(0, 'localhost', () => {
      const address = server.address();
      console.log(`OAuth callback server listening on http://localhost:${address.port}`);
      // Store server for external access
      server.port = address.port;
      resolve(server);
    });
    
    server.on('error', reject);
  });
}

// Handle OAuth authentication
ipcMain.handle('oauth-login', async (event, authUrl) => {
  try {
    // Create callback server on random port
    const server = await createOAuthCallbackServer();
    const callbackPort = server.port;
    
    // Modify auth URL to use our callback server
    const url = new URL(authUrl);
    // Use loopback redirect without a path to avoid redirect URI mismatches
    const callbackRedirectUri = `http://localhost:${callbackPort}`;
    url.searchParams.set('redirect_uri', callbackRedirectUri);
    
    console.log('Opening OAuth URL:', url.toString());
    console.log('Callback server on port:', callbackPort);
    
    // Open browser
    shell.openExternal(url.toString());
    
    // Wait for callback - the server will resolve/reject this promise
    return new Promise((resolve, reject) => {
      // Override the server request handler to emit events
      const originalHandler = server.listeners('request')[0];
      server.removeAllListeners('request');
      
      server.on('request', (req, res) => {
        const reqUrl = new URL(req.url, `http://localhost`);
        
        if (reqUrl.pathname === '/' || reqUrl.pathname === '') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');
          console.log('OAuth callback received:', { hasCode: !!code, hasError: !!error });
          
          // Send response (explicit UTF-8 to avoid mojibake)
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8" />
              <title>Authentication Complete</title>
              <style>
                body { font-family: system-ui; text-align: center; padding: 50px; background: #f5f5f5; }
                .success { color: #28a745; }
                .error { color: #dc3545; }
                .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              </style>
            </head>
            <body>
              <div class="container">
                ${error ? 
                  `<h2 class="error">Authentication Failed</h2><p>Error: ${error}</p>` :
                  `<h2 class="success">Authentication Successful!</h2>
                   <p>✓ You can now close this browser window.</p>
                   <p>Returning to Griphook app...</p>`
                }
              </div>
              <script>
                setTimeout(() => window.close(), 800);
              </script>
            </body>
            </html>
          `);
          
          // Close server and resolve/reject
          server.close();
          
          if (error) {
            console.error('OAuth error returned to loopback:', error);
            reject(new Error(error));
          } else {
            console.log('Resolving oauth-login with code to renderer');
            // Return both the code and the exact redirectUri used
            try {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('oauth-code', { code, redirectUri: callbackRedirectUri });
              }
            } catch (sendErr) {
              console.warn('Failed to notify renderer via oauth-code event:', sendErr);
            }
            resolve({ code, redirectUri: callbackRedirectUri });
          }
          
          // Focus main window
          if (mainWindow) {
            mainWindow.focus();
            mainWindow.show();
          }
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });
      
      // Handle server errors
      server.on('error', reject);
    });
    
  } catch (error) {
    console.error('OAuth error:', error);
    throw error;
  }
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Griphook',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Griphook',
              message: 'Griphook - Azure Key Vault Advanced Editor',
              detail: 'Version 1.0.0\n\nYour trusted Azure Key Vault secrets guardian.\nBuilt with Next.js, TypeScript, and Electron.'
            });
          }
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/YaffleZ/Griphook')
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Clean up the Next.js server
  if (nextServer) {
    nextServer.kill('SIGTERM');
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  // Clean up the Next.js server
  if (nextServer) {
    nextServer.kill('SIGTERM');
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});