import { useEffect, useRef } from "react";
import katex from "katex";

interface MathDisplayProps {
  formula: string;
  display?: boolean;
  className?: string;
}

export function MathDisplay({ formula, display = false, className }: MathDisplayProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(formula, ref.current, {
        displayMode: display,
        throwOnError: false,
        output: "html",
      });
    } catch {
      if (ref.current) ref.current.textContent = formula;
    }
  }, [formula, display]);

  return <span ref={ref} className={className} />;
}

interface MathTextProps {
  text: string;
  className?: string;
}

// Splits text by LaTeX delimiters: $...$, $$...$$, \(...\), \[...\]
function splitMath(text: string): Array<{ type: "text" | "inline" | "display"; content: string }> {
  const parts: Array<{ type: "text" | "inline" | "display"; content: string }> = [];
  
  // Combined regex for all math delimiters
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$]+?\$|\\\([^)]+?\\\))/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    
    const raw = match[0];
    if (raw.startsWith("$$") || raw.startsWith("\\[")) {
      const formula = raw.startsWith("$$") ? raw.slice(2, -2) : raw.slice(2, -2);
      parts.push({ type: "display", content: formula });
    } else {
      const formula = raw.startsWith("$") ? raw.slice(1, -1) : raw.slice(2, -2);
      parts.push({ type: "inline", content: formula });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }
  
  return parts;
}

function MathPart({ content, display }: { content: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(content, ref.current, {
        displayMode: display,
        throwOnError: false,
        output: "html",
      });
    } catch {
      if (ref.current) ref.current.textContent = content;
    }
  }, [content, display]);
  
  return <span ref={ref} />;
}

export function MathText({ text, className }: MathTextProps) {
  const parts = splitMath(text);
  
  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.type === "text") return <span key={idx}>{part.content}</span>;
        return <MathPart key={idx} content={part.content} display={part.type === "display"} />;
      })}
    </span>
  );
}
