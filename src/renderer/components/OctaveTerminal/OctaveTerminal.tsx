import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGeneralContext } from '../GeneralContext';
import './OctaveTerminal.scss';
// Assuming logo is available here, if not, it will just show the icon
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import appLogo from '../../../../assets/images/logo.png'; 

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

// --- HELPER: Reusable Plot Content (Image + Context Menu + Coordinates) ---
// Extracted this so it can be used by BOTH the Floating Window and the Docked Panel
const PlotContentView: React.FC<{ imageData: string }> = ({ imageData }) => {
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number } | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleCopy = async () => {
        try {
            const response = await fetch(imageData);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            closeContextMenu();
        } catch (err) { console.error(err); }
    };

    const handleSave = () => {
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `Mathex_Plot_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closeContextMenu();
    };

    useEffect(() => {
        const handleClick = () => closeContextMenu();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="plot-content-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden' }}>
            <div className="plot-canvas" style={{ flex: 1, position: 'relative', background: '#ffffff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair' }} onMouseMove={handleMouseMove} onContextMenu={handleContextMenu}>
                <img src={imageData} alt="Plot" draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', pointerEvents: 'none' }} />
            </div>
            {/* Status Footer */}
            <div className="plot-footer-status" style={{ padding: '4px 12px', background: 'var(--app-accent-color)', color: '#fff', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none', flexShrink: 0 }}>
                <span>Ready</span>
                <span>X: {coords.x}px, Y: {coords.y}px</span>
            </div>

            {contextMenu && (
                <div 
                    className="plot-context-menu" 
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="menu-item" onClick={handleCopy}><i className="fi fi-rr-copy"></i> Copy Image</div>
                    <div className="menu-item" onClick={handleSave}><i className="fi fi-rr-download"></i> Save As...</div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: Draggable Floating Window ---
interface PlotWindowProps {
    imageData: string;
    onClose: () => void;
    onDock: () => void; // New Prop for Docking
}

const PlotWindow: React.FC<PlotWindowProps> = ({ imageData, onClose, onDock }) => {
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [size, setSize] = useState({ w: 600, h: 450 });
    
    // Interaction State
    const interactionRef = useRef<{ type: 'drag' | 'resize' | null; startX: number; startY: number; startLeft: number; startTop: number; startWidth: number; startHeight: number; }>
    ({ type: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, startWidth: 0, startHeight: 0 });

    const windowRef = useRef<HTMLDivElement>(null);

    const startDrag = (e: React.MouseEvent) => {
        if (!windowRef.current) return;
        interactionRef.current = { type: 'drag', startX: e.clientX, startY: e.clientY, startLeft: position.x, startTop: position.y, startWidth: size.w, startHeight: size.h };
    };
    const startResize = (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        interactionRef.current = { type: 'resize', startX: e.clientX, startY: e.clientY, startLeft: position.x, startTop: position.y, startWidth: size.w, startHeight: size.h };
    };
    const handleGlobalMouseUp = useCallback(() => { interactionRef.current.type = null; }, []);
    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        const { type, startX, startY, startLeft, startTop, startWidth, startHeight } = interactionRef.current;
        if (type === 'drag') {
            setPosition({ x: startLeft + (e.clientX - startX), y: startTop + (e.clientY - startY) });
        } else if (type === 'resize') {
            setSize({ w: Math.max(300, startWidth + (e.clientX - startX)), h: Math.max(200, startHeight + (e.clientY - startY)) });
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => { window.removeEventListener('mousemove', handleGlobalMouseMove); window.removeEventListener('mouseup', handleGlobalMouseUp); };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    return (
        <div ref={windowRef} className={`floating-plot-window ${interactionRef.current.type ? 'active' : ''}`} style={{ left: position.x, top: position.y, width: size.w, height: size.h }}>
            <div className="plot-header" onMouseDown={startDrag}>
                <div className="title-group">
                    <img src={appLogo} alt="M" className="mathex-logo" onError={(e) => e.currentTarget.style.display='none'} /> 
                    <span>Figure 1</span>
                </div>
                <div className="window-controls">
                    {/* DOCK BUTTON */}
                    <button onClick={onDock} title="Dock to Console"><i className="fi fi-rr-download"></i></button> 
                    <button className="close-btn" onClick={onClose}><i className="fi fi-rr-cross-small"></i></button>
                </div>
            </div>
            
            {/* Reusable Content View */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                 <PlotContentView imageData={imageData} />
            </div>

            <div className="resizer-handle" onMouseDown={startResize} />
        </div>
    );
};

// --- COMPONENT: Docked Panel (Resizable) ---
interface DockedPanelProps {
    imageData: string;
    height: number;
    onUndock: () => void;
    onClose: () => void;
    onResizeStart: (e: React.MouseEvent) => void;
}

const DockedPlotPanel: React.FC<DockedPanelProps> = ({ imageData, height, onUndock, onClose, onResizeStart }) => {
    return (
        <div className="docked-plot-panel" style={{ height: height, flex: 'none', display: 'flex', flexDirection: 'column', borderBottom: '2px solid var(--border-color, #333)', background: '#1e1e1e', position: 'relative', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <div className="dock-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--toolbar-bg, #252526)', borderBottom: '1px solid var(--border-color, #333)' }}>
                <span className="dock-title" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ddd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fi fi-rr-picture" style={{ color: 'var(--app-accent-color)' }}></i> Figure 1 (Docked)
                </span>
                <div className="dock-controls" style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={onUndock} title="Undock" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}><i className="fi fi-rr-arrow-up-right-from-square"></i></button>
                    <button 
                        onClick={onClose} 
                        title="Close" 
                        className="dock-close-btn" // Added class for SCSS hover targeting if needed, but inline style works too
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e81123'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#888'; }}
                    >
                        <i className="fi fi-rr-cross-small"></i>
                    </button>
                </div>
            </div>
            
            <PlotContentView imageData={imageData} />
            
            {/* Vertical Resizer Handle */}
            <div 
                className="dock-resizer" 
                onMouseDown={onResizeStart} 
                style={{ height: '6px', cursor: 'ns-resize', background: 'transparent', width: '100%', position: 'absolute', bottom: 0, zIndex: 10, borderTop: '1px solid transparent', transition: 'border-color 0.2s' }} 
                onMouseEnter={(e) => e.currentTarget.style.borderTopColor = 'var(--app-accent-color)'}
                onMouseLeave={(e) => e.currentTarget.style.borderTopColor = 'transparent'}
            />
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
  const [output, setOutput] = useState<string[]>(['Initializing Console...']);
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
  const [lastPlot, setLastPlot] = useState<string | null>(null);
  
  // --- Docking State ---
  const [isDocked, setIsDocked] = useState(false);
  const [dockHeight, setDockHeight] = useState(400); // Default Dock Height
  const isDockResizing = useRef(false);
  
  const suppressPlots = useRef(false);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('octave-history', JSON.stringify(history));
  }, [history]);

  // --- RESIZING LOGIC (Horizontal & Vertical) ---
  const startResizing = useCallback(() => { isResizing.current = true; }, []);
  const startDockResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); isDockResizing.current = true; }, []);

  const stopResizing = useCallback(() => { 
    isResizing.current = false; 
    isDockResizing.current = false; 
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // 1. Horizontal Editor/Console Split
    if (isResizing.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth > 15 && newWidth < 85) setEditorWidth(newWidth);
    }
    // 2. Vertical Dock/Console Split
    if (isDockResizing.current) {
        setDockHeight(prev => {
            const newHeight = prev + e.movementY;
            // Limit height between 200px and window height minus some buffer
            return Math.max(200, Math.min(newHeight, window.innerHeight - 200));
        });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', stopResizing); };
  }, [handleMouseMove, stopResizing]);

  // =========================================================
  //  THE CORE EXECUTION ENGINE (Matlab-Like Logic)
  // =========================================================
  const executeCode = (code: string, source: 'console' | 'editor') => {
    if (!code.trim()) return;
    suppressPlots.current = false;
    if (/(^|[\s;])clc([\s;]|$)/.test(code)) setOutput([]); 

    let processed = code;
    if (/\bdrawnow\b/.test(processed)) {
        const snapshotCmd = ` __fname__=[tempname() ".png"]; print(gcf, __fname__, "-dpng"); disp(["__PLOT_GENERATED__:" __fname__]); `;
        processed = processed.replace(/\bdrawnow\b/g, snapshotCmd);
    }

    const escaped = JSON.stringify(processed).slice(1, -1);
    const plotKeywords = /(plot|stem|bar|hist|scatter|surf|mesh|contour|imagesc|imshow|polar|loglog|semilogx|semilogy|figure)/i;
    const shouldPlot = plotKeywords.test(code);

    if (source === 'editor') setOutput(prev => [...prev, `\n--- Running: ${scriptName} ---\n`]);
    else setOutput(prev => [...prev, `>> ${code}`]);

    if (shouldPlot) {
        const wrapped = `try; figure('visible', 'off'); eval("${escaped}"); __fname__=[tempname() ".png"]; print(gcf, __fname__, "-dpng"); disp(["__PLOT_GENERATED__:" __fname__]); close(gcf); catch err; disp(['Error: ' err.message]); end`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.api as any).sendOctaveInput(wrapped);
    } else {
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
        setHistoryIndex(newIdx); setInput(history[history.length - 1 - newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx); setInput(history[history.length - 1 - newIdx]);
      } else { setHistoryIndex(-1); setInput(''); }
    } else if (e.key === 'Enter') {
      if (!input.trim()) return;
      setHistory(prev => { const h = [...prev, input]; if (h.length > 50) h.shift(); return h; });
      setHistoryIndex(-1); executeCode(input, 'console'); setInput('');
    }
  };

  const handleRunScript = () => executeCode(script, 'editor');
  
  const handleRestart = () => {
    setOutput((prev) => [...prev, '\n--- Restarting Session... ---\n']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).stopOctave();
    setTimeout(() => { (window.api as any).startOctave(); setTimeout(() => setOutput(['GNU Octave Session Restarted.']), 800); }, 1500);
  };
  
  const handleSaveScript = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = scriptName.endsWith('.m') ? scriptName : `${scriptName}.m`; a.click(); URL.revokeObjectURL(url);
  };
  
  const handleLoadScript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setScriptName(file.name);
    const reader = new FileReader(); reader.onload = (ev) => setScript(ev.target?.result as string || ''); reader.readAsText(file);
  };

  // --- SYSTEM EFFECTS ---
  useEffect(() => { if (isOctaveOpen) (window.api as any).startOctave(); }, [isOctaveOpen]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeListener = (window.api as any).receive('octave-output', async (data: string) => {
      if (data.includes('__PLOT_GENERATED__:')) {
        if (suppressPlots.current) return;
        const match = data.match(/__PLOT_GENERATED__:(.*)/);
        if (match && match[1]) {
          const filePath = match[1].trim();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const base64 = await (window.api as any).readImage(filePath);
          if (base64) { setActivePlot(base64); setLastPlot(base64); }
        }
        return; 
      }
      const cleaned = data.replace(/^>>\s*$/gm, '').trim();
      if (cleaned.length > 0) setOutput(prev => [...prev, cleaned]);
    });
    return () => { if (removeListener) removeListener(); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [output]);

  if (!isOctaveOpen) return null;

  return (
    <div className="octave-fullscreen-overlay">
      
      {/* FLOATING WINDOW: Only if Active AND Not Docked */}
      {activePlot && !isDocked && (
        <PlotWindow 
          imageData={activePlot} 
          onClose={() => { setActivePlot(null); suppressPlots.current = true; }} 
          onDock={() => setIsDocked(true)} 
        />
      )}

      {/* --- Main Terminal Container --- */}
      <div className="matlab-container" ref={containerRef}>

        {/* === LEFT PANE: SCRIPT EDITOR === */}
        {(layoutMode === 'split' || layoutMode === 'editor') && (
          <div className="pane editor-pane" style={{ width: layoutMode === 'editor' ? '100%' : `${editorWidth}%` }}>
            <div className="pane-toolbar">
              <div className="group-left">
                <span className="pane-title"><i className="fi fi-rr-file-code"></i></span>
                <input className="script-name-input" value={scriptName} onChange={e => setScriptName(e.target.value)} placeholder="Script Name" />
              </div>
              <div className="pane-controls">
                <label className="icon-btn" title="Open Script"><i className="fi fi-rr-folder"></i><input type="file" accept=".m,.txt" onChange={handleLoadScript} hidden /></label>
                <button className="icon-btn" onClick={handleSaveScript} title="Save Script"><i className="fi fi-rr-disk"></i></button>
                <div className="divider-v"></div>
                <button onClick={handleRunScript} className="run-btn" title="Run Script"><i className="fi fi-rr-play"></i> Run</button>
                <div className="divider-v"></div>
                {layoutMode === 'split' ?
                  <button className="icon-btn" onClick={() => setLayoutMode('editor')} title="Maximize Editor"><i className="fi fi-rr-expand"></i></button> :
                  <button className="icon-btn" onClick={() => setLayoutMode('split')} title="Split View"><i className="fi fi-rr-compress"></i></button>
                }
              </div>
            </div>
            <div className="editor-area-wrapper">
              <div className="gutter"><LineNumbers lines={script.split('\n').length} scrollRef={editorRef} /></div>
              <textarea ref={editorRef} className="code-editor" value={script} onChange={(e) => setScript(e.target.value)} placeholder="% Write your script here... (e.g., plot(1:10))" spellCheck={false} />
            </div>
            <div className="pane-statusbar"><span>Ln {script.slice(0, script.length).split('\n').length}, Col {script.length}</span><span>UTF-8</span></div>
          </div>
        )}

        {/* === RESIZER HANDLE === */}
        {layoutMode === 'split' && ( <div className="resizer" onMouseDown={startResizing}><div className="handle-bar"></div></div> )}

        {/* === RIGHT PANE: COMMAND WINDOW === */}
        {(layoutMode === 'split' || layoutMode === 'console') && (
          <div className="pane console-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            <div className="pane-toolbar">
              <span className="pane-title"><i className="fi fi-rr-terminal"></i> Console </span>
              <div className="pane-controls">
                <button className="icon-btn" onClick={handleRestart} title="Restart Kernel"><i className="fi fi-rr-refresh"></i></button>
                
                {/* Show Last Plot Button */}
                {lastPlot && (
                  <button 
                    className="icon-btn" 
                    onClick={() => { setActivePlot(lastPlot); }} 
                    title="Show Last Plot"
                    style={{ color: activePlot ? '#fff' : '#aaa' }} 
                  >
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

            {/* --- DOCKED PLOT SECTION --- */}
            {activePlot && isDocked && (
                <DockedPlotPanel 
                    imageData={activePlot} 
                    height={dockHeight}
                    onUndock={() => setIsDocked(false)}
                    onClose={() => { setActivePlot(null); suppressPlots.current = true; }} 
                    onResizeStart={startDockResizing}
                />
            )}

            {/* --- CONSOLE OUTPUT --- */}
            <div className="console-body" onClick={() => consoleInputRef.current?.focus()}>
              {output.map((line, i) => <div key={i} className="line">{line}</div>)}
              <div className="input-area">
                <span className="prompt">&gt;&gt;</span>
                <input ref={consoleInputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleConsoleKeyDown} autoFocus autoComplete="off" />
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