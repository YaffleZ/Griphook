const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // Version information
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome
  },

  // Safe IPC communication (if needed in the future)
  invoke: (channel, ...args) => {
    // Whitelist allowed channels
    const validChannels = ['app-version', 'oauth-login'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  },

  // Listen to safe channels
  on: (channel, callback) => {
    const validChannels = ['oauth-code'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    const validChannels = ['oauth-code'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});