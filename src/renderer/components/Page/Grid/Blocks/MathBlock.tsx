import React, { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line import/named
import MathView from 'react-math-view';
import ML_SHORTCUTS from '@common/shortcuts';
import ML_KEYBINDINGS from '@common/keybindings';
import { ValueProps } from '@renderer/common/types';

// Helper: specific debounce hook to optimize performance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

function MathBlockContent({ content, blockStateFunction }: ValueProps) {
  const defaultValue = '';
  // Use 'any' for the ref to access Shadow DOM properties safely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  
  const [value, setValue] = useState(content ? content.toString() : defaultValue);

  // Debounce save
  const debouncedSave = useDebounce((newValue: string) => {
    blockStateFunction(newValue);
  }, 500);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    debouncedSave(newValue);
  };

  // Sync with parent changes
  useEffect(() => {
    const incomingValue = content ? content.toString() : defaultValue;
    if (incomingValue !== value) {
      setValue(incomingValue);
    }
    // Dependency on 'value' omitted intentionally to prevent loops
  }, [content]);

  // Configure MathLive: Keyboard Position & Visibility
  useEffect(() => {
    const mathfield = ref.current;
    if (mathfield) {
      // 1. Set options to Manual
      if (mathfield.setOptions) {
        mathfield.setOptions({
          smartMode: true,
          smartFence: true,
          virtualKeyboardMode: 'manual', 
        });
      }

      // 2. Inject CSS into Shadow DOM to fix position and visibility
      if (mathfield.shadowRoot) {
        const styleId = 'custom-keyboard-fix';
        
        // Prevent duplicate style tags
        if (!mathfield.shadowRoot.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
            /* Force Top-Left Position */
            .ML__virtual-keyboard-toggle {
              top: 2px !important;
              left: 2px !important;
              right: auto !important;
              bottom: auto !important;
              position: absolute !important;
              z-index: 50 !important;
              transform: scale(0.8);
            }

            /* STRICT VISIBILITY: Hide toggle if the host (math-field) is not focused */
            :host(:not(:focus-within)) .ML__virtual-keyboard-toggle {
              display: none !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `;
          mathfield.shadowRoot.appendChild(style);
        }
      }
    }
  }, []);

  return (
    <MathView
      ref={ref}
      value={value}
      className='math-field-element'
      inlineShortcuts={ML_SHORTCUTS}
      keybindings={ML_KEYBINDINGS}
      onChange={() => {
        const newValue = ref.current?.getValue() || '';
        handleChange(newValue);
      }}
      onExport={(ref: any, latex: string) => latex}
      plonkSound={null}
      keypressSound={null}
      // Explicitly passing these props if the wrapper supports them
      virtualKeyboardMode='manual'
    />
  );
}

export default MathBlockContent;