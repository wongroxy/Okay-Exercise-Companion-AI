import React, { useEffect, useRef } from 'react';

// Make TypeScript aware of the global MathJax object from the CDN script
declare global {
  interface Window {
    MathJax: {
      typeset: (elements?: (HTMLElement | Document)[]) => void;
      typesetPromise: (elements?: (HTMLElement | Document)[]) => Promise<void>;
    };
  }
}

interface MathTextProps {
  text: string | undefined | null;
  className?: string;
  as?: React.ElementType;
}

export const MathText: React.FC<MathTextProps> = ({ text, className, as: Component = 'span' }) => {
  const ref = useRef<HTMLElement>(null);

  // The AI is being told to escape backslashes, so we MUST un-escape them here
  // before MathJax sees them. This handles cases like `\\sqrt` -> `\sqrt`.
  const processedText = text ? text.replace(/\\+/g, '\\') : '';

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const typeset = () => {
      if (window.MathJax) {
        window.MathJax.typesetPromise([element]).catch((err) =>
          console.error('MathJax typesetting error:', err)
        );
      }
    };

    // If MathJax is already loaded, typeset immediately.
    // Otherwise, poll until it's available. This robustly handles race conditions
    // on slower networks or devices.
    if (window.MathJax) {
      typeset();
    } else {
      const intervalId = setInterval(() => {
        if (window.MathJax) {
          clearInterval(intervalId);
          typeset();
        }
      }, 100);

      // Cleanup the interval if the component unmounts before MathJax loads
      return () => clearInterval(intervalId);
    }
  }, [processedText]); // Re-run the effect when the processed text content changes

  if (!text) {
    return null;
  }
  
  // Render the raw text content. MathJax will scan this element and replace
  // math delimiters with rendered SVG math.
  return <Component ref={ref} className={className}>{processedText}</Component>;
};
