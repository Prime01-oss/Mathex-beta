import React, { useEffect, useRef } from 'react';
import './ContextMenu.scss';
import { useTranslation } from 'react-i18next';

type ContextMenuProps = {
  x: number;
  y: number;
  onArchive: () => void;
  onClose: () => void;
};

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onArchive, onClose }) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Add listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Cleanup
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close menu on 'Escape' key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);


  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling to overlay
    onArchive();
    onClose(); // Close menu after action
  };

  return (
    // The overlay is now invisible but still catches clicks
    <div className='context-menu-overlay' onClick={onClose}>
        <div 
          ref={menuRef} 
          className='context-menu' 
          style={{ top: y, left: x }}
          // Prevent overlay from closing when clicking inside menu
          onClick={(e) => e.stopPropagation()} 
        >
            <button className='context-menu-button' onClick={handleArchiveClick}>
              <i className='fi fi-rr-archive' />
              <span>{t('Archive')}</span>
            </button>
            {/* You can add more buttons here in the future */}
            {/* <button className='context-menu-button delete' onClick={handleDeleteClick}>
              <i className='fi fi-rr-trash' />
              <span>{t('Delete')}</span>
            </button> 
            */}
        </div>
    </div>
  );
};

export default ContextMenu;
