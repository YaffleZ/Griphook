// Type definitions for Electron API
interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    electron: string;
    chrome: string;
  };
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};