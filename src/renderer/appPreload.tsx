import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import titlebarContext from '../../misc/window/titlebarContext'; 

console.log('[ERWT] : Preload execution started');

// This is the single, unified API object for your entire application.
const api = {
  // --- Functions from misc/window/windowPreload.ts ---
  titlebar: titlebarContext,

  // Generic Send (Restricted to specific channels if needed)
  send: (channel: string, data: string) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // Generic Receive (Listener)
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = [
      'gotLoadedDataX', 'Home', 'Picture', 'gotAllPictures', 'gotPicture',
      'Shortcuts', 'gotAllBlocks', 'openArchive', 'gotPageStyle', 'gotUserTheme',
      'gotArchive', 'gotUserColor', 'gotOS', 'openFiles', 'newFile', 'Save',
      'fromMain', 'Text', 'Graph', 'Math', 'Group', 'gotNotebooks',
      'toggleNotebooks', 'Search',
      'octave-output' // Required for Octave Terminal
    ];
    if (validChannels.includes(channel)) {
      // Type-safe wrapper for the listener
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);

      // Add listener
      ipcRenderer.on(channel, subscription);

      // Return cleanup function (Critical for React useEffect)
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },

  // --- Core Application Functions ---
  getNotebooks: () => ipcRenderer.send('getNotebooks'),
  delete: (path: string, isFolder: boolean) => ipcRenderer.send('delete', path, isFolder),
  newFile: (filePath: string) => ipcRenderer.send('newFile', filePath),
  newFolder: (folderPath: string) => ipcRenderer.send('newFolder', folderPath),
  openFiles: () => ipcRenderer.send('openFiles'),
  move: (oldPath: string, newPath: string) => ipcRenderer.send('move', oldPath, newPath),
  save: (data: string, file: string, newName: string) => ipcRenderer.send('save', data, file, newName),
  load: (file: string) => ipcRenderer.send('load', file),
  saveX: (data: string, filePath: string) => ipcRenderer.send('saveX', data, filePath),
  loadX: (filePath: string) => ipcRenderer.send('loadX', filePath),
  getOS: () => ipcRenderer.send('getOS'),
  
  // --- Window Controls ---
  maximize: () => ipcRenderer.send('maximize'),
  unmaximize: () => ipcRenderer.send('unmaximize'),
  minimize: () => ipcRenderer.send('minimize'),
  close: () => ipcRenderer.send('close'),
  
  // --- Theme & Settings ---
  setUserColor: (color: string) => ipcRenderer.send('setUserColor', color),
  setPageStyle: (style: string) => ipcRenderer.send('setPageStyle', style),
  toggle: () => ipcRenderer.send('dark-mode'),
  getUserColor: () => ipcRenderer.send('getUserColor'),
  getPageStyle: () => ipcRenderer.send('getPageStyle'),
  getUserTheme: () => ipcRenderer.send('getUserTheme'),
  
  // --- Images & Assets ---
  getPicture: (id: string) => ipcRenderer.send('getPicture', id),
  getAllPictures: (path: string) => ipcRenderer.send('getAllPictures', path),
  getArchive: () => ipcRenderer.send('getArchive'),
  startSearch: () => ipcRenderer.send('startSearch'),

  // --- Archives ---
  getArchivedNotebooks: () => ipcRenderer.invoke('get-archived-notebooks'),
  archiveItem: (itemPath: string) => ipcRenderer.invoke('archive-item', itemPath),
  archiveNotebooks: (paths: string[]) => ipcRenderer.invoke('archive-notebooks', paths),
  restoreArchivedNotebooks: (paths: string[]) => ipcRenderer.invoke('restore-archived-notebooks', paths),
  
  requestNotebooksRefresh: () => ipcRenderer.send('request-notebooks-refresh'),
  onNotebooksRefresh: (callback: () => void) => {
    ipcRenderer.on('notebooks-need-refresh', callback);
    return () => {
      ipcRenderer.removeListener('notebooks-need-refresh', callback);
    };
  },

  // --- AI Chat Bot ---
  getAIResponse: (prompt: string) => ipcRenderer.invoke('get-ai-response', prompt),

  // --- GNU Octave Integration ---
  startOctave: () => ipcRenderer.send('start-octave-session'),
  sendOctaveInput: (cmd: string) => ipcRenderer.send('octave-input', cmd),
  stopOctave: () => ipcRenderer.send('stop-octave-session'),
  readImage: (path: string) => ipcRenderer.invoke('read-image-file', path),
};

// Securely expose the 'api' object to the renderer process
contextBridge.exposeInMainWorld('api', api);

// --- Version Info (Optional) ---
window.addEventListener('DOMContentLoaded', () => {
  const { env } = process;
  const versions: Record<string, unknown> = {};
  versions['erwt'] = env['npm_package_version'];
  versions['license'] = env['npm_package_license'];
  for (const type of ['chrome', 'node', 'electron']) {
    versions[type] = process.versions[type].replace('+', '');
  }
  for (const type of ['react']) {
    const v = env['npm_package_dependencies_' + type];
    if (v) versions[type] = v.replace('^', '');
  }
  for (const type of ['webpack', 'typescript']) {
    const v = env['npm_package_devDependencies_' + type];
    if (v) versions[type] = v.replace('^', '');
  }
});