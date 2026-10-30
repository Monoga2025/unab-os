// Pure, dependency-free LaTeX tokenizer.
//
// It splits a chat message into ordered segments so the renderer can send math
// to KaTeX and keep everything else as escaped plain text. Kept outside the
// React component so it is unit testable without a DOM.
//
// Supported delimiters:
//   - display math: `$$...$$` and `\[...\]`
//   - inline math:  `$...$` and `\(...\)`
// Longer delimiters are always matched before shorter ones (`$$` before `$`).

export type LatexSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; displayMode: boolean };

export function tokenizeLatex(input: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  let textBuffer = "";
  let index = 0;

  const flushText = () => {
    if (textBuffer) {
      segments.push({ type: "text", value: textBuffer });
      textBuffer = "";
    }
  };

  while (index < input.length) {
    if (input.startsWith("$$", index)) {
      const end = input.indexOf("$$", index + 2);
      if (end !== -1) {
        flushText();
        segments.push({ type: "math", value: input.slice(index + 2, end), displayMode: true });
        index = end + 2;
        continue;
      }
      textBuffer += "$$";
      index += 2;
      continue;
    }

    if (input.startsWith("\\[", index)) {
      const end = input.indexOf("\\]", index + 2);
      if (end !== -1) {
        flushText();
        segments.push({ type: "math", value: input.slice(index + 2, end), displayMode: true });
        index = end + 2;
        continue;
      }
      textBuffer += "\\[";
      index += 2;
      continue;
    }

    if (input.startsWith("\\(", index)) {
      const end = input.indexOf("\\)", index + 2);
      if (end !== -1) {
        flushText();
        segments.push({ type: "math", value: input.slice(index + 2, end), displayMode: false });
        index = end + 2;
        continue;
      }
      textBuffer += "\\(";
      index += 2;
      continue;
    }

    if (input[index] === "$") {
      const end = input.indexOf("$", index + 1);
      if (end !== -1) {
        flushText();
        segments.push({ type: "math", value: input.slice(index + 1, end), displayMode: false });
        index = end + 1;
        continue;
      }
      textBuffer += "$";
      index += 1;
      continue;
    }

    textBuffer += input[index];
    index += 1;
  }

  flushText();
  return segments;
}
