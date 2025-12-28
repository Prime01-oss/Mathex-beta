import { app, BrowserWindow, ipcMain } from 'electron';
import { createAppWindow } from './appWindow';
import fetch from 'node-fetch';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

// --- Interface for System Errors ---
interface SystemError extends Error {
  code?: string;
  syscall?: string;
}

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.on('ready', createAppWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAppWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Existing IPC Handlers ---
ipcMain.on('new-file-request', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.webContents.send('new-file');
});

ipcMain.on('request-notebooks-refresh', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.webContents.send('notebooks-need-refresh');
});

// --- ADVANCED AI HANDLER ---
const SYSTEM_PROMPT = `
You are **MathBuddy**, a professional mathematical engine.
Your goal is to provide perfectly formatted, step-by-step solutions.

### 1. STRICT LATEX RULES
- **NEVER** write two equations on the same line.
- **Inline Math:** Use single $ for variables/short terms (e.g. "Let $x=5$").
- **Block Math:** Use double $$ for ALL main equations.

### 2. MULTI-STEP FORMATTING (CRITICAL)
When solving an equation step-by-step, you **MUST** use the 'aligned' environment inside block math.
Format your steps exactly like this:

$$
\\begin{aligned}
x^2 + 78 &= 234 \\\\
x^2 &= 234 - 78 \\\\
x^2 &= 156 \\\\
x &= \\pm\\sqrt{156}
\\end{aligned}
$$

### 3. RESPONSE STRUCTURE
1. **Goal:** Briefly state what we are finding.
2. **Steps:** Use the aligned block above for the math.
3. **Result:** State the final answer clearly using \\boxed{}.
`;

ipcMain.handle('get-ai-response', async (_event, prompt: string) => {
  const OLLAMA_URL = 'http://localhost:11434/api/generate';
  const MODEL_NAME = 'phi3';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.9 }
      })
    });

    if (!response.ok) throw new Error(`Ollama connection failed: ${response.statusText}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;
    return data.response.trim();

  } catch (error) {
    console.error('Local LLM Error:', error);
    return "Error: Could not connect to Math Buddy. Is Ollama running?";
  }
});

// --- GNU OCTAVE HANDLER ---

let octaveSession: ChildProcessWithoutNullStreams | null = null;

ipcMain.on('start-octave-session', (event) => {
  console.log('[Main] Received request to start Octave session');

  if (event.sender) {
    event.sender.send('octave-output', 'Main Process: Connecting to GNU Octave...');
  }

  if (octaveSession) {
    console.log('[Main] Session already exists.');
    return;
  }

  // YOUR HARDCODED PATH
  const command = '"C:\\Program Files\\GNU Octave\\Octave-10.3.0\\mingw64\\bin\\octave-cli.exe"';
  
  try {
    octaveSession = spawn(command, ['--interactive', '--quiet', '--no-gui'], {
      shell: true
    });

    // --- FIX FOR HELP MENU FREEZING ---
    // This command tells Octave NOT to pause output (pagination off)
    if (octaveSession.stdin) {
        octaveSession.stdin.write("more off\n"); 
    }
    // ----------------------------------

    console.log('[Main] Process spawned. PID:', octaveSession.pid);

    octaveSession.stdout.on('data', (data) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('octave-output', data.toString());
      }
    });

    octaveSession.stderr.on('data', (data) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('octave-output', data.toString());
      }
    });

    octaveSession.on('close', (code) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('octave-output', `\n[Session exited with code ${code}]`);
      }
      octaveSession = null;
    });

    octaveSession.on('error', (err: SystemError) => {
      console.error('[Main] Octave Spawn Error:', err);
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('octave-output', `Error: ${err.message}`);
      }
      octaveSession = null;
    });

  } catch (error) {
    if (event.sender) {
        const err = error as Error;
        event.sender.send('octave-output', `Failed to start: ${err.message}`);
    }
  }
});

ipcMain.on('octave-input', (_event, command) => {
  if (octaveSession) {
    octaveSession.stdin.write(command + '\n');
  }
});

ipcMain.on('stop-octave-session', () => {
  if (octaveSession) {
    console.log('[Main] Killing Octave Session...');
    
    if (process.platform === 'win32') {
        // --- FIX FOR RESTART BUTTON ---
        // Force kill the process tree on Windows using taskkill
        // This ensures no "zombie" octave processes prevent restart
        try {
            spawn('taskkill', ['/pid', octaveSession.pid.toString(), '/f', '/t']);
        } catch (e) {
            console.error("Failed to taskkill:", e);
        }
    } else {
        octaveSession.kill();
    }
    octaveSession = null;
  }
});