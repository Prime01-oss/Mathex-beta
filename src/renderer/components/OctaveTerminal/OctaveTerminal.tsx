import React, { useEffect, useState, useRef } from 'react';
import { useGeneralContext } from '../GeneralContext';
import './OctaveTerminal.scss';

const OctaveTerminal: React.FC = () => {
  const { isOctaveOpen, setIsOctaveOpen } = useGeneralContext();
  const [output, setOutput] = useState<string[]>(['Initializing GNU Octave Interface...']);
  const [input, setInput] = useState('');
  
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('octave-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('octave-history', JSON.stringify(history));
  }, [history]);

  // --- ACTIONS WITH STOP PROPAGATION ---

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation(); // CRITICAL: Stop the click from reaching the background
    setOutput((prev) => [...prev, '\n--- Restarting Session... ---\n']);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).stopOctave();

    setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.api as any).startOctave();
        setTimeout(() => {
            setOutput(['GNU Octave Session Restarted.']);
            setHistoryIndex(-1);
        }, 800);
    }, 1500); 
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOutput(['--- Console Cleared ---']);
  };

  const handleHelp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).sendOctaveInput('help');
    setOutput((prev) => [...prev, 'Fetching documentation...']);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOctaveOpen(false);
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (isOctaveOpen) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.api as any).startOctave();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOctaveOpen]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeListener = (window.api as any).receive('octave-output', (data: string) => {
      setOutput(prev => [...prev, data]);
    });
    return () => { if(removeListener) removeListener(); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
    else if (e.key === 'Enter') {
      if(input.trim().toLowerCase() === 'exit') {
        setIsOctaveOpen(false);
        return;
      }
      if(input.trim().toLowerCase() === 'clc' || input.trim().toLowerCase() === 'clear') {
         setOutput(['--- Console Cleared ---']);
         setInput('');
         return;
      }
      
      if (input.trim()) {
        setHistory(prev => {
            const newHistory = [...prev, input];
            if (newHistory.length > 50) newHistory.shift(); 
            return newHistory;
        });
        setHistoryIndex(-1);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.api as any).sendOctaveInput(input);
      setOutput(prev => [...prev, `octave:> ${input}`]);
      setInput('');
    }
  };

  if (!isOctaveOpen) return null;

  return (
    <div className="octave-fullscreen-overlay">
      <div className="terminal-window">
        {/* Toolbar */}
        <div className="terminal-toolbar">
          <div className="title">
            <i className="fi fi-rr-display-code"></i> 
            GNU Octave
          </div>
          <div className="controls">
            <button onClick={handleHelp} title="Show Help">
                <i className="fi fi-rr-interrogation"></i> Help
            </button>
            <button onClick={handleRestart} title="Restart Session">
                <i className="fi fi-rr-refresh"></i> Restart
            </button>
            <button onClick={handleClear} title="Clear Screen">
                <i className="fi fi-rr-broom"></i> Clear
            </button>
            <button className="danger" onClick={handleClose} title="Close">
                <i className="fi fi-rr-cross-small"></i>
            </button>
          </div>
        </div>

        {/* Console Body */}
        <div className="console-body" onClick={() => inputRef.current?.focus()}>
          {output.map((line, i) => (
            <div key={i} className="line">{line}</div>
          ))}
          <div className="input-area">
            <span className="prompt">octave:&gt;</span>
            <input 
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              autoComplete="off"
            />
          </div>
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};

export default OctaveTerminal;