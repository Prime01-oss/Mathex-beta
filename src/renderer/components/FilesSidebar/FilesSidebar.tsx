import React from 'react';
import './FilesSidebar.scss';
import SidebarButton from './SidebarButton';
import FileSystem from './FileSystem';
import { useKBar } from 'kbar';
import { useGeneralContext } from '../GeneralContext';
import { useTranslation } from 'react-i18next';

const FilesSidebar: React.FC = () => {
  const { t } = useTranslation();
  const { query } = useKBar();
  const {
    isFilesSidebarOpen,
    setIsFilesSidebarOpen,
    setIsChalkBoardOpen,
    setIsShortcutsModalOpen,
    setIsCalculatorOpen,
    setIsChatBotOpen, // <--- 1. ADD THIS LINE
  } = useGeneralContext();

  return (
    <div className={`files-sidebar${isFilesSidebarOpen ? ' open' : ''}`}>
      <div className='basic'>
        <section id='top'>
          <SidebarButton
            title={t('My Notebooks')}
            buttonType='files'
            state={isFilesSidebarOpen}
            icon='notebook'
            onClick={() => setIsFilesSidebarOpen((prev: boolean) => !prev)}
          />
          <SidebarButton
            title={t('Command Bar')}
            buttonType='search'
            icon='terminal'
            onClick={() => query.toggle()}
          />
          <SidebarButton
            title={t('Shortcuts')}
            buttonType='menu'
            icon='question'
            onClick={() => setIsShortcutsModalOpen(true)}
          />
          <SidebarButton
            title={t('Chalk-Board')}
            buttonType='page'
            icon='pen'
            onClick={() => setIsChalkBoardOpen(true)}
          />
        </section>

        <section id='bottom'>
          <SidebarButton
            title={t('Calculator')}
            buttonType='mathPanel'
            icon='calculator'
            onClick={() => setIsCalculatorOpen((prev: boolean) => !prev)}
          />

          {/* <--- 2. ADD THIS NEW BUTTON --- */}
          <SidebarButton
            title={t('Math Buddy')}
            buttonType='chatBot'
            icon='brain' //
            onClick={() => setIsChatBotOpen((prev: boolean) => !prev)}
          />

        </section>
      </div>

      {isFilesSidebarOpen && (
        <section className='extension'>
          <FileSystem />
        </section>
      )}
    </div>
  );
};

export default FilesSidebar;