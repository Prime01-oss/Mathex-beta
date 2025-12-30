import React, { useState, useEffect, useRef } from 'react';
import { ValueProps } from '@renderer/common/types';

interface MediaState {
  src: string;
  type: 'youtube' | 'image' | 'video' | 'pdf' | 'unknown';
  name?: string;
}

function MediaBlockContent({ content, blockStateFunction }: ValueProps) {
  // Parse content if it exists
  const initialState: MediaState | null = content 
    ? (typeof content === 'string' ? JSON.parse(content) : content) 
    : null;

  const [media, setMedia] = useState<MediaState | null>(initialState);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with parent
  useEffect(() => {
    if (media) {
      blockStateFunction(JSON.stringify(media));
    }
  }, [media]);

  // --- Logic: Detect Media Type ---
  const detectType = (url: string, fileType?: string): MediaState['type'] => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (fileType?.startsWith('image/') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return 'image';
    if (fileType?.startsWith('video/') || url.match(/\.(mp4|webm|ogg)$/i)) return 'video';
    if (fileType === 'application/pdf' || url.match(/\.pdf$/i)) return 'pdf';
    return 'unknown';
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) 
      ? `https://www.youtube.com/embed/${match[2]}` 
      : url;
  };

  // --- Handlers ---
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;
    
    const type = detectType(inputValue);
    const finalSrc = type === 'youtube' ? getYoutubeEmbedUrl(inputValue) : inputValue;
    setMedia({ src: finalSrc, type });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      const type = detectType(file.name, file.type);
      setMedia({ src: objectUrl, type, name: file.name });
    }
  };

  const clearMedia = () => {
    setMedia(null);
    setInputValue('');
  };

  // --- Render ---
  if (!media) {
    return (
      <div className="media-block-placeholder">
        <div className="media-input-container">
          <i className="fi fi-rr-clip icon-placeholder"></i>
          <h3>Embed Media</h3>
          
          <form onSubmit={handleUrlSubmit} className="url-form">
            <input 
              type="text" 
              placeholder="Paste YouTube, Image, or PDF URL..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="media-url-input"
            />
            <button type="submit" className="media-btn primary">Embed</button>
          </form>

          <div className="divider-text">OR</div>

          <button 
            className="media-btn secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="fi fi-rr-folder"></i>
            <span>Browse File</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            hidden 
            accept="image/*,video/*,application/pdf"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="media-block-content">
      <div className="media-controls">
        <button onClick={clearMedia} className="edit-media-btn" title="Change Media">
            <i className="fi fi-rr-refresh"></i> Change Media
        </button>
      </div>

      {media.type === 'youtube' && (
        <iframe 
          src={media.src} 
          title="YouTube video player" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
          className="media-iframe"
        />
      )}

      {media.type === 'image' && (
        <img src={media.src} alt={media.name || 'Embedded Image'} className="media-img" />
      )}

      {media.type === 'video' && (
        <video src={media.src} controls className="media-video" />
      )}

      {media.type === 'pdf' && (
        <iframe src={media.src} className="media-iframe pdf-view" title="PDF Viewer" />
      )}

      {media.type === 'unknown' && (
        <div className="media-error">
          <i className="fi fi-rr-exclamation"></i>
          <p>Unsupported media type</p>
          <a href={media.src} target="_blank" rel="noreferrer">Open Link</a>
        </div>
      )}
    </div>
  );
}

export default MediaBlockContent;