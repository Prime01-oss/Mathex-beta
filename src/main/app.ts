import { app, BrowserWindow, ipcMain } from 'electron';
import { createAppWindow } from './appWindow';
import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';

interface NotebookItem {
  index: string;
  data: string;
  path: string;
  children: string[];
  isFolder: boolean;
}

/** Handle creating/removing shortcuts on Windows when installing/uninstalling. */
if (require('electron-squirrel-startup')) {
  app.quit();
}

/**
 * On 'ready', create the app window.
 */
app.on('ready', createAppWindow);

/**
 * On 'activate', re-create the window if none are open.
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAppWindow();
  }
});

/**
 * On 'window-all-closed', quit the app (except on macOS).
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Your Existing IPC Handlers ---

ipcMain.on('new-file-request', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send('new-file');
  }
});

ipcMain.handle('get-archived-notebooks', async () => {
  const userDataPath = app.getPath('userData');
  const archivePath = path.join(userDataPath, 'archive');
  await fs.ensureDir(archivePath);

  const items: { [key: string]: NotebookItem } = {
    root: {
      index: 'root',
      data: 'Archived',
      path: archivePath,
      children: [] as string[],
      isFolder: true,
    },
  };

  try {
    const files = await fs.readdir(archivePath);
    for (const file of files) {
      const filePath = path.join(archivePath, file);
      const stats = await fs.stat(filePath);
      const isFolder = stats.isDirectory();
      const fileExt = isFolder ? '' : path.extname(filePath);
      const fileName = path.basename(filePath, fileExt);

      const item = {
        index: filePath,
        data: fileName,
        path: filePath,
        isFolder: isFolder,
        children: [] as string[],
      };

      items[filePath] = item;
      (items.root.children as string[]).push(filePath);
    }
  } catch (error) {
    console.error('Error reading archive directory:', error);
  }

  return { root: items };
});

ipcMain.handle('archive-item', async (event, itemPath) => {
  const userDataPath = app.getPath('userData');
  const archivePath = path.join(userDataPath, 'archive');
  await fs.ensureDir(archivePath);

  const itemName = path.basename(itemPath);
  const newPath = path.join(archivePath, itemName);

  try {
    await fs.move(itemPath, newPath, { overwrite: true });
    return { success: true, path: newPath };
  } catch (error) {
    console.error('Failed to archive item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('archive-notebooks', async (event, pathsToArchive: string[]) => {
  const userDataPath = app.getPath('userData');
  const archivePath = path.join(userDataPath, 'archive');
  await fs.ensureDir(archivePath);
  let successful = 0;
  let failed = 0;

  for (const itemPath of pathsToArchive) {
    const itemName = path.basename(itemPath);
    const newPath = path.join(archivePath, itemName);
    try {
      await fs.move(itemPath, newPath, { overwrite: true });
      successful++;
    } catch (error) {
      console.error(`Failed to archive item: ${itemPath}`, error);
      failed++;
    }
  }
  return { successful, failed };
});

ipcMain.handle('restore-archived-notebooks', async (event, pathsToRestore: string[]) => {
  const userDataPath = app.getPath('userData');
  const notebooksPath = path.join(userDataPath, 'notebooks');
  const archivePath = path.join(userDataPath, 'archive');
  let successful = 0;
  let failed = 0;

  for (const fullPath of pathsToRestore) {
    const relativePath = path.basename(fullPath);
    const sourcePath = path.join(archivePath, relativePath);
    const destinationPath = path.join(notebooksPath, relativePath);

    try {
      await fs.ensureDir(path.dirname(destinationPath));
      await fs.move(sourcePath, destinationPath);
      successful++;
    } catch (err) {
      console.error(`Failed to restore: ${relativePath}`, err);
      failed++;
    }
  }

  return { successful, failed };
});

ipcMain.on('request-notebooks-refresh', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send('notebooks-need-refresh');
  }
});

// --- NEW CHAT BOT HANDLER (USING LOCAL OLLAMA - PHI3) ---

ipcMain.handle('get-ai-response', async (event, prompt: string) => {
  console.log('Main process received prompt:', prompt);

  // 1. Point to your local Ollama instance
  const OLLAMA_URL = 'http://localhost:11434/api/generate';

  // 2. Define the model as 'phi3'
  const MODEL_NAME = 'phi3';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: `You are a helpful math assistant.
                  Format Instructions:
                  1. Use Markdown for text.
                  2. Use LaTeX for ALL math equations.
                  3. Wrap inline math in single dollar signs, e.g., $x^2$.
                  4. Wrap block math in double dollar signs, e.g., $$ \\int x dx $$.
  
  Question: ${prompt}`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama connection failed: ${response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;

    // 3. Ollama returns the text in a 'response' field
    return data.response;

  } catch (error) {
    console.error('Local LLM Error:', error);
    return "Error: Could not connect to Math Buddy. Is Ollama running? (Try running 'ollama serve' in your terminal)";
  }
});