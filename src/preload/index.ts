import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './index.d';

const api: ElectronAPI = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  fetchModels: (mediaType) => ipcRenderer.invoke('models:fetch', mediaType),
  generateVideo: (params) => ipcRenderer.invoke('video:generate', params),
  pollVideo: (pollingUrl) => ipcRenderer.invoke('video:poll', pollingUrl),
  generateImage: (prompt, imageUrl, options) => ipcRenderer.invoke('image:generate', prompt, imageUrl, options),
  i2vGetModels: () => ipcRenderer.invoke('i2v:get-models'),
  i2vUploadImage: (filePath) => ipcRenderer.invoke('i2v:upload-image', filePath),
  i2vGenerate: (input) => ipcRenderer.invoke('i2v:generate', input),
  i2vPoll: (jobId) => ipcRenderer.invoke('i2v:poll', jobId),
  i2vDownload: (jobId, outputPath) => ipcRenderer.invoke('i2v:download', jobId, outputPath),
  creditsFetch: () => ipcRenderer.invoke('credits:fetch'),
  historyList: () => ipcRenderer.invoke('history:list'),
  historyDelete: (id) => ipcRenderer.invoke('history:delete', id),
  historyRecoverPending: () => ipcRenderer.invoke('history:recover-pending'),
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:save-file', defaultName),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:open-directory'),
  openLocalFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  showLocalFileInFolder: (filePath) => ipcRenderer.invoke('file:show-in-folder', filePath),
  testConnection: (apiKey) => ipcRenderer.invoke('config:test-connection', apiKey),
};

contextBridge.exposeInMainWorld('electronAPI', api);
