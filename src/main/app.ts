import { app, BrowserWindow, ipcMain } from 'electron';
import { createAppWindow } from './appWindow';
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

ipcMain.on('request-notebooks-refresh', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send('notebooks-need-refresh');
  }
});

// --- ADVANCED AI HANDLER ---

// 1. Define the "Brain" of the AI. 
// This instructs the model exactly how to behave, format, and think.
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

**Do not** write "x^2 = 234 - 78 x^2 = 156". That is forbidden. Every step gets a new line.

### 3. RESPONSE STRUCTURE
1. **Goal:** Briefly state what we are finding.
2. **Steps:** Use the aligned block above for the math.
3. **Result:** State the final answer clearly using \\boxed{}.

### EXAMPLE
User: "Solve x + 5 = 10"
You:
To solve for $x$, we subtract 5 from both sides:
$$
\\begin{aligned}
x + 5 &= 10 \\\\
x &= 10 - 5 \\\\
x &= 5
\\end{aligned}
$$
Final Answer:
$$ \\boxed{x = 5} $$
`;
ipcMain.handle('get-ai-response', async (_event, prompt: string) => {
  console.log('Main process received prompt:', prompt);

  const OLLAMA_URL = 'http://localhost:11434/api/generate';
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
        system: SYSTEM_PROMPT, 
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, 
          top_p: 0.9,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama connection failed: ${response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;
    
    // CHANGED: Use const instead of let
    const cleanResponse = data.response.trim();
    
    return cleanResponse;

  } catch (error) {
    console.error('Local LLM Error:', error);
    return "Error: Could not connect to Math Buddy. Is Ollama running? (Try running 'ollama serve' in your terminal)";
  }
});