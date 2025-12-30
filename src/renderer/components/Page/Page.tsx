import React, { useEffect, useState, useRef } from 'react';
import '../Application.scss';
import './Page.scss';
import ToolsPanel from './ToolsPanel/ToolsPanel';
import './ToolsPanel/ToolsPanel.scss';
import { useGeneralContext } from '@components/GeneralContext';
import PagePlaceholder from './PagePlaceholder';
import PageGrid from './Grid/Grid';

const gridStyle = {
  width: '100%',
  height: '100%',
  backgroundImage:
    'radial-gradient(circle at 50% 100%, var(--tool-hover-bgcolor) 1px, transparent 1px)',
  backgroundSize: '50px 50px',
  color: 'white',
};

const Page = () => {
  const { selectedFile, setSaveRequest } = useGeneralContext();
  const [currentFilePath, setCurrentFilePath] = useState('');
  
  // Ref for the scrollable Grid container
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentFilePath(selectedFile);
  }, [selectedFile]);

  // Safety Measure: Explicitly reset scroll when file changes
  useEffect(() => {
    if (gridRef.current) {
      // Immediate reset
      gridRef.current.scrollTop = 0;
      
      // Secondary reset to handle any async layout shifts
      setTimeout(() => {
        if (gridRef.current) gridRef.current.scrollTop = 0;
      }, 50);
    }
  }, [currentFilePath]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S (Save)
      if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setSaveRequest({ cmd: 'save' });
      }

      // Ctrl+O (Open)
      if (event.key === 'o' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (selectedFile) {
          window.api.send('new-file-request');
        } else {
          window.api.send('open-folder'); 
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFile, setSaveRequest]); 

  return (
    <div className='page' style={gridStyle}>
      {currentFilePath ? (
        // --- THE FIX ---
        // 1. key={currentFilePath}: Forces React to destroy the old div and create a new one. 
        //    This guarantees a fresh scrollbar starting at 0.
        // 2. ref={gridRef}: Allows us to programmatically ensure it stays at 0.
        <div 
          className='page-grid' 
          ref={gridRef} 
          key={currentFilePath}
        >
          <PageGrid />
          <ToolsPanel />
        </div>
      ) : (
        <PagePlaceholder />
      )}
    </div>
  );
};

export default Page;