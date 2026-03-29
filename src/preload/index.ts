import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onPtyData: (callback: (data: string) => void) => {
    ipcRenderer.removeAllListeners('pty:data');
    ipcRenderer.on('pty:data', (_event, data: string) => callback(data));
  },
  sendPtyInput: (data: string) => {
    ipcRenderer.send('pty:input', data);
  },
  sendPtyResize: (cols: number, rows: number) => {
    ipcRenderer.send('pty:resize', cols, rows);
  },
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
});
