import React, { useEffect, useState } from 'react';
import '../Application.scss';
import { icons } from '../Icons';
import FilePath from './FilePath';
import { Tag, TagProps } from './Tag';
import AddTag from './AddTag';
import WindowControls from '@misc/window/components/WindowControls';
import { useGeneralContext } from '@components/GeneralContext';

const Header = () => {
  // FIX: Default to empty array if null to prevent crash
  const allTags = JSON.parse(localStorage.getItem('all-tags') || '[]');
  
  const { selectedFile, currentFileTags, setCurrentFileTags, currentOS } = useGeneralContext();
  const [currentFilePath, setCurrentFilePath] = useState('');

  useEffect(() => {
    setCurrentFilePath(selectedFile);
    // Tags are cleared here, but useFileSaveLoad will repopulate them when the file loads
    setCurrentFileTags([]);
  }, [selectedFile]);

  return (
    <div className='header'>
      <div className='main-heading'>
        <section className='header-content'>
          <div className="header-left">
            <div className='logo'>
              <img src={icons.logo} id='logo' alt='mathex' />
            </div>
            <FilePath filePath={currentFilePath} />
          </div>

          <div className="header-center">
            {/* Search removed */}
          </div>

          <div className="header-right">
            <div className='tags'>
              {currentFileTags && Array.isArray(currentFileTags)
                ? currentFileTags.map((tag: string) => {
                    // FIX: Robust lookup
                    const foundTag = allTags.find(
                      (searchTag: TagProps) => searchTag.text === tag,
                    );
                    
                    // FIX: Fallback if tag definition is missing (prevents crash)
                    if (!foundTag) {
                        return (
                             <Tag
                                key={`tag-${tag}`}
                                text={tag}
                                color={'0'} // Default Red
                              />
                        )
                    }

                    return (
                      <Tag
                        key={`tag-${foundTag.text}`}
                        text={foundTag.text}
                        color={foundTag.color}
                      />
                    );
                  })
                : null}
              {currentFilePath ? <AddTag /> : <></>}
            </div>
          </div>
        </section>
        <section className='header-draggable'></section>
        <section className='header-controls'>
          <WindowControls platform={currentOS}></WindowControls>
        </section>
      </div>
    </div>
  );
};

export default Header;