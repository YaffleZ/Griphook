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
    const serverPath = path.join(__dirname, '../.next/standalone/server.js');
    const serverCwd = path.join(__dirname, '../.next/standalone');

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

      nextServer.on('error', (error) => {
        dialog.showErrorBox('Griphook', `Failed to start bundled Next.js server.\n\n${error.message}`);
      });

      nextServer.on('exit', (code, signal) => {
        if (!app.isQuitting) {
          const reason = signal ? `signal ${signal}` : `exit code ${code}`;
          dialog.showErrorBox('Griphook', `The embedded Next.js server stopped unexpectedly (${reason}). The application will now close.`);
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