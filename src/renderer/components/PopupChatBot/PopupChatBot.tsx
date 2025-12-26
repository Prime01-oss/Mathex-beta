import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import './PopupChatBot.scss';
import { useGeneralContext } from '@components/GeneralContext';

// --- MATH & MARKDOWN IMPORTS ---
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type Message = {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
};

const PopupChatBot: React.FC = () => {
  const { setIsChatBotOpen } = useGeneralContext();
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      text: "Hello! I am your Math Buddy. You can write equations using LaTeX (e.g., $E=mc^2$). How can I help?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const chatLogRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // --- WINDOW STATE (Size & Position) ---
  const [size, setSize] = useState({ width: 450, height: 650 });
  const [position, setPosition] = useState({ x: window.innerWidth - 500, y: window.innerHeight - 700 });

  // Auto-scroll
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // --- DRAGGABLE LOGIC ---
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; initialLeft: number; initialTop: number } | null>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!windowRef.current) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: position.x,
      initialTop: position.y
    };
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragging = (e: MouseEvent) => {
    if (!dragRef.current?.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({ x: dragRef.current.initialLeft + dx, y: dragRef.current.initialTop + dy });
  };

  const handleDragEnd = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // --- RESIZABLE LOGIC ---
  const resizeRef = useRef<{ isResizing: boolean; startX: number; startY: number; initialW: number; initialH: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      initialW: size.width,
      initialH: size.height
    };
    document.addEventListener('mousemove', handleResizing);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizing = (e: MouseEvent) => {
    if (!resizeRef.current?.isResizing) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setSize({
      width: Math.max(350, resizeRef.current.initialW + dx),
      height: Math.max(450, resizeRef.current.initialH + dy)
    });
  };

  const handleResizeEnd = () => {
    if (resizeRef.current) resizeRef.current.isResizing = false;
    document.removeEventListener('mousemove', handleResizing);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // --- SEND MESSAGE ---
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const prompt = currentInput.trim();
    if (!prompt || isLoading) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text: prompt, timestamp }]);
    setCurrentInput('');
    setIsLoading(true);

    try {
      const aiResponseText = await window.api.getAIResponse(prompt);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: aiResponseText, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Error: Could not connect to AI.", timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setIsLoading(false);
    }
  }, [currentInput, isLoading]);

  return (
    <div 
      className="premium-messenger-window" 
      ref={windowRef}
      style={{ width: size.width, height: size.height, left: position.x, top: position.y }}
    >
      {/* HEADER */}
      <div className="messenger-header" onMouseDown={handleDragStart}>
        <div className="header-left">
          <div className="avatar-status">
            <div className="avatar">🤖</div>
            <div className="status-dot"></div>
          </div>
          <div className="info">
            <h3>Math Buddy</h3>
            <span className="subtitle">Always active</span>
          </div>
        </div>
        <button onClick={() => setIsChatBotOpen(false)} className="close-btn">×</button>
      </div>

      {/* CHAT HISTORY */}
      <div className="messenger-body" ref={chatLogRef}>
        <div className="date-separator"><span>Today</span></div>
        
        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.sender}`}>
            {msg.sender === 'ai' && <div className="msg-avatar-small">🤖</div>}
            
            <div className="bubble-wrapper">
              <div className="bubble">
                {/* Renders LaTeX for BOTH User and AI */}
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-row ai">
            <div className="msg-avatar-small">🤖</div>
            <div className="bubble loading">
              <span>•</span><span>•</span><span>•</span>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="messenger-footer">
        <form onSubmit={handleSubmit}>
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Type a math problem (e.g. Solve $x^2 + 2x + 1$)..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button type="submit" disabled={isLoading || !currentInput.trim()}>
            <i className="fi fi-rr-paper-plane"></i>
          </button>
        </form>
        <div className="resize-handle" onMouseDown={handleResizeStart}></div>
      </div>
    </div>
  );
};

export default PopupChatBot;