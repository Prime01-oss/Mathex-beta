import React from 'react';
import './Header.scss';

type FilePathProps = { filePath: string };

const FilePath = ({ filePath }: FilePathProps) => {
  // Use new RegExp to avoid ESLint 'no-useless-escape' error.
  // Matches either forward slash / or backslash \
  // We use '\\\\' to represent a single literal backslash in the string passed to RegExp
  const resolvedFilePath = filePath
    ? filePath.split(new RegExp('[\\\\/]'))
    : [''];
  
  const folderPath = resolvedFilePath.slice(resolvedFilePath.length - 2)[0];
  // Added safe access (|| '') to prevent potential crash if array is empty
  const fileName = (resolvedFilePath.pop() || '').replace('.json', '');

  return (
    <div className='filepath'>
      <span className={`filepath-folder${folderPath == 'files' || fileName == '' ? ' hide': ''}`}>
        {folderPath == 'files' || fileName == '' ? '' : `${folderPath} /`}
      </span>
      <span className='filepath-name'>{fileName}</span>
    </div>
  );
};

export default FilePath;