const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;
let nextServer;

const port = process.env.PORT || '3000';
const startUrl = isDev ? `http://localhost:${port}` : `http://127.0.0.1:${port}`;
const allowedOrigin = new URL(startUrl).origin;

async function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (res) => {
        res.destroy();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Timed out waiting for Next.js server to start.'));
        } else {
          setTimeout(check, 500);
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // We'll create this
    title: 'Griphook - Azure Key Vault Advanced Editor',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Don't show until ready
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
      // Try unpacked location first (for asarUnpack)
      const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js');
      const unpackedCwd = path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone');
      
      // Check if unpacked version exists
      if (fs.existsSync(unpackedPath)) {
        serverPath = unpackedPath;
        serverCwd = unpackedCwd;
        console.log('Using unpacked server');
      } else {
        // Fallback to app path if unpacked doesn't exist
        serverPath = path.join(app.getAppPath(), '.next', 'standalone', 'server.js');
        serverCwd = path.join(app.getAppPath(), '.next', 'standalone');
        console.log('Using app path server');
      }
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

      waitForServer(startUrl)
        .then(() => {
          if (mainWindow) {
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

  // Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== allowedOrigin && !isDev) {
      event.preventDefault();
    }
  });
}

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