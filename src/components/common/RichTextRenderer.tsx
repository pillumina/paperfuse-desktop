import { LaTeXRenderer } from './LaTeXRenderer';

interface RichTextRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders text content with inline LaTeX, Markdown formatting support
 * Features:
 * - LaTeX: $...$ for inline math, $$...$$ or \[...\] for display math
 * - Markdown bold: **text** or __text__
 * - Markdown italic: *text* or _text_
 * - Markdown code: `text`
 * - Line breaks preserved
 */
export function RichTextRenderer({ content, className = '' }: RichTextRendererProps) {
  if (!content) return null;

  // Process content in order:
  // 1. First, protect LaTeX expressions (replace with placeholders)
  // 2. Apply Markdown formatting to remaining text
  // 3. Restore LaTeX expressions

  const latexPlaceholders: Array<{ placeholder: string; latex: string; display: boolean }> = [];
  let processedContent = content;

  // Pattern to match LaTeX expressions:
  // - $...$ for inline math (non-greedy, doesn't match $ inside)
  // - $$...$$ or \[...\] for display math
  const latexPattern = /\$\$([^\$]+)\$\$|\$([^\$]+)\$|\\\[([\s\S]+?)\\\]/g;

  // Replace LaTeX with placeholders
  processedContent = processedContent.replace(latexPattern, (_match, displayLatex, inlineLatex, bracketLatex) => {
    const placeholder = `__LATEX_PLACEHOLDER_${latexPlaceholders.length}__`;
    if (displayLatex) {
      latexPlaceholders.push({ placeholder, latex: displayLatex.trim(), display: true });
    } else if (inlineLatex) {
      latexPlaceholders.push({ placeholder, latex: inlineLatex.trim(), display: false });
    } else if (bracketLatex) {
      latexPlaceholders.push({ placeholder, latex: bracketLatex.trim(), display: true });
    }
    return placeholder;
  });

  // Now apply Markdown formatting to the remaining text

  // Helper to parse and render inline formatting
  const parseInlineFormatting = (text: string): React.ReactNode => {
    const tokens: React.ReactNode[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      // Try to match patterns in order: bold, italic, code, inline LaTeX placeholders, plain text

      // Bold: **text** or __text__ (non-greedy)
      const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        tokens.push(<strong key={`bold-${tokens.length}`}>{parseInlineFormatting(boldMatch[2])}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_ (non-greedy, but not at word boundaries to avoid conflicts)
      const italicMatch = remaining.match(/^(\*|_)(.+?)\1(?!\w)/);
      if (italicMatch) {
        tokens.push(<em key={`italic-${tokens.length}`}>{parseInlineFormatting(italicMatch[2])}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Code: `text`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(<code key={`code-${tokens.length}`} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">{codeMatch[1]}</code>);
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // LaTeX placeholder
      const placeholderMatch = remaining.match(/^__LATEX_PLACEHOLDER_(\d+)__/);
      if (placeholderMatch) {
        const index = parseInt(placeholderMatch[1]);
        const { latex, display } = latexPlaceholders[index];
        tokens.push(<LaTeXRenderer key={`latex-${index}`} latex={latex} display={display} />);
        remaining = remaining.slice(placeholderMatch[0].length);
        continue;
      }

      // Plain text (until next special character or end)
      const plainMatch = remaining.match(/^([^\*_`$\\]+)/);
      if (plainMatch) {
        tokens.push(plainMatch[1]);
        remaining = remaining.slice(plainMatch[0].length);
        continue;
      }

      // If we have a special character but no match, consume it and continue
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return <>{tokens}</>;
  };

  // Split by lines and process each line
  const lines = processedContent.split('\n');
  const isList = lines.every(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'));

  return (
    <div className={className}>
      {isList ? (
        <ul className="list-disc list-inside space-y-1">
          {lines.map((line, i) => (
            <li key={i}>
              {parseInlineFormatting(line.replace(/^[•\-\*]\s*/, ''))}
            </li>
          ))}
        </ul>
      ) : (
        lines.map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {parseInlineFormatting(line)}
          </p>
        ))
      )}
    </div>
  );
}
