// 1. Asset declarations
declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

// 2. Import necessary types
import { DOMAttributes } from "react";
import { MathfieldElementAttributes } from 'mathlive';

// 3. Define helper types
type CustomElement<T> = Partial<T & DOMAttributes<T>>;

// 4. Global Augmentation
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ["math-field"]: CustomElement<MathfieldElementAttributes>;
    }
  }

  // 5. Define the API Interface
  interface IElectronAPI {
    // --- Core Filesystem Methods (Moved from FileSystem.tsx) ---
    getNotebooks: () => void;
    openFiles: () => void;
    // We use 'any' or 'string | number' for TreeItemIndex to avoid extra imports
    delete: (path: string | number, isFolder?: boolean) => void; 
    move: (oldPath: string, newPath: string) => void;
    newFile: (path: string) => void;
    newFolder: (path: string) => void;
    saveX: (data: string, filePath: string) => void;
    loadX: (filePath: string) => void;

    // --- NEW METHOD ---
    createNewNotebook: () => Promise<string>;

    // --- Octave Methods ---
    startOctave: () => void;
    sendOctaveInput: (cmd: string) => void;
    stopOctave: () => void;
    
    // --- Image Methods ---
    readImage: (path: string) => Promise<string | null>;

    createNewNotebook: () => Promise<string>;

    // --- AI Methods ---
    getAIResponse: (prompt: string) => Promise<string>;
    
    // --- IPC Helpers ---
    send: (channel: string, data?: unknown) => void;
    receive: (channel: string, func: (...args: unknown[]) => void) => (() => void) | undefined;
    onNotebooksRefresh: (callback: () => void) => () => void;

    // --- Dynamic Access (Fallback) ---
  }

  // 6. Attach to Window
  interface Window {
    api: IElectronAPI;
  }
}

// 7. Ensure this is treated as a module
export {};