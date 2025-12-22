import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import './PopupChatBot.scss';
import { useGeneralContext } from '@components/GeneralContext';

// Define the structure for a message
type Message = {
  sender: 'user' | 'ai';
  text: string;
};

const PopupChatBot: React.FC = () => {
  const { setIsChatBotOpen } = useGeneralContext();
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Hi Samar! Need help with math?" }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  // --- Draggable Logic (Unchanged) ---
  const chatBotRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (chatBotRef.current) {
      isDragging.current = true;
      offset.current = {
        x: e.clientX - chatBotRef.current.getBoundingClientRect().left,
        y: e.clientY - chatBotRef.current.getBoundingClientRect().top,
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current && chatBotRef.current) {
      chatBotRef.current.style.left = `${e.clientX - offset.current.x}px`;
      chatBotRef.current.style.top = `${e.clientY - offset.current.y}px`;
      chatBotRef.current.style.bottom = 'auto';
      chatBotRef.current.style.right = 'auto';
    }
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  // --- End Draggable Logic ---

  // Scroll to bottom when new messages appear
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle the form submission
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const prompt = currentInput.trim();
    if (!prompt || isLoading) return;

    // Add user message to chat
    setMessages(prev => [...prev, { sender: 'user', text: prompt }]);
    setCurrentInput('');
    setIsLoading(true);

    try {
      // --- THIS IS THE FIX ---
      // Call the function we defined in appPreload.tsx
      const aiResponseText = await window.api.getAIResponse(prompt);
      
      // Add AI response to chat
      setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [currentInput, isLoading]);

  return (
    <div className="popup-chat-bot" ref={chatBotRef}>
      <div className="popup-header" onMouseDown={handleMouseDown}>
       <div className="profile-container"> {/* Or keep your existing container */}
  <span className="emoji-highlight">🤖</span> {/* Emoji wrapped in its own span */}
  <span> Math Buddy</span>
</div>
        <button className="close-button" onClick={() => setIsChatBotOpen(false)}>×</button>
      </div>
      <div className="popup-body">
        <div className="chat-bot-interface">
          <div className="chat-log" ref={chatLogRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {/* We will add a markdown parser here later to render math */}
                <p>{msg.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>
          <form className="chat-input-form" onSubmit={handleSubmit}>
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Ask a math question..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button type="submit" data-tooltip="Send" disabled={isLoading}>
              <i className="fi fi-rr-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PopupChatBot;