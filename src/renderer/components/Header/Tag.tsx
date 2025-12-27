import { useGeneralContext } from '@components/GeneralContext';
import React from 'react';

export type TagProps = {
  text: string;
  color: string;
};

export const Tag = ({ text, color }: TagProps) => {
  // ADD: Import setSaveRequest
  const { setCurrentFileTags, currentFileTags, setSaveRequest } = useGeneralContext();

  const handleRemoveTag = () => {
    const newTags = currentFileTags.filter((tag: string) => tag !== text);
    setCurrentFileTags(newTags);
    
    // CRITICAL FIX: Trigger an immediate save after removing a tag
    setSaveRequest({ cmd: 'save' });
  };

  return (
    <div
      className='tag-pill'
      style={{
        backgroundColor: `hsl(${color}, var(--tag-saturation), var(--tag-lightness))`,
      }}
    >
      <span className='tag-action' onClick={handleRemoveTag}></span>
      <div className='tag-content'>{text}</div>
    </div>
  );
};