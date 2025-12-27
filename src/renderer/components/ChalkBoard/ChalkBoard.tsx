import React, { useEffect, useRef, useState, useCallback } from 'react';
import './ChalkBoard.scss';
import { useGeneralContext } from '../GeneralContext';

// --- PREMIUM SVG ASSETS ---

const CompassIcon = () => (
  <svg width="40" height="60" viewBox="0 0 70 100" fill="none" style={{ filter: 'drop-shadow(0px 3px 3px rgba(0,0,0,0.4))' }}>
    <defs>
      <linearGradient id="steelGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#78909c"/><stop offset="50%" stopColor="#cfd8dc"/><stop offset="100%" stopColor="#546e7a"/></linearGradient>
      <linearGradient id="brassGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffb300"/><stop offset="50%" stopColor="#ffe57f"/><stop offset="100%" stopColor="#ff6f00"/></linearGradient>
    </defs>
    <path d="M35 15 L55 85" stroke="url(#steelGrad)" strokeWidth="6" strokeLinecap="round"/>
    <path d="M55 85 L58 95" stroke="#1976d2" strokeWidth="4" strokeLinecap="round"/> 
    <path d="M35 15 L15 85" stroke="url(#steelGrad)" strokeWidth="6" strokeLinecap="round"/>
    <path d="M15 85 L15 95" stroke="#263238" strokeWidth="2"/>
    <circle cx="35" cy="15" r="8" fill="url(#brassGrad)" stroke="#3e2723" strokeWidth="1"/>
    <path d="M25 50 Q 35 55 45 50" stroke="#b0bec5" strokeWidth="3" fill="none"/>
  </svg>
);

const HandIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }}>
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a9 9 0 0 1 3.24-14.22" />
  </svg>
);

const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const PullTabIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
);

// --- CONSTANTS ---
const PERSISTENCE_KEY = 'mathex_chalkboard_premium_v4';

const CHALK_PALETTE = [
  { id: 'white',  hex: '#f5f5f5', glow: 'rgba(255,255,255,0.4)', name: 'White' },
  { id: 'yellow', hex: '#fff59d', glow: 'rgba(255,245,157,0.4)', name: 'Yellow' },
  { id: 'red',    hex: '#ef9a9a', glow: 'rgba(239,154,154,0.4)', name: 'Red' },
  { id: 'blue',   hex: '#90caf9', glow: 'rgba(144,202,249,0.4)', name: 'Blue' },
  { id: 'orange', hex: '#ffcc80', glow: 'rgba(255,204,128,0.4)', name: 'Orange' },
];

const BOARD_THEMES = [
  { id: 'green', name: 'Slate Green', bg: '#2f4f2f' },
  { id: 'black', name: 'Obsidian', bg: '#212121' },
];

type ToolType = 'pen' | 'eraser' | 'ruler' | 'compass' | 'pan';
type Point = { x: number; y: number };

interface StrokeBase { tool: ToolType; color: string; width: number; }
interface PathStroke extends StrokeBase { type: 'path'; points: Point[]; }
interface LineStroke extends StrokeBase { type: 'line'; start: Point; end: Point; }
interface CircleStroke extends StrokeBase { type: 'circle'; cx: number; cy: number; r: number; }
type Stroke = PathStroke | LineStroke | CircleStroke;

interface SavedData {
    strokes: Stroke[];
    transform: { scale: number; offsetX: number; offsetY: number };
    activeTool: ToolType;
    activeColor: string;
    theme: string;
}

const ChalkBoard: React.FC = () => {
  const { isChalkBoardOpen, setIsChalkBoardOpen } = useGeneralContext();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engine State
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPos = useRef<Point | null>(null);
  const startPos = useRef<Point | null>(null);
  const transform = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const historyRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  
  // UI State
  const [activeColor, setActiveColor] = useState<string>(CHALK_PALETTE[0].hex);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [boardTheme, setBoardTheme] = useState<string>('green');
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- INIT & PERSISTENCE ---
  
  // Load state on mount
  useEffect(() => {
    if (isChalkBoardOpen) {
      createChalkTexture();
      // Delay slightly to ensure container has size
      setTimeout(() => { 
          resizeCanvas(); 
          loadState(); 
      }, 50);
    }
  }, [isChalkBoardOpen]);

  // Save state on unmount/close
  useEffect(() => {
      return () => {
          if (isChalkBoardOpen) saveState();
      };
  }, [isChalkBoardOpen, activeTool, activeColor, boardTheme]);

  useEffect(() => {
    const handleResize = () => { resizeCanvas(); redrawCanvas(); };
    window.addEventListener('resize', handleResize);
    const handleKeys = (e: KeyboardEvent) => {
        if (!isChalkBoardOpen) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeys);
    };
  }, [isChalkBoardOpen]);

  const createChalkTexture = () => {
      const size = 64;
      const cvs = document.createElement('canvas');
      cvs.width = size; cvs.height = size;
      const ctx = cvs.getContext('2d');
      if (ctx) {
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,size,size);
          const imgData = ctx.getImageData(0,0,size,size);
          for(let i=0; i < imgData.data.length; i+=4) imgData.data[i+3] = Math.random() * 100 + 50; 
          ctx.putImageData(imgData, 0, 0);
          textureCanvasRef.current = cvs;
      }
  };

  const resizeCanvas = () => {
    if (canvasRef.current && containerRef.current) {
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${rect.height}px`;
    }
  };

  const saveState = () => {
      const data: SavedData = {
          strokes: historyRef.current,
          transform: transform.current,
          activeTool,
          activeColor,
          theme: boardTheme
      };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(data));
  };

  const loadState = () => {
      const s = localStorage.getItem(PERSISTENCE_KEY);
      if (s) {
          try {
              const data = JSON.parse(s);
              // Handle legacy array format if exists
              if (Array.isArray(data)) {
                  historyRef.current = data;
              } else {
                  // New object format
                  if (data.strokes) historyRef.current = data.strokes;
                  if (data.transform) transform.current = data.transform;
                  if (data.activeTool) setActiveTool(data.activeTool);
                  if (data.activeColor) setActiveColor(data.activeColor);
                  if (data.theme) setBoardTheme(data.theme);
              }
              redrawCanvas();
          } catch (e) {
              console.error("Failed to load chalkboard state", e);
          }
      }
  };

  const clearBoard = () => { 
      if(confirm("Erase all content?")) { 
          historyRef.current = []; 
          redoStackRef.current = []; 
          redrawCanvas(); 
          saveState(); 
      } 
  };

  // --- DRAWING ENGINE ---
  
  const setContextTransform = (ctx: CanvasRenderingContext2D) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0); 
      ctx.scale(dpr, dpr); 
      ctx.translate(transform.current.offsetX, transform.current.offsetY); 
      ctx.scale(transform.current.scale, transform.current.scale); 
  };

  const toWorld = (sx: number, sy: number) => ({
    x: (sx - transform.current.offsetX) / transform.current.scale,
    y: (sy - transform.current.offsetY) / transform.current.scale,
  });

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let cx, cy;
    if ('touches' in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; } 
    else { cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY; }
    return { x: cx - rect.left, y: cy - rect.top };
  };

  const redrawCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setContextTransform(ctx);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    historyRef.current.forEach(st => {
      ctx.beginPath();
      if (st.tool === 'pen') {
          ctx.strokeStyle = st.color;
          ctx.shadowBlur = 0.5;
          ctx.shadowColor = st.color;
      } else {
          ctx.strokeStyle = st.color;
          ctx.shadowBlur = 0;
      }
      ctx.lineWidth = st.width;
      ctx.globalCompositeOperation = st.tool === 'eraser' ? 'destination-out' : 'source-over';
      
      if (st.type === 'path') {
        if (st.points.length > 2) {
            ctx.moveTo(st.points[0].x, st.points[0].y);
            for (let i = 1; i < st.points.length - 2; i++) {
                const midX = (st.points[i].x + st.points[i+1].x) / 2;
                const midY = (st.points[i].y + st.points[i+1].y) / 2;
                ctx.quadraticCurveTo(st.points[i].x, st.points[i].y, midX, midY);
            }
            const i = st.points.length - 2;
            ctx.quadraticCurveTo(st.points[i].x, st.points[i].y, st.points[i+1].x, st.points[i+1].y);
        } else if (st.points.length > 0) {
             ctx.moveTo(st.points[0].x, st.points[0].y);
             st.points.forEach(p => ctx.lineTo(p.x, p.y));
        }
      } else if (st.type === 'line') {
        ctx.moveTo(st.start.x, st.start.y); ctx.lineTo(st.end.x, st.end.y);
      } else if (st.type === 'circle') {
        ctx.arc(st.cx, st.cy, st.r, 0, 2 * Math.PI);
      }
      ctx.stroke();
    });
  };

  const undo = () => { const i = historyRef.current.pop(); if(i){ redoStackRef.current.push(i); redrawCanvas(); saveState(); }};
  const redo = () => { const i = redoStackRef.current.pop(); if(i){ historyRef.current.push(i); redrawCanvas(); saveState(); }};

  // --- HANDLERS ---
  
  const startDraw = (e: React.MouseEvent) => {
    if (e.button === 1 || activeTool === 'pan') {
      isPanning.current = true;
      lastPos.current = getPointerPos(e);
      return;
    }
    const pos = getPointerPos(e);
    const worldPos = toWorld(pos.x, pos.y);
    isDrawing.current = true;
    startPos.current = worldPos;
    redoStackRef.current = [];

    if (activeTool === 'pen' || activeTool === 'eraser') {
      const newStroke: PathStroke = {
        type: 'path', tool: activeTool, color: activeColor,
        width: activeTool === 'eraser' ? 50 : 3, points: [worldPos]
      };
      historyRef.current.push(newStroke);
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
         ctx.save();
         setContextTransform(ctx);
         ctx.beginPath();
         ctx.lineCap = 'round';
         ctx.lineWidth = newStroke.width;
         ctx.strokeStyle = activeColor;
         ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
         ctx.moveTo(worldPos.x, worldPos.y);
         ctx.lineTo(worldPos.x, worldPos.y);
         ctx.stroke();
         ctx.restore();
      }
    }
  };

  const moveDraw = (e: React.MouseEvent) => {
    const pos = getPointerPos(e);
    
    if (isPanning.current && lastPos.current) {
      transform.current.offsetX += pos.x - lastPos.current.x;
      transform.current.offsetY += pos.y - lastPos.current.y;
      lastPos.current = pos;
      redrawCanvas();
      return;
    }

    if (!isDrawing.current) return;
    const worldPos = toWorld(pos.x, pos.y);

    if (activeTool === 'pen' || activeTool === 'eraser') {
      const stroke = historyRef.current[historyRef.current.length - 1] as PathStroke;
      if (stroke.type === 'path') {
        stroke.points.push(worldPos);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.save();
            setContextTransform(ctx);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = stroke.width;
            ctx.strokeStyle = activeColor;
            ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
            
            ctx.beginPath();
            const prev = stroke.points[stroke.points.length-2];
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(worldPos.x, worldPos.y);
            ctx.stroke();
            ctx.restore();
        }
      }
    } else {
      redrawCanvas();
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && startPos.current) {
        ctx.save();
        setContextTransform(ctx);
        ctx.beginPath();
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); 

        if (activeTool === 'ruler') {
          ctx.moveTo(startPos.current.x, startPos.current.y);
          ctx.lineTo(worldPos.x, worldPos.y);
        } else if (activeTool === 'compass') {
          const r = Math.sqrt(Math.pow(worldPos.x - startPos.current.x, 2) + Math.pow(worldPos.y - startPos.current.y, 2));
          ctx.arc(startPos.current.x, startPos.current.y, r, 0, 2 * Math.PI);
          ctx.moveTo(startPos.current.x, startPos.current.y);
          ctx.lineTo(worldPos.x, worldPos.y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const endDraw = (e: React.MouseEvent) => {
    if (isPanning.current) isPanning.current = false;
    if (isDrawing.current) {
      isDrawing.current = false;
      const worldPos = toWorld(getPointerPos(e).x, getPointerPos(e).y);
      
      if (activeTool === 'ruler' && startPos.current) {
        historyRef.current.push({ type: 'line', tool: 'ruler', color: activeColor, width: 3, start: startPos.current, end: worldPos });
      } else if (activeTool === 'compass' && startPos.current) {
        const r = Math.sqrt(Math.pow(worldPos.x - startPos.current.x, 2) + Math.pow(worldPos.y - startPos.current.y, 2));
        historyRef.current.push({ type: 'circle', tool: 'compass', color: activeColor, width: 3, cx: startPos.current.x, cy: startPos.current.y, r: r });
      }
      saveState();
      redrawCanvas();
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isChalkBoardOpen) return;
    const scaleAmt = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.5, transform.current.scale + scaleAmt), 3);
    const pos = getPointerPos(e as unknown as React.MouseEvent);
    const worldPos = toWorld(pos.x, pos.y);
    transform.current.scale = newScale;
    transform.current.offsetX = pos.x - worldPos.x * newScale;
    transform.current.offsetY = pos.y - worldPos.y * newScale;
    redrawCanvas();
    // We don't save constantly on zoom, but on close/unmount
  }, [isChalkBoardOpen]);

  if (!isChalkBoardOpen) return null;

  return (
    <div className='chalk-board-overlay' onWheel={handleWheel}>
      <div className={`board-frame theme-${boardTheme}`} ref={containerRef}>
        
        {/* Top Controls */}
        <div className='wood-bezel-controls'>
           {BOARD_THEMES.map(t => (
             <button key={t.id} className={`wood-peg ${boardTheme === t.id ? 'active' : ''}`}
               style={{ backgroundColor: t.bg }} onClick={() => setBoardTheme(t.id)} title={t.name} />
           ))}
        </div>

        <canvas ref={canvasRef} className={`board-canvas tool-${activeTool} ${isPanning.current ? 'grabbing' : ''}`}
          onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw} />

        {/* DRAWER ZONE */}
        <div 
            className='tray-trigger-zone' 
            onMouseEnter={() => setDrawerOpen(true)} 
            onMouseLeave={() => setDrawerOpen(false)}
        >
            {/* The Hint Tab */}
            <div className={`drawer-hint ${drawerOpen ? 'hidden' : ''}`}>
                <PullTabIcon />
                <span className='hint-text'>TOOLS</span>
            </div>

            {/* The Tray */}
            <div className='premium-tray'>
                {hoveredTool && <div className='tray-tooltip'>{hoveredTool}</div>}

                <div className='tray-section chalks'>
                    {CHALK_PALETTE.map((c) => (
                    <div key={c.name} className={`chalk-cylinder ${activeColor === c.hex && activeTool!=='eraser' ? 'picked' : ''}`}
                        onClick={() => { setActiveColor(c.hex); setActiveTool('pen'); }}
                        onMouseEnter={() => setHoveredTool(c.name)} onMouseLeave={() => setHoveredTool(null)}>
                        <div className='chalk-top' style={{ backgroundColor: c.hex }} />
                        <div className='chalk-side' style={{ backgroundColor: c.hex, boxShadow: `0 0 5px ${c.glow}` }} />
                    </div>
                    ))}
                </div>

                <div className='divider-brass' />

                <div className='tray-section tools'>
                    <button className={`tool-heavy ruler ${activeTool === 'ruler' ? 'active' : ''}`}
                        onClick={() => setActiveTool('ruler')} onMouseEnter={() => setHoveredTool("Ruler")} onMouseLeave={() => setHoveredTool(null)}>
                        <div className='ruler-metallic-face'><div className='markings'/></div>
                    </button>
                    <button className={`tool-heavy compass ${activeTool === 'compass' ? 'active' : ''}`}
                        onClick={() => setActiveTool('compass')} onMouseEnter={() => setHoveredTool("Compass")} onMouseLeave={() => setHoveredTool(null)}>
                        <CompassIcon />
                    </button>
                    <button className={`tool-heavy pan ${activeTool === 'pan' ? 'active' : ''}`}
                        onClick={() => setActiveTool('pan')} onMouseEnter={() => setHoveredTool("Pan / Move")} onMouseLeave={() => setHoveredTool(null)}>
                        <div className='icon-holder'><HandIcon /></div>
                    </button>
                </div>

                <div className='divider-brass' />

                <div className='tray-section cleaning'>
                    <button className={`tool-heavy duster ${activeTool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setActiveTool('eraser')} onMouseEnter={() => setHoveredTool("Felt Eraser")} onMouseLeave={() => setHoveredTool(null)}>
                        <div className='handle-oak'><div className='grain'/></div>
                        <div className='felt-pad'/>
                    </button>
                    <button className='tool-heavy sponge' onClick={clearBoard} onMouseEnter={() => setHoveredTool("Wash All")} onMouseLeave={() => setHoveredTool(null)}>
                        <div className='sponge-material'><div className='hole h1'/><div className='hole h2'/><div className='hole h3'/></div>
                    </button>
                </div>

                <div className='divider-brass' />

                <button className='tool-heavy close-block' onClick={() => setIsChalkBoardOpen(false)} onMouseEnter={() => setHoveredTool("Close")} onMouseLeave={() => setHoveredTool(null)}>
                    <CloseIcon />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ChalkBoard;