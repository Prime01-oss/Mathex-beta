import React from 'react';
import './Application.scss';
import { CommandBar } from './CommandBar/CommandBar';
import FilesSidebar from './FilesSidebar/FilesSidebar';
import { GeneralContextProvider, useGeneralContext } from './GeneralContext';
import Header from './Header/Header';
import Page from './Page/Page';
import ChalkBoard from './ChalkBoard/ChalkBoard';
import ShortcutsModal from './common/Modals/ShortcutsModal';
import PopupCalculator from './PopupCalculator/PopupCalculator';
import PopupChatBot from './PopupChatBot/PopupChatBot'; // <--- 1. ADD THIS IMPORT

const AppContent = () => {
  // <--- 2. ADD isChatBotOpen HERE ---
  const { isChalkBoardOpen, isShortcutsModalOpen, isCalculatorOpen, isChatBotOpen } = useGeneralContext(); 

  return (
    <div id='main-app'>
      {!isChalkBoardOpen && <Header />}

      <div className='workspace'>
        <FilesSidebar />
        <CommandBar />
        <Page />
      </div>

      {/* Conditionally render all overlays */}
      {isChalkBoardOpen && <ChalkBoard />}
      {isShortcutsModalOpen && <ShortcutsModal />}
      {isCalculatorOpen && <PopupCalculator />}
      {isChatBotOpen && <PopupChatBot />} {/* <--- 3. ADD THIS LINE */}
    </div>
  );
};

const Application = () => {
  return (
    <GeneralContextProvider>
      <AppContent />
    </GeneralContextProvider>
  );
};

export default Application;