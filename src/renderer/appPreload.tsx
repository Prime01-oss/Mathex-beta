import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import titlebarContext from '../../misc/window/titlebarContext'; // Adjusted path

console.log('[ERWT] : Preload execution started');

// This is the single, unified API object for your entire application.
const api = {
  // --- Functions from misc/window/windowPreload.ts ---
  titlebar: titlebarContext,
  send: (channel: string, data: string) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = [
      'gotLoadedDataX', 'Home', 'Picture', 'gotAllPictures', 'gotPicture',
      'Shortcuts', 'gotAllBlocks', 'openArchive', 'gotPageStyle', 'gotUserTheme',
      'gotArchive', 'gotUserColor', 'gotOS', 'openFiles', 'newFile', 'Save',
      'fromMain', 'Text', 'Graph', 'Math', 'Group', 'gotNotebooks',
      'toggleNotebooks', 'Search',
    ];
    if (validChannels.includes(channel)) {
      // 1. Create a named reference to the wrapper function
      // Using IpcRendererEvent instead of 'any' fixes the lint error
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);

      // 2. Add the listener
      ipcRenderer.on(channel, subscription);

      // 3. RETURN A CLEANUP FUNCTION
      // This allows the React component to call removeListener() later
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
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
  maximize: () => ipcRenderer.send('maximize'),
  unmaximize: () => ipcRenderer.send('unmaximize'),
  minimize: () => ipcRenderer.send('minimize'),
  close: () => ipcRenderer.send('close'),
  setUserColor: (color: string) => ipcRenderer.send('setUserColor', color),
  setPageStyle: (style: string) => ipcRenderer.send('setPageStyle', style),
  toggle: () => ipcRenderer.send('dark-mode'),
  getUserColor: () => ipcRenderer.send('getUserColor'),
  getPageStyle: () => ipcRenderer.send('getPageStyle'),
  getUserTheme: () => ipcRenderer.send('getUserTheme'),
  getPicture: (id: string) => ipcRenderer.send('getPicture', id),
  getAllPictures: (path: string) => ipcRenderer.send('getAllPictures', path),
  getArchive: () => ipcRenderer.send('getArchive'),
  startSearch: () => ipcRenderer.send('startSearch'),

  // --- Functions from the original appPreload.tsx and our new additions ---
  getArchivedNotebooks: () => ipcRenderer.invoke('get-archived-notebooks'),
  archiveItem: (itemPath: string) => ipcRenderer.invoke('archive-item', itemPath),

  // ✅ NEW FUNCTION FOR MULTI-ARCHIVE
  archiveNotebooks: (paths: string[]) => ipcRenderer.invoke('archive-notebooks', paths),

  restoreArchivedNotebooks: (paths: string[]) => ipcRenderer.invoke('restore-archived-notebooks', paths),
  requestNotebooksRefresh: () => ipcRenderer.send('request-notebooks-refresh'),
  onNotebooksRefresh: (callback: () => void) => {
    ipcRenderer.on('notebooks-need-refresh', callback);
    return () => {
      ipcRenderer.removeListener('notebooks-need-refresh', callback);
    };
  },

  // <--- ADD THIS FUNCTION FOR THE CHAT BOT ---
  getAIResponse: (prompt: string) => ipcRenderer.invoke('get-ai-response', prompt)
};

// Securely expose the single 'api' object to the renderer process
contextBridge.exposeInMainWorld('api', api);


// --- This part remains for version info ---
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