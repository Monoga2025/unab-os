import { describe, expect, it } from "vitest";
import { tokenizeLatex, type LatexSegment } from "@/lib/entrenador/latex-tokenizer";

const text = (value: string): LatexSegment => ({ type: "text", value });
const math = (value: string, displayMode: boolean): LatexSegment => ({ type: "math", value, displayMode });

describe("entrenador LaTeX tokenizer", () => {
  it("splits inline dollar math and preserves surrounding text", () => {
    expect(tokenizeLatex("La rapidez es $v = \\omega / k$ en movimiento")).toEqual([
      text("La rapidez es "),
      math("v = \\omega / k", false),
      text(" en movimiento"),
    ]);
  });

  it("splits display dollar math", () => {
    expect(tokenizeLatex("Antes $$E = cB$$ después")).toEqual([
      text("Antes "),
      math("E = cB", true),
      text(" después"),
    ]);
  });

  it("splits backslash paren inline math", () => {
    expect(tokenizeLatex("Mira \\(x^2 + y^2\\) aquí")).toEqual([
      text("Mira "),
      math("x^2 + y^2", false),
      text(" aquí"),
    ]);
  });

  it("splits backslash bracket display math", () => {
    expect(tokenizeLatex("\\[\\int_0^1 x\\,dx\\]")).toEqual([math("\\int_0^1 x\\,dx", true)]);
  });

  it("matches the longer $$ delimiter before the single $", () => {
    const segments = tokenizeLatex("$$a + b$$");
    expect(segments).toEqual([math("a + b", true)]);
    expect(segments).toHaveLength(1);
  });

  it("keeps an unclosed delimiter as plain text", () => {
    expect(tokenizeLatex("costo de $5 sin cerrar")).toEqual([text("costo de $5 sin cerrar")]);
  });

  it("treats a lone $$ without a closing pair as plain text", () => {
    expect(tokenizeLatex("precio $$")).toEqual([text("precio $$")]);
  });

  it("returns a single text segment when there is no math", () => {
    expect(tokenizeLatex("solo prosa sin fórmulas")).toEqual([text("solo prosa sin fórmulas")]);
  });

  it("never treats model-provided HTML as markup", () => {
    const segments = tokenizeLatex("<script>alert(1)</script>");
    expect(segments).toEqual([text("<script>alert(1)</script>")]);
    expect(segments.some((segment) => segment.type === "math")).toBe(false);
  });

  it("keeps html-like text as plain text even around math", () => {
    expect(tokenizeLatex("<b>hola</b> y $x$")).toEqual([
      text("<b>hola</b> y "),
      math("x", false),
    ]);
  });
});
