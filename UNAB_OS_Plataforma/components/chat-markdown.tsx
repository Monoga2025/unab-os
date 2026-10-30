"use client";

import katex from "katex";
import { tokenizeLatex } from "@/lib/entrenador/latex-tokenizer";

// Renders a chat message with LaTeX support.
//
// SECURITY: only KaTeX's own generated output is injected via
// `dangerouslySetInnerHTML`. Plain-text segments are rendered as normal React
// text, so React escapes them and any model-provided HTML (e.g. a literal
// `<script>`) stays visible as text instead of being executed.
export function ChatMarkdown({ text }: { text: string }) {
  const segments = tokenizeLatex(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <span className="chat-text" key={`text-${index}`}>
              {segment.value}
            </span>
          );
        }

        try {
          const html = katex.renderToString(segment.value, {
            throwOnError: false,
            displayMode: segment.displayMode,
            output: "html",
            strict: false,
          });
          return (
            <span
              className={segment.displayMode ? "chat-math chat-math-display" : "chat-math chat-math-inline"}
              key={`math-${index}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span className="chat-text" key={`math-fallback-${index}`}>
              {segment.value}
            </span>
          );
        }
      })}
    </>
  );
}
