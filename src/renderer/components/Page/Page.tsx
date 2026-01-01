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
  // 1. Get all necessary context setters
  const { 
    selectedFile, 
    setSelectedFile, 
    setSaveRequest, 
    setIsFilesSidebarOpen // <--- Needed to open the sidebar
  } = useGeneralContext();

  const [currentFilePath, setCurrentFilePath] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentFilePath(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 0;
      setTimeout(() => {
        if (gridRef.current) gridRef.current.scrollTop = 0;
      }, 50);
    }
  }, [currentFilePath]);

  // --- GLOBAL KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Ctrl+S (Save)
      if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setSaveRequest({ cmd: 'save' });
      }

      // --- NEW: Ctrl+N (Global Create) ---
      if (event.key === 'n' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); // Stop "New Window"

        // 1. Open the Sidebar
        setIsFilesSidebarOpen(true);

        // 2. Request Main Process to create a unique file
        const newFilePath = await window.api.createNewNotebook();

        // 3. If successful, open it in the editor
        if (newFilePath) {
            setSelectedFile(newFilePath);
        }
      }
      // -----------------------------------

      // Ctrl+O (Open)
      if (event.key === 'o' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        // Open sidebar if closed, or just trigger open dialog
        setIsFilesSidebarOpen(true); 
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
  }, [selectedFile, setSaveRequest, setIsFilesSidebarOpen, setSelectedFile]); 

  return (
    <div className='page' style={gridStyle}>
      {currentFilePath ? (
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