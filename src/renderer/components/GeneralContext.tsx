import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { newWidgetRequest } from '@renderer/common/types';
import i18n from '@common/i18n';
import { Action, KBarProvider } from 'kbar';

// ... (staticActions array is here) ...
const staticActions: Action[] = [
  { id: 'preferences', name: 'Preferences' },
  { id: 'language', name: 'Language', parent: 'preferences' },
  { id: 'theme', name: 'Theme', parent: 'preferences' },
  { id: 'color', name: 'Color', parent: 'preferences' },
  { id: 'english', name: 'English', parent: 'language' },
  { id: 'hindi', name: 'Hindi', parent: 'language' },
  { id: 'blue', name: 'Blue', parent: 'color' },
  { id: 'pink', name: 'Pink', parent: 'color' },
  { id: 'yellow', name: 'Yellow', parent: 'color' },
  { id: 'purple', name: 'Purple', parent: 'color' },
  { id: 'red', name: 'Red', parent: 'color' },
  { id: 'green', name: 'Green', parent: 'color' },
  { id: 'black', name: 'Black', parent: 'color' },
  { id: 'light', name: 'Light', parent: 'theme' },
  { id: 'dark', name: 'Dark', parent: 'theme' },
];

const GeneralContext = createContext(null);

function GeneralContextProvider({ children }: PropsWithChildren) {
  const getDefaultLang = () => localStorage.getItem('language') || 'en';

  const [saveRequest, setSaveRequest] = useState({ cmd: '' });
  const [clearPageRequest, setClearPageRequest] = useState({ cmd: '' });
  const [newWidgetRequest, setNewWidgetRequest] = useState<newWidgetRequest>();
  const [selectedFile, setSelectedFile] = useState<string>();
  const [currentFileTags, setCurrentFileTags] = useState<string[]>([]);
  const [isFilesSidebarOpen, setIsFilesSidebarOpen] = useState(false);
  const [isMathSidebarOpen, setIsMathSidebarOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isChalkBoardOpen, setIsChalkBoardOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isChatBotOpen, setIsChatBotOpen] = useState(false); // <--- 1. ADD THIS LINE
  const [isRtl, setIsRtl] = useState(true);
  const [language, setLanguage] = useState(getDefaultLang());
  const [currentOS, setCurrentOS] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [darkTheme, setDarkTheme] = useState(() => {
    const savedTheme = localStorage.getItem('dark-mode');
    return savedTheme ? savedTheme === '1' : true;
  });

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('color') || 'blue';
  });

  // ... (setColor, setLang, isRtlLang, setTheme functions are here) ...
  const setColor = (name: string, hue?: number) => {
    localStorage.setItem('color', name);
    setColorTheme(name); // Sync React state

    const rootStyle = document.documentElement.style;

    if (name === 'black') {
      rootStyle.removeProperty('--theme-hue');
      rootStyle.setProperty('--theme-saturation', '0%');
      rootStyle.setProperty('--theme-lightness-offset', '-35%'); 
    } else {
      rootStyle.setProperty('--theme-hue', hue.toString());
      rootStyle.removeProperty('--theme-saturation');
      rootStyle.removeProperty('--theme-lightness-offset');
    }
  };
    
  const setLang = (language: string) => {
    i18n.changeLanguage(language);
    setLanguage(language);
    localStorage.setItem('language', language);
    const isRtl = isRtlLang(language);
    setIsRtl(isRtl);
    document.querySelector('#main-app').classList.toggle('rtl', isRtl);
  };

  const isRtlLang = (language: string) => {
    const rtlLanguages = ['he', 'ar', 'ur'];
    return rtlLanguages.includes(language);
  };

  const setTheme = (theme: number) => {
    localStorage.setItem('dark-mode', theme.toString());
    const isDark = theme === 1;
    setDarkTheme(isDark);
    document.body.classList.toggle('dark-mode', isDark);
  };

  // ... (dynamicActions mapping is here) ...
  const dynamicActions = staticActions.map(action => {
    const translatedAction = { ...action, name: i18n.t(action.name) };
    switch (action.id) {
      case 'english': return { ...translatedAction, perform: () => setLang('en') };
      case 'hindi': return { ...translatedAction, perform: () => setLang('hi') };
      case 'blue': return { ...translatedAction, perform: () => setColor('blue', 210) };
      case 'pink': return { ...translatedAction, perform: () => setColor('pink', 300) };
      case 'yellow': return { ...translatedAction, perform: () => setColor('yellow', 35) };
      case 'purple': return { ...translatedAction, perform: () => setColor('purple', 250) };
      case 'red': return { ...translatedAction, perform: () => setColor('red', 0) };
      case 'green': return { ...translatedAction, perform: () => setColor('green', 140) };
      case 'black': return { ...translatedAction, perform: () => setColor('black') };
      case 'light': return { ...translatedAction, perform: () => setTheme(0) };
      case 'dark': return { ...translatedAction, perform: () => setTheme(1) };
      default: return translatedAction;
    }
  });

  // ... (useEffect hooks are here) ...
  useEffect(() => {
    setTheme(darkTheme ? 1 : 0);
    setLang(language);
    const colorMap: { [key: string]: number | undefined } = {
      blue: 210, pink: 300, yellow: 35, purple: 250, red: 0, green: 140, black: undefined,
    };
    setColor(colorTheme, colorMap[colorTheme]);
  }, []); 

  useEffect(() => {
    window.api.getOS();
    window.api.receive('gotOS', (data: string) => {
      setCurrentOS(data);
    });
  }, []);

  return (
    <GeneralContext.Provider
      value={{
        newWidgetRequest, setNewWidgetRequest,
        clearPageRequest, setClearPageRequest,
        selectedFile, setSelectedFile,
        saveRequest, setSaveRequest,
        currentFileTags, setCurrentFileTags,
        isMathSidebarOpen, setIsMathSidebarOpen,
        isFilesSidebarOpen, setIsFilesSidebarOpen,
        isRtl, setIsRtl,
        language, setLang,
        darkTheme, setTheme,
        colorTheme, setColor,
        actions: dynamicActions,
        currentOS,
        isShortcutsModalOpen, setIsShortcutsModalOpen,
        isChalkBoardOpen, setIsChalkBoardOpen,
        isCalculatorOpen, setIsCalculatorOpen,
        isArchiveModalOpen, setIsArchiveModalOpen,
        isChatBotOpen, setIsChatBotOpen, // <--- 2. ADD THIS LINE
        searchQuery, setSearchQuery,
      }}
    >
      <KBarProvider
        actions={dynamicActions}
        options={{ toggleShortcut: '$mod+Shift+p' }}
      >
        {children}
      </KBarProvider>
    </GeneralContext.Provider>
  );
}

function useGeneralContext() {
  const context = useContext(GeneralContext);
  if (context === undefined) {
    throw new Error('useGeneralContext must be used within a GeneralContextProvider');
  }
  return context;
}

export { GeneralContextProvider, useGeneralContext };