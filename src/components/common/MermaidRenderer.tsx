import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mermaid on first render
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      // Use neutral colors for both light and dark mode
      themeVariables: {
        primaryColor: '#e3f2fd',
        primaryTextColor: '#1565c0',
        primaryBorderColor: '#1565c0',
        lineColor: '#42a5f5',
        secondaryColor: '#f3e5f5',
        tertiaryColor: '#fff',
      },
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || !chart) return;

    const renderChart = async () => {
      try {
        setError(null);

        // Process the chart: replace literal \n with actual newlines
        // LLM often returns "graph TD\\nA --> B" which needs to become "graph TD\nA --> B"
        const processedChart = chart.replace(/\\n/g, '\n');

        console.log('[MermaidRenderer] Rendering chart:', processedChart.substring(0, 200) + '...');

        // Generate unique ID for this chart
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the chart
        const { svg } = await mermaid.render(id, processedChart);

        // Debug: Log original SVG length and check if it contains text
        console.log('[MermaidRenderer] Original SVG length:', svg.length);
        console.log('[MermaidRenderer] Contains foreignObject:', svg.includes('<foreignObject'));
        console.log('[MermaidRenderer] Contains <text> tags:', svg.includes('<text'));
        console.log('[MermaidRenderer] Chart content:', processedChart);

        // Skip DOMPurify sanitization for Mermaid SVGs
        // The chart content comes from our database (AI-generated analysis), not user input
        // DOMPurify's handling of foreignObject with HTML content is problematic and strips text
        // Since we control the source, it's safe to insert directly
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('[MermaidRenderer] Failed to render mermaid chart:', err);
        console.error('[MermaidRenderer] Chart content:', chart);
        setError('Failed to render flowchart');
        // Show raw mermaid code as fallback - use textContent instead of innerHTML for security
        if (containerRef.current) {
          const processedChart = chart.replace(/\\n/g, '\n');
          containerRef.current.textContent = '';
          const pre = document.createElement('pre');
          pre.className = 'text-xs overflow-x-auto whitespace-pre-wrap';
          pre.textContent = processedChart;
          containerRef.current.appendChild(pre);
        }
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded ${className}`}>
        <p className="text-sm text-yellow-800 dark:text-yellow-300">{error}</p>
        <details className="mt-2">
          <summary className="text-xs text-yellow-700 dark:text-yellow-400 cursor-pointer">View raw mermaid code</summary>
          <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">{chart.replace(/\\n/g, '\n')}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container flex justify-center overflow-x-auto ${className}`}
    />
  );
}
