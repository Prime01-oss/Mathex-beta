import React, { useState, useRef, useEffect, useCallback } from 'react';
import './PopupCalculator.scss';
import { useGeneralContext } from '@components/GeneralContext';
import * as math from 'mathjs';

const PopupCalculator: React.FC = () => {
  const { setIsCalculatorOpen } = useGeneralContext();
  const [display, setDisplay] = useState('0');
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
  
  const calcRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // --- HANDLER FUNCTIONS ---
  const handleInput = useCallback((value: string) => {
    setDisplay(prev => {
      // Prevent multiple operators or decimals in a row
      const lastChar = prev.slice(-1);
      const isOperator = ['+', '-', '*', '/', '.', '^', '%', '!'].includes(value);
      const lastIsOperator = ['+', '-', '*', '/', '.', '^', '%'].includes(lastChar);

      if (lastIsOperator && isOperator) {
        return prev; // Ignore double operators
      }
      if (prev === '0' || prev === 'Error' || prev === 'NaN') {
        return value;
      }
      return prev + value;
    });
  }, []);

  const handleFunction = useCallback((func: string) => {
    setDisplay(prev => {
      if (prev === '0' || prev === 'Error') return `${func}(`;
      return `${prev}${func}(`;
    });
  }, []);

  const handleCalculate = useCallback(() => {
    setDisplay(prev => {
      if (prev === 'Error' || !prev) return prev;
      try {
        // Create a custom scope to handle Degree/Radian differences and log bases
        const scope: any = {
          log: math.log10, // Standard calculators use log as base 10
          ln: math.log,    // ln is base e
        };

        if (angleMode === 'deg') {
          // Override trig functions to accept degrees
          scope.sin = (x: number) => math.sin(math.unit(x, 'deg'));
          scope.cos = (x: number) => math.cos(math.unit(x, 'deg'));
          scope.tan = (x: number) => math.tan(math.unit(x, 'deg'));
          // Override inverse trig to return degrees
          scope.asin = (x: number) => math.unit(math.asin(x) as unknown as number, 'rad').toNumber('deg');
          scope.acos = (x: number) => math.unit(math.acos(x) as unknown as number, 'rad').toNumber('deg');
          scope.atan = (x: number) => math.unit(math.atan(x) as unknown as number, 'rad').toNumber('deg');
        }

        // Evaluate the expression with the custom scope
        const result = math.evaluate(prev, scope);
        
        // Format result to avoid tiny floating point errors (e.g. sin(180) != 1.2e-16)
        const formatted = math.format(result, { precision: 10 });
        return String(parseFloat(formatted)); // Parse float removes trailing zeros
      } catch (error) {
        return 'Error';
      }
    });
  }, [angleMode]);
  
  const handleClear = useCallback(() => setDisplay('0'), []);
  
  const handleBackspace = useCallback(() => {
    setDisplay(prev => {
      if (prev.length === 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  }, []);

  const toggleAngleMode = () => {
    setAngleMode(prev => prev === 'deg' ? 'rad' : 'deg');
  };

  // --- KEYBOARD SUPPORT ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (/[0-9]/.test(key)) handleInput(key);
      else if (['+', '-', '*', '/', '.', '(', ')', '^', '%', '!'].includes(key)) handleInput(key);
      else if (key === 'Enter' || key === '=') { event.preventDefault(); handleCalculate(); }
      else if (key === 'Backspace') handleBackspace();
      else if (key === 'Escape') setIsCalculatorOpen(false);
      else if (key.toLowerCase() === 'c') handleClear();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, handleCalculate, handleBackspace, handleClear, setIsCalculatorOpen]);

  // --- DRAGGABLE LOGIC ---
  // --- DRAGGABLE LOGIC ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (calcRef.current && (e.target as HTMLElement).closest('.popup-header')) {
      isDragging.current = true;
      
      // 1. Calculate the offset
      offset.current = {
        x: e.clientX - calcRef.current.getBoundingClientRect().left,
        y: e.clientY - calcRef.current.getBoundingClientRect().top,
      };

      // 2. CRITICAL FIX: Unset the bottom/right constraints immediately
      // This prevents the "stretching" effect when 'top' is also set
      calcRef.current.style.bottom = 'auto';
      calcRef.current.style.right = 'auto';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current && calcRef.current) {
      calcRef.current.style.left = `${e.clientX - offset.current.x}px`;
      calcRef.current.style.top = `${e.clientY - offset.current.y}px`;
    }
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- BUTTON CONFIGURATION ---
  const buttons = [
    { label: angleMode.toUpperCase(), value: 'mode', type: 'func mode', action: toggleAngleMode },
    { value: '(', type: 'op' }, { value: ')', type: 'op' }, { value: 'C', type: 'clear', action: handleClear }, { label: '⌫', value: 'back', type: 'clear', action: handleBackspace },
    
    { value: 'sin', type: 'func' }, { value: 'cos', type: 'func' }, { value: 'tan', type: 'func' }, { label: 'π', value: 'pi', type: 'const' }, { value: 'e', type: 'const' },
    
    { label: 'sin⁻¹', value: 'asin', type: 'func' }, { label: 'cos⁻¹', value: 'acos', type: 'func' }, { label: 'tan⁻¹', value: 'atan', type: 'func' }, { label: 'x²', value: '^2', type: 'op' }, { label: '√', value: 'sqrt', type: 'func' },
    
    { label: 'xʸ', value: '^', type: 'op' }, { value: 'log', type: 'func' }, { value: 'ln', type: 'func' }, { label: '10ˣ', value: '10^', type: 'func' }, { value: '!', type: 'op' },
    
    { value: '7', type: 'num' }, { value: '8', type: 'num' }, { value: '9', type: 'num' }, { value: '/', type: 'op' }, { value: '%', type: 'op' },
    
    { value: '4', type: 'num' }, { value: '5', type: 'num' }, { value: '6', type: 'num' }, { value: '*', type: 'op' }, { value: 'abs', type: 'func' },
    
    { value: '1', type: 'num' }, { value: '2', type: 'num' }, { value: '3', type: 'num' }, { value: '-', type: 'op' }, { label: '1/x', value: '1/', type: 'func' },
    
    { value: '0', type: 'num' }, { value: '.', type: 'num' }, { label: 'EXP', value: 'e', type: 'op' }, { value: '+', type: 'op' }, { value: '=', type: 'eq', action: handleCalculate }
  ];

  return (
    <div className="popup-calculator" ref={calcRef} onMouseDown={handleMouseDown}>
      <div className="popup-header">
        <span>Scientific Calculator</span>
        <button className="close-button" onClick={() => setIsCalculatorOpen(false)} onMouseDown={(e) => e.stopPropagation()}>×</button>
      </div>
      <div className="popup-body">
        <div className="calculator-display">{display}</div>
        <div className="calculator-buttons scientific">
          {buttons.map((btn, index) => (
            <button
              key={index}
              className={`calc-button ${btn.type}`}
              onClick={() => btn.action ? btn.action() : btn.type.includes('func') ? handleFunction(btn.value) : handleInput(btn.value)}
            >
              {btn.label || btn.value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PopupCalculator;