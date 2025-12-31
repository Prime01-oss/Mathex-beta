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
    // --- Octave Methods ---
    startOctave: () => void;
    sendOctaveInput: (cmd: string) => void;
    stopOctave: () => void;
    
    // --- Image Methods (FIXED: Added this) ---
    readImage: (path: string) => Promise<string | null>;

    // --- AI Methods (Optional, good to have) ---
    getAIResponse: (prompt: string) => Promise<string>;

    // --- Core Methods ---
    receive: (channel: string, func: (...args: unknown[]) => void) => (() => void);

    // --- Dynamic Access (Fallback) ---
    // This allows you to call any other method (like getNotebooks) without errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  // 6. Attach to Window
  interface Window {
    api: IElectronAPI;
  }
}

// 7. Ensure this is treated as a module
export {};