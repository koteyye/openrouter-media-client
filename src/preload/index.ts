import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './index.d';

const api: ElectronAPI = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  fetchModels: (mediaType) => ipcRenderer.invoke('models:fetch', mediaType),
  generateVideo: (params) => ipcRenderer.invoke('video:generate', params),
  pollVideo: (pollingUrl) => ipcRenderer.invoke('video:poll', pollingUrl),
};

contextBridge.exposeInMainWorld('electronAPI', api);
