import { describe, expect, it } from "vitest";
import { cleanDisplayFileName } from "../../scripts/lib/tema-filenames.mjs";

describe("TEMA display filenames", () => {
  it("repairs standard and digit-corrupted UTF-8 mojibake together", () => {
    expect(cleanDisplayFileName("EstadÃ­stica y administraciÃ3n.pdf"))
      .toBe("Estadística y administración.pdf");
    expect(cleanDisplayFileName("IntroducciÃ3n a las Ecuaciones Diferenciales.pdf"))
      .toBe("Introducción a las Ecuaciones Diferenciales.pdf");
  });

  it("keeps safe Unicode filenames unchanged", () => {
    expect(cleanDisplayFileName("Guía de hipótesis.pdf")).toBe("Guía de hipótesis.pdf");
  });
});
