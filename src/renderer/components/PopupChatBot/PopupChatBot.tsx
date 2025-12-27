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
  attachment?: { name: string; type: string }; // Track attachment metadata
  timestamp: string;
};

const PopupChatBot: React.FC = () => {
  const { setIsChatBotOpen } = useGeneralContext();
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      text: "Hello! I'm your Math Buddy. Upload a file or ask me anything.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  
  // Refs
  const chatLogRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- WINDOW STATE ---
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 650 });

  // Auto-scroll
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isLoading, attachedFile]);

  // --- FILE HANDLING ---
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- SEND LOGIC ---
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if ((!currentInput.trim() && !attachedFile) || isLoading) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let promptToSend = currentInput.trim();
    
    // --- FIX: Explicitly type this variable ---
    let displayAttachment: { name: string; type: string } | undefined;

    // 1. READ FILE CONTENT (If attached)
    if (attachedFile) {
      try {
        const fileContent = await attachedFile.text(); // Read file as text
        promptToSend += `\n\n--- [ANALYZING FILE: ${attachedFile.name}] ---\n${fileContent}\n--- [END FILE] ---`;
        
        displayAttachment = { name: attachedFile.name, type: 'file' };
      } catch (err) {
        console.error("Failed to read file", err);
      }
    }

    // 2. UPDATE UI IMMEDIATELY
    setMessages(prev => [...prev, { 
      sender: 'user', 
      text: currentInput, 
      attachment: displayAttachment,
      timestamp 
    }]);
    
    setCurrentInput('');
    setAttachedFile(null);
    setIsLoading(true);

    // 3. SEND TO AI
    try {
      const aiResponseText = await window.api.getAIResponse(promptToSend);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: aiResponseText, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Error: Connection failed.", timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setIsLoading(false);
    }
  }, [currentInput, attachedFile, isLoading]);

  // --- DRAGGABLE/RESIZABLE LOGIC ---
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; initialLeft: number; initialTop: number } | null>(null);
  const handleDragStart = (e: React.MouseEvent) => {
    if (!windowRef.current) return;
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialLeft: position.x, initialTop: position.y };
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', handleDragEnd);
  };
  const handleDragging = (e: MouseEvent) => {
    if (!dragRef.current?.isDragging) return;
    setPosition({ x: dragRef.current.initialLeft + (e.clientX - dragRef.current.startX), y: dragRef.current.initialTop + (e.clientY - dragRef.current.startY) });
  };
  const handleDragEnd = () => { if (dragRef.current) dragRef.current.isDragging = false; document.removeEventListener('mousemove', handleDragging); document.removeEventListener('mouseup', handleDragEnd); };

  const resizeRef = useRef<{ isResizing: boolean; startX: number; startY: number; initialW: number; initialH: number } | null>(null);
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = { isResizing: true, startX: e.clientX, startY: e.clientY, initialW: size.width, initialH: size.height };
    document.addEventListener('mousemove', handleResizing);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  const handleResizing = (e: MouseEvent) => {
    if (!resizeRef.current?.isResizing) return;
    setSize({ width: Math.max(350, resizeRef.current.initialW + (e.clientX - resizeRef.current.startX)), height: Math.max(450, resizeRef.current.initialH + (e.clientY - resizeRef.current.startY)) });
  };
  const handleResizeEnd = () => { if (resizeRef.current) resizeRef.current.isResizing = false; document.removeEventListener('mousemove', handleResizing); document.removeEventListener('mouseup', handleResizeEnd); };

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
            <span className="subtitle">AI Assistant</span>
          </div>
        </div>
        <button onClick={() => setIsChatBotOpen(false)} className="close-btn">×</button>
      </div>

      {/* CHAT BODY */}
      <div className="messenger-body" ref={chatLogRef}>
        <div className="date-separator"><span>Session Started</span></div>
        
        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.sender}`}>
            {msg.sender === 'ai' && <div className="msg-avatar-small">🤖</div>}
            
            <div className="bubble-wrapper">
              <div className="bubble">
                {/* ATTACHMENT INDICATOR */}
                {msg.attachment && (
                  <div className="attachment-indicator">
                    <i className="fi fi-rr-document"></i>
                    <span>{msg.attachment.name}</span>
                  </div>
                )}
                
                {/* MESSAGE TEXT */}
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
            <div className="bubble loading"><span>•</span><span>•</span><span>•</span></div>
          </div>
        )}
      </div>

      {/* FOOTER INPUT AREA */}
      <div className="messenger-footer">
        
        {/* FILE PILL (Shows when file is attached) */}
        {attachedFile && (
          <div className="file-pill">
            <i className="fi fi-rr-file"></i>
            <span className="filename">{attachedFile.name}</span>
            <button onClick={clearAttachment}><i className="fi fi-rr-cross-small"></i></button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* FILE UPLOAD BUTTON */}
          <button type="button" className="attach-btn" onClick={handleFileClick} title="Upload File">
            <i className="fi fi-rr-clip"></i>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />

          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder={attachedFile ? "Ask about this file..." : "Type a math problem..."}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <button type="submit" className="send-btn" disabled={isLoading || (!currentInput.trim() && !attachedFile)}>
            <i className="fi fi-rr-paper-plane"></i>
          </button>
        </form>
        <div className="resize-handle" onMouseDown={handleResizeStart}></div>
      </div>
    </div>
  );
};

export default PopupChatBot;