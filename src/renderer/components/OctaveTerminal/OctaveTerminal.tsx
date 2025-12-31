import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGeneralContext } from '../GeneralContext';
import './OctaveTerminal.scss';

// --- Helper: Line Numbers ---
const LineNumbers: React.FC<{ lines: number; scrollRef: React.RefObject<HTMLTextAreaElement> }> = ({ lines, scrollRef }) => {
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  return (
    <div className="line-numbers" style={{ transform: `translateY(-${scrollTop}px)` }}>
      {Array.from({ length: Math.max(lines, 1) }).map((_, i) => (
        <div key={i} className="ln">{i + 1}</div>
      ))}
    </div>
  );
};

// --- Helper: Plot Modal ---
const PlotModal: React.FC<{ imageData: string; onClose: () => void }> = ({ imageData, onClose }) => {
  return (
    <div className="plot-modal-overlay" onClick={onClose}>
      <div className="plot-window" onClick={e => e.stopPropagation()}>
        <div className="plot-header">
          <span><i className="fi fi-rr-picture"></i> Generated Plot</span>
          <button onClick={onClose}><i className="fi fi-rr-cross-small"></i></button>
        </div>
        <div className="plot-content">
          <img src={imageData} alt="Octave Plot" />
        </div>
        <div className="plot-footer">
          <small>Right-click image to copy or save.</small>
        </div>
      </div>
    </div>
  );
};

const OctaveTerminal: React.FC = () => {
  const { isOctaveOpen, setIsOctaveOpen } = useGeneralContext();

  // --- Layout State ---
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'console'>('split');
  const [editorWidth, setEditorWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // --- Console State ---
  const [output, setOutput] = useState<string[]>(['Initializing GNU Octave Interface...']);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('octave-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);

  // --- Editor State ---
  const [script, setScript] = useState('');
  const [scriptName, setScriptName] = useState('Untitled.m');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // --- Plot State ---
  const [activePlot, setActivePlot] = useState<string | null>(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('octave-history', JSON.stringify(history));
  }, [history]);

  // --- RESIZING LOGIC ---
  const startResizing = useCallback(() => { isResizing.current = true; }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newWidth > 15 && newWidth < 85) setEditorWidth(newWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  // =========================================================
  //  THE CORE EXECUTION ENGINE (Matlab-Like Logic)
  // =========================================================
  const executeCode = (code: string, source: 'console' | 'editor') => {
    if (!code.trim()) return;

    // 1. Handle 'clc' (Clear Screen)
    // If the code contains 'clc', we clear the React console immediately.
    // This mimics Matlab clearing the window before running the rest.
    if (/(^|[\s;])clc([\s;]|$)/.test(code)) {
        setOutput([]); 
    }

    // 2. Animation Support ("Flipbook" Mode)
    // We look for 'drawnow' and replace it with a command that:
    //  a) Saves a unique image file (tempname)
    //  b) Sends the path to React
    // This allows animations to play live without crashing.
    let processed = code;
    if (/\bdrawnow\b/.test(processed)) {
        const snapshotCmd = ` __fname__=[tempname() ".png"]; print(gcf, __fname__, "-dpng"); disp(["__PLOT_GENERATED__:" __fname__]); `;
        processed = processed.replace(/\bdrawnow\b/g, snapshotCmd);
    }

    // 3. SAFE ESCAPING (The Fix for Syntax Errors)
    // Instead of stripping comments manually (which broke your strings), 
    // we use JSON.stringify. This handles quotes, newlines, and backslashes perfectly.
    // We slice(1, -1) to remove the outer quotes added by stringify.
    const escaped = JSON.stringify(processed).slice(1, -1);

    // 4. Smart Plot Detection
    const plotKeywords = /(plot|stem|bar|hist|scatter|surf|mesh|contour|imagesc|imshow|polar|loglog|semilogx|semilogy|figure)/i;
    const shouldPlot = plotKeywords.test(code);

    // 5. UI Feedback
    if (source === 'editor') {
        setOutput(prev => [...prev, `\n--- Running: ${scriptName} ---\n`]);
    } else {
        setOutput(prev => [...prev, `>> ${code}`]);
    }

    if (shouldPlot) {
        // === PLOT WRAPPER ===
        // 1. Create invisible figure
        // 2. Eval user code (Preseves loops, logic, variables)
        // 3. Save final frame (if not animated)
        // 4. Close figure (using gcf to handle 'clear' commands safely)
        const wrapped = `try; figure('visible', 'off'); eval("${escaped}"); __fname__=[tempname() ".png"]; print(gcf, __fname__, "-dpng"); disp(["__PLOT_GENERATED__:" __fname__]); close(gcf); catch err; disp(['Error: ' err.message]); end`;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.api as any).sendOctaveInput(wrapped);
    } else {
        // === STANDARD WRAPPER ===
        // We just eval() the escaped string.
        // This sends the ENTIRE script as ONE line.
        // Result: Octave executes it all at once. No ">" arrows. No wasted space.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.api as any).sendOctaveInput(`eval("${escaped}")`);
    }
  };

  // --- CONSOLE INPUT HANDLER ---
  const handleConsoleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIdx);
        setInput(history[history.length - 1 - newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setInput(history[history.length - 1 - newIdx]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Enter') {
      if (!input.trim()) return;

      setHistory(prev => {
        const h = [...prev, input];
        if (h.length > 50) h.shift();
        return h;
      });
      setHistoryIndex(-1);

      executeCode(input, 'console');
      setInput('');
    }
  };

  // --- RUN BUTTON ---
  const handleRunScript = () => {
    executeCode(script, 'editor');
  };

  const handleRestart = () => {
    setOutput((prev) => [...prev, '\n--- Restarting Session... ---\n']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).stopOctave();
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.api as any).startOctave();
      setTimeout(() => setOutput(['GNU Octave Session Restarted.']), 800);
    }, 1500);
  };

  const handleSaveScript = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scriptName.endsWith('.m') ? scriptName : `${scriptName}.m`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadScript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScriptName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setScript(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  // --- SYSTEM EFFECTS ---
  useEffect(() => {
    if (isOctaveOpen) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.api as any).startOctave();
    }
  }, [isOctaveOpen]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeListener = (window.api as any).receive('octave-output', async (data: string) => {

      // 1. Intercept Plot Signal
      if (data.includes('__PLOT_GENERATED__:')) {
        const match = data.match(/__PLOT_GENERATED__:(.*)/);
        if (match && match[1]) {
          const filePath = match[1].trim();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const base64 = await (window.api as any).readImage(filePath);
          if (base64) setActivePlot(base64);
        }
        return; // Suppress signal text
      }

      // 2. Output Cleaning (The "Wasted Space" Fix)
      // Removes ">>" prompts and empty lines, but preserves errors and results.
      const cleaned = data
        .replace(/^>>\s*$/gm, '')
        .trim();

      if (cleaned.length > 0) {
        setOutput(prev => [...prev, cleaned]);
      }
    });
    return () => { if (removeListener) removeListener(); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  if (!isOctaveOpen) return null;

  return (
    <div className="octave-fullscreen-overlay">
      {/* PLOT MODAL */}
      {activePlot && <PlotModal imageData={activePlot} onClose={() => setActivePlot(null)} />}

      <div className="matlab-container" ref={containerRef}>

        {/* === LEFT PANE: SCRIPT EDITOR === */}
        {(layoutMode === 'split' || layoutMode === 'editor') && (
          <div className="pane editor-pane" style={{ width: layoutMode === 'editor' ? '100%' : `${editorWidth}%` }}>
            <div className="pane-toolbar">
              <div className="group-left">
                <span className="pane-title"><i className="fi fi-rr-file-code"></i></span>
                <input
                  className="script-name-input"
                  value={scriptName}
                  onChange={e => setScriptName(e.target.value)}
                  placeholder="Script Name"
                />
              </div>
              <div className="pane-controls">
                <label className="icon-btn" title="Open Script">
                  <i className="fi fi-rr-folder"></i>
                  <input type="file" accept=".m,.txt" onChange={handleLoadScript} hidden />
                </label>
                <button className="icon-btn" onClick={handleSaveScript} title="Save Script"><i className="fi fi-rr-disk"></i></button>
                <div className="divider-v"></div>

                <button onClick={handleRunScript} className="run-btn" title="Run Script">
                  <i className="fi fi-rr-play"></i> Run
                </button>

                <div className="divider-v"></div>
                {layoutMode === 'split' ?
                  <button className="icon-btn" onClick={() => setLayoutMode('editor')} title="Maximize Editor"><i className="fi fi-rr-expand"></i></button> :
                  <button className="icon-btn" onClick={() => setLayoutMode('split')} title="Split View"><i className="fi fi-rr-compress"></i></button>
                }
              </div>
            </div>
            <div className="editor-area-wrapper">
              <div className="gutter">
                <LineNumbers lines={script.split('\n').length} scrollRef={editorRef} />
              </div>
              <textarea
                ref={editorRef}
                className="code-editor"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="% Write your script here... (e.g., plot(1:10))"
                spellCheck={false}
              />
            </div>
            <div className="pane-statusbar">
              <span>Ln {script.slice(0, script.length).split('\n').length}, Col {script.length}</span>
              <span>UTF-8</span>
            </div>
          </div>
        )}

        {/* === RESIZER HANDLE === */}
        {layoutMode === 'split' && (
          <div className="resizer" onMouseDown={startResizing}>
            <div className="handle-bar"></div>
          </div>
        )}

        {/* === RIGHT PANE: COMMAND WINDOW === */}
        {(layoutMode === 'split' || layoutMode === 'console') && (
          <div className="pane console-pane" style={{ flex: 1 }}>
            <div className="pane-toolbar">
              <span className="pane-title"><i className="fi fi-rr-terminal"></i> Command Window</span>
              <div className="pane-controls">
                <button className="icon-btn" onClick={handleRestart} title="Restart Kernel">
                  <i className="fi fi-rr-refresh"></i>
                </button>
                {activePlot && (
                  <button className="icon-btn" onClick={() => setActivePlot(activePlot)} title="Show Last Plot">
                    <i className="fi fi-rr-picture"></i>
                  </button>
                )}
                {layoutMode === 'split' ?
                  <button className="icon-btn" onClick={() => setLayoutMode('console')} title="Maximize Console"><i className="fi fi-rr-expand"></i></button> :
                  <button className="icon-btn" onClick={() => setLayoutMode('split')} title="Split View"><i className="fi fi-rr-compress"></i></button>
                }
                <button className="icon-btn" onClick={() => setOutput(['--- Cleared ---'])} title="Clear Output"><i className="fi fi-rr-broom"></i></button>
                <button className="danger icon-btn" onClick={() => setIsOctaveOpen(false)} title="Close"><i className="fi fi-rr-cross-small"></i></button>
              </div>
            </div>

            <div className="console-body" onClick={() => consoleInputRef.current?.focus()}>
              {output.map((line, i) => (
                <div key={i} className="line">{line}</div>
              ))}
              <div className="input-area">
                <span className="prompt">&gt;&gt;</span>
                <input
                  ref={consoleInputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleConsoleKeyDown}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <div ref={endRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OctaveTerminal;