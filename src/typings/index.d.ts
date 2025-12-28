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
  // We explicitly list the new methods here so TypeScript finds them.
  interface IElectronAPI {
    // Octave Methods
    startOctave: () => void;
    sendOctaveInput: (cmd: string) => void;
    stopOctave: () => void;

    // Core Methods (Typing 'receive' safely)
    receive: (channel: string, func: (...args: unknown[]) => void) => (() => void);

    // Allow other existing methods dynamically (disabling lint rule for this line)
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