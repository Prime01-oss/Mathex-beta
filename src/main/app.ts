import { app, BrowserWindow, ipcMain } from 'electron';
import { createAppWindow } from './appWindow';
// [NOTE] fs and path were only used for archiving in this file. 
// You can remove them if no other logic uses them, but I've kept them 
// available just in case you add other file operations later.
import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';

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

// [REMOVED] Archive-related IPC handlers were here.

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