import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { createAppWindow } from './appWindow';
import fetch from 'node-fetch';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import onboardingContent from './Onboarding';

// --- Interface for System Errors ---
interface SystemError extends Error {
  code?: string;
  syscall?: string;
}

// --- NEW INTERFACES TO FIX LINT ERRORS ---
interface NotebookBlock {
  type: string;
  groupTitle?: string;
  [key: string]: unknown; // Allow generic properties
}

interface ArchivedGroup {
  groupName: string;
  subGroups: NotebookBlock[];
}

interface SearchResult {
  filePath: string;
  fileName: string;
  blocks: NotebookBlock[];
}

// Graphics switches
app.commandLine.appendSwitch('use-angle', 'd3d11');
app.commandLine.appendSwitch('enable-webgl');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let appWindow: BrowserWindow;

app.on('ready', () => {
  appWindow = createAppWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    appWindow = createAppWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// 1. ORIGINAL FILE SYSTEM & NOTEBOOK HANDLERS
// ==========================================

ipcMain.on('new-file-request', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.webContents.send('new-file');
});

ipcMain.on('request-notebooks-refresh', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.webContents.send('notebooks-need-refresh');
});

ipcMain.on('getOS', () => {
  let OS = '';
  switch (os.platform()) {
    case "darwin": OS = "mac"; break;
    case "win32": OS = "windows"; break;
    case "linux": OS = "linux"; break;
    default: break;
  }
  if (appWindow) appWindow.webContents.send('gotOS', OS);
});

ipcMain.on('saveX', (event, data, filePath) => {
  const filesPath = path.join(app.getPath('documents'), 'mathex', 'files');
  if (fs.existsSync(filesPath)) {
    fs.writeFileSync(filePath, data, 'utf-8');
  } else {
    fs.mkdirSync(filesPath, { recursive: true });
    fs.writeFileSync(filePath, data, 'utf-8');
  }
  event.sender.send('notebooks-need-refresh');
});

ipcMain.on('loadX', (event, filePath) => {
  if (fs.existsSync(filePath)) {
    fs.readFile(filePath, 'utf-8', (error, data) => {
      error ? console.error('Error Reading file: ', error)
            : appWindow.webContents.send('gotLoadedDataX', data);
    });
  } else {
    console.error('File not found!');
  }
});

ipcMain.on('openFiles', () => {
  shell.openPath(path.join(app.getPath('documents'), 'mathex', 'files')).catch(console.error);
});

ipcMain.on('move', (event, oldDir, newDir) => {
  fs.renameSync(oldDir, newDir);
});

ipcMain.on('delete', (event, path, isFolder) => {
  isFolder ? fs.rmSync(path, { recursive: true, force: true }) : fs.rmSync(path);
});

ipcMain.on('load', (event, file) => {
  fs.readFile(file, 'utf-8', (error, data) => {
    appWindow.webContents.send('fromMain', data);
  });
});

ipcMain.on('newFile', (event, filePath) => {
  fs.writeFileSync(filePath, '{}');
});

ipcMain.on('newFolder', (event, folderPath) => {
  fs.mkdirSync(folderPath);
});

// --- Tree Building Logic ---
let firstTime = true;
interface FileNode {
  index: string; data: string; children: string[]; path: string; isFolder?: boolean; tags?: string[];
}

function buildTree(dir: string, root: Record<string, FileNode>) {
  const stats = fs.statSync(dir);
  let name = path.basename(dir).split('.')[0];
  let key = dir;

  if (firstTime) {
    name = 'root'; key = 'root'; firstTime = false;
  }

  if (!stats.isDirectory()) {
    let tags: string[] = [];
    if (path.extname(dir).toLowerCase() === '.json') {
      try {
        const fileContent = fs.readFileSync(dir, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed.tags)) tags = parsed.tags;
      } catch (error) { /* ignore */ }
    }
    root[key] = { index: key, data: name, children: [], path: dir, isFolder: false, tags: tags };
    return key;
  }

  const children = fs.readdirSync(dir).map((child) => buildTree(path.join(dir, child), root));
  root[key] = { index: key, isFolder: true, data: name, children, path: dir };
  return key;
}

ipcMain.on('getNotebooks', () => {
  const filesPath = path.join(app.getPath('documents'), 'mathex', 'files');
  const welcomeFilePath = path.join(filesPath, "Welcome to mathex!.json");

  if (!fs.existsSync(filesPath)) fs.mkdirSync(filesPath, { recursive: true });
  if (!fs.existsSync(welcomeFilePath)) fs.writeFileSync(welcomeFilePath, JSON.stringify(onboardingContent));

  const root = {};
  firstTime = true; // Reset flag
  buildTree(filesPath, root);
  appWindow.webContents.send('gotNotebooks', { filesPath, root });
});

ipcMain.on('getPicture', (event, id) => {
  const attachPath = path.join(__dirname, '..', 'attachments');
  if (!fs.existsSync(attachPath)) return;
  
  const allPics = fs.readdirSync(attachPath, { withFileTypes: true });
  let b64;
  for (const picture of allPics) {
    if (picture.name.split('.')[0] == id.toString()) {
      const foundPath = path.join(attachPath, picture.name);
      b64 = fs.readFileSync(foundPath, 'base64');
      break;
    }
  }
  appWindow.webContents.send('gotPicture', `data:image/png;base64,${b64}`);
});

ipcMain.on('getArchive', () => {
  const filesPath = path.join(__dirname, '..', 'files');
  if(!fs.existsSync(filesPath)) return;

  // FIX 1: Explicitly typed arrays instead of 'any[]'
  const groupsToFilter: string[] = [];
  const allGroups: NotebookBlock[] = [];
  
  function scan(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (item.name.endsWith('.json')) {
        try {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            if(Array.isArray(content)) {
                content.forEach((block: NotebookBlock) => {
                    if (block.type == 'Group' && block.groupTitle) {
                        allGroups.push(block);
                        groupsToFilter.push(block.groupTitle);
                    }
                });
            }
        } catch(e) { console.error(e); }
      }
    }
  }
  scan(filesPath);

  // FIX 2: Explicit typing in map
  const uniqueGroups: ArchivedGroup[] = [...new Set(groupsToFilter)].map(name => ({ 
    groupName: name, 
    subGroups: [] as NotebookBlock[] 
  }));
  
  uniqueGroups.forEach(g => {
    if (g.groupName !== 'Default') {
        g.subGroups = allGroups.filter(sub => sub.groupTitle === g.groupName);
    }
  });

  appWindow.webContents.send('gotArchive', uniqueGroups.filter(g => g.groupName !== 'Default'));
});

ipcMain.on('startSearch', () => {
  const filesPath = path.join(app.getPath('documents'), 'mathex', 'files');
  if(!fs.existsSync(filesPath)) return;

  // FIX 3: Explicit type for results
  const results: SearchResult[] = [];
  
  function traverse(dir: string) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    list.forEach(item => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) traverse(fullPath);
        else if (item.name.endsWith('.json')) {
            try {
                results.push({
                    filePath: fullPath,
                    fileName: item.name.replace('.json', ''),
                    blocks: JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
                });
            } catch(e) { /* ignore */ }
        }
    });
  }
  traverse(filesPath);
  appWindow.webContents.send('gotAllBlocks', results);
});

// ==========================================
// 2. IMAGE READER FOR PLOTS (REQUIRED)
// ==========================================
ipcMain.handle('read-image-file', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const bitmap = fs.readFileSync(filePath);
      return `data:image/png;base64,${bitmap.toString('base64')}`;
    }
    return null;
  } catch (error) {
    console.error('Failed to read image:', error);
    return null;
  }
});

// ==========================================
// 3. AI HANDLER
// ==========================================
ipcMain.handle('get-ai-response', async (_event, prompt: string) => {
  const OLLAMA_URL = 'http://localhost:11434/api/generate';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        system: "You are MathBuddy. Output pure Latex.",
        prompt: prompt,
        stream: false
      })
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;
    return data.response.trim();
  } catch (error) {
    return "Error: Check Ollama connection.";
  }
});

// ==========================================
// 4. GNU OCTAVE HANDLER (FIXED FOR NATIVE)
// ==========================================

let octaveSession: ChildProcessWithoutNullStreams | null = null;

ipcMain.on('start-octave-session', (event) => {
  console.log('[Main] Starting Octave Session...');

  if (octaveSession) {
    console.log('[Main] Session already exists.');
    return;
  }

  // 1. DEFINE EXACT PATHS
  const octaveBin = 'C:\\Program Files\\GNU Octave\\Octave-10.3.0\\mingw64\\bin';
  const executable = path.join(octaveBin, 'octave-gui.exe');
  
  // Go up from 'bin' -> 'mingw64' -> 'share' -> 'qt5' -> 'plugins'
  const qtPlugins = path.resolve(octaveBin, '..', 'share', 'qt5', 'plugins');

  try {
    // 2. CONFIGURE ENVIRONMENT (The Fix)
    const env = { ...process.env };
    
    // Add bin to PATH so Octave finds DLLs
    env.PATH = `${octaveBin};${env.PATH}`;
    
    // Tell Qt where plugins are (Fixes crash)
    env.QT_PLUGIN_PATH = qtPlugins;
    
    // Force Offscreen (Fixes external window popup)
    // env.QT_QPA_PLATFORM = 'offscreen';

    // 3. SPAWN
    octaveSession = spawn(executable, ['--interactive', '--quiet', '--no-gui'], {
      shell: false,       
      cwd: octaveBin,
      env: env
    });

    if (octaveSession.stdin) {
        octaveSession.stdin.write("more off\n"); 
        octaveSession.stdin.write("PS1('>> ');\n");
        octaveSession.stdin.write("graphics_toolkit('qt');\n");
        octaveSession.stdin.write("set(0, 'defaultfigurevisible', 'off');\n");
    }

    // --- OUTPUT LISTENERS ---
    const sendOutput = (data: Buffer) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('octave-output', data.toString());
      }
    };

    octaveSession.stdout.on('data', sendOutput);
    octaveSession.stderr.on('data', sendOutput);

    octaveSession.on('close', (code) => {
      sendOutput(Buffer.from(`\n[Session exited with code ${code}]`));
      octaveSession = null;
    });

    octaveSession.on('error', (err: SystemError) => {
      console.error('[Main] Spawn Error:', err);
      sendOutput(Buffer.from(`Error: ${err.message}`));
      octaveSession = null;
    });

  } catch (error) {
    const err = error as Error;
    if (event.sender) event.sender.send('octave-output', `Failed to start: ${err.message}`);
  }
});

ipcMain.on('octave-input', (_event, command) => {
  if (octaveSession) {
    octaveSession.stdin.write(command + '\n');
  }
});

ipcMain.on('stop-octave-session', () => {
  if (octaveSession) {
    try {
        spawn('taskkill', ['/pid', octaveSession.pid.toString(), '/f', '/t']);
    } catch (e) {
        octaveSession.kill();
    }
    octaveSession = null;
  }
});