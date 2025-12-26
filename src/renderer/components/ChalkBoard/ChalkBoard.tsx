import React, { useEffect } from 'react';
import './ChalkBoard.scss';
import { useGeneralContext } from '../GeneralContext';
import { Tldraw } from '@tldraw/tldraw'; // Keeping the OLD version

const ChalkBoard: React.FC = () => {
  const { isChalkBoardOpen, setIsChalkBoardOpen } = useGeneralContext();

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isChalkBoardOpen && event.key === 'Escape') {
        setIsChalkBoardOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChalkBoardOpen, setIsChalkBoardOpen]);

  if (!isChalkBoardOpen) return null;

  return (
    <div className='chalk-board-overlay'>
      <div className='draw-container'>
        {/* Version 1 Prop: showUI={true} enables the interface.
            We will use SCSS to hide the parts you don't want. */}
        <Tldraw showUI={true} /> 
      </div>
    </div>
  );
};

export default ChalkBoard;