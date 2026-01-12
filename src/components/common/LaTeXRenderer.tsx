import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXRendererProps {
  latex: string;
  display?: boolean; // true for block mode (centered, larger), false for inline
  className?: string;
}

export function LaTeXRenderer({ latex, display = false, className = '' }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !latex) return;

    try {
      katex.render(latex, containerRef.current, {
        displayMode: display,
        throwOnError: false,
        trust: true, // Allow certain commands like \\includegraphics
        strict: false, // Be more forgiving with LaTeX
      });
    } catch (error) {
      console.error('[LaTeXRenderer] Failed to render LaTeX:', latex, error);
      // Fallback: display raw LaTeX
      if (containerRef.current) {
        containerRef.current.textContent = latex;
      }
    }
  }, [latex, display]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{ display: display ? 'block' : 'inline-block' }}
    />
  );
}
