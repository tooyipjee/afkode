import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onPtyData: (callback: (tabId: string, data: string) => void) => {
    ipcRenderer.removeAllListeners('pty:data');
    ipcRenderer.on('pty:data', (_event, tabId: string, data: string) => callback(tabId, data));
  },
  onPtyExit: (callback: (tabId: string, exitCode: number) => void) => {
    ipcRenderer.removeAllListeners('pty:exit');
    ipcRenderer.on('pty:exit', (_event, tabId: string, exitCode: number) => callback(tabId, exitCode));
  },
  createPtyTab: (shell?: string): Promise<{ tabId: string; shell: string; shellName: string }> =>
    ipcRenderer.invoke('pty:create', shell),
  closePtyTab: (tabId: string) => ipcRenderer.send('pty:close', tabId),
  sendPtyInput: (tabId: string, data: string) => {
    ipcRenderer.send('pty:input', tabId, data);
  },
  sendPtyResize: (tabId: string, cols: number, rows: number) => {
    ipcRenderer.send('pty:resize', tabId, cols, rows);
  },
  setConfig: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke('config:set', key, value),
  onOverlayShow: (callback: () => void) => {
    ipcRenderer.removeAllListeners('overlay:show');
    ipcRenderer.on('overlay:show', () => callback());
  },
  onOverlayHide: (callback: () => void) => {
    ipcRenderer.removeAllListeners('overlay:hide');
    ipcRenderer.on('overlay:hide', () => callback());
  },
  onConfigUpdate: (callback: (config: Record<string, unknown>) => void) => {
    ipcRenderer.removeAllListeners('config:update');
    ipcRenderer.on('config:update', (_event, config) => callback(config));
  },
  getConfig: () => ipcRenderer.invoke('config:get'),
  hideOverlay: () => ipcRenderer.send('overlay:dismiss'),
  notifyVisibility: (visible: boolean) => ipcRenderer.send('overlay:visibility', visible),
  openBugReport: () => ipcRenderer.send('app:open-bug-report'),
  openFeatureRequest: () => ipcRenderer.send('app:open-feature-request'),
  getWindowBounds: (): Promise<{ x: number; y: number; width: number; height: number }> =>
    ipcRenderer.invoke('window:getBounds'),
  setWindowBounds: (bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send('window:setBounds', bounds),
});
