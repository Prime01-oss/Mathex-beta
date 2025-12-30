import { Mafs, Coordinates, Plot, Theme } from 'mafs';
import React, { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line import/named
import MathView, { MathViewRef } from 'react-math-view';
import { parseTex } from 'tex-math-parser';
import ML_SHORTCUTS from '@common/shortcuts';
import ML_KEYBINDINGS from '@common/keybindings';
import { ValueProps } from '@renderer/common/types';

// Helper to safely parse and evaluate LaTeX
function evaluateLatex(latex: string, scope: Record<string, number>) {
  if (!latex || latex.trim() === '') return null;
  try {
    const parsed = parseTex(String.raw`${latex}`);
    const compiled = parsed.compile();
    return compiled.evaluate(scope);
  } catch (error) {
    return null;
  }
}

// Graph types available
type GraphType = 'cartesian' | 'parametric' | 'polar';

function GraphBlockContent({ content, blockStateFunction }: ValueProps) {
  // Safe initialization
  const [graphType, setGraphType] = useState<GraphType>(
    (Array.isArray(content) && content[0] ? (content[0] as GraphType) : 'cartesian')
  );

  const [equations, setEquations] = useState<string[]>(
    (Array.isArray(content) && content.length > 1 ? (content.slice(1) as string[]) : [''])
  );

  // --- NEW: Resize Observer Logic ---
  const containerRef = useRef<HTMLDivElement>(null);
  // Default size to prevent crash before first render
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;

      const { width, height } = entries[0].contentRect;
      // Only update if dimensions actually changed to avoid loop
      setDimensions(prev => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);
  // ----------------------------------

  useEffect(() => {
    blockStateFunction([graphType, ...equations]);
  }, [graphType, equations]);

  const handleEquationChange = (index: number, newVal: string) => {
    const newEqs = [...equations];
    newEqs[index] = newVal;
    setEquations(newEqs);
  };

  return (
    <div className='graph-block-wrapper'>

      {/* Control Bar */}
      <div className="graph-controls">
        <select
          value={graphType}
          onChange={(e) => {
            setGraphType(e.target.value as GraphType);
            setEquations(['', '']); // Reset equations when switching types
          }}
        >
          <option value="cartesian">Cartesian</option>
          <option value="parametric">Parametric</option>
          <option value="polar">Polar</option>
        </select>

        <span>
          {graphType === 'cartesian' && 'y = f(x)'}
          {graphType === 'parametric' && 'x(t), y(t)'}
          {graphType === 'polar' && 'r = f(θ)'}
        </span>
      </div>

      {/* Input Fields */}
      <div className="graph-inputs">
        {graphType === 'cartesian' && (
          <MathInput
            label="y ="
            value={equations[0]}
            onChange={(val) => handleEquationChange(0, val)}
          />
        )}

        {graphType === 'polar' && (
          <MathInput
            label="r ="
            value={equations[0]}
            onChange={(val) => handleEquationChange(0, val)}
          />
        )}

        {graphType === 'parametric' && (
          <>
            <MathInput
              label="x(t) ="
              value={equations[0]}
              onChange={(val) => handleEquationChange(0, val)}
            />
            <MathInput
              label="y(t) ="
              value={equations[1]}
              onChange={(val) => handleEquationChange(1, val)}
            />
          </>
        )}
      </div>

      {/* Plot Area Wrapper */}
      <div
        ref={containerRef}
        className="mafs-container-wrapper"
        style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}
      >
        <Mafs
          preserveAspectRatio='contain'
          zoom={{ min: 0.1, max: 20 }}
          width={dimensions.width}
          height={dimensions.height}
        >
          {/* UPDATED: subdivisions={10} creates 0.1 step grid lines */}
          <Coordinates.Cartesian
            subdivisions={10}
          />

          {/* Cartesian Plot */}
          {graphType === 'cartesian' && (
            <Plot.OfX
              y={(x) => evaluateLatex(equations[0], { x }) ?? 0}
              color={Theme.blue}
            />
          )}

          {/* Parametric Plot */}
          {graphType === 'parametric' && (
            <Plot.Parametric
              xy={(t: number) => [
                evaluateLatex(equations[0], { t }) ?? 0,
                evaluateLatex(equations[1], { t }) ?? 0
              ]}
              t={[0, 2 * Math.PI]}
              color={Theme.red}
            />
          )}

          {/* Polar Plot */}
          {graphType === 'polar' && (
            <Plot.Parametric
              xy={(theta: number) => {
                const r = evaluateLatex(equations[0], { theta: theta, t: theta }) ?? 0;
                return [r * Math.cos(theta), r * Math.sin(theta)];
              }}
              t={[0, 2 * Math.PI]}
              color={Theme.indigo}
            />
          )}
        </Mafs>
      </div>
    </div>
  );
}

// ... (rest of the file remains the same)

// Helper component for individual math inputs
function MathInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  const ref = useRef<MathViewRef>(null);

  useEffect(() => {
    const mathField = ref.current;
    if (!mathField) return;

    const handleInput = () => {
      onChange(mathField.getValue('latex'));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mathField as any).addEventListener?.('input', handleInput);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mathField as any).removeEventListener?.('input', handleInput);
    };
  }, [onChange]);

  return (
    <div className="input-row">
      <span className="input-label">{label}</span>
      <div className="math-field-wrapper">
        <MathView
          ref={ref}
          value={value}
          inlineShortcuts={ML_SHORTCUTS}
          keybindings={ML_KEYBINDINGS}
          className='math-field-element'
          onContentDidChange={() => {
            if (ref.current) onChange(ref.current.getValue('latex'));
          }}
          plonkSound={null}
          keypressSound={null}
        />
      </div>
    </div>
  );
}

export default GraphBlockContent;