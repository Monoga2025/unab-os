import { describe, expect, it } from "vitest";
import { analyzeAcademicMaterials } from "@/lib/domain/academic-material-analysis";
import { buildCourseAcademicEvidence } from "@/lib/tema/academic-evidence";
import type { TemaFile, TemaSection } from "@/lib/tema/data";

const sections: TemaSection[] = [
  { id: "0", courseId: "2277", title: "Fechas de quices y exámenes", order: 0 },
  { id: "1", courseId: "2277", title: "Diapositivas de clase", order: 1 },
  { id: "2", courseId: "2277", title: "Guías de problemas", order: 2 },
  { id: "3", courseId: "2277", title: "Apuntes de clase", order: 3 },
];

function file(candidateId: string, sectionId: string, text: string | null, status: TemaFile["textExtractionStatus"] = "ready"): TemaFile {
  return {
    candidateId, courseId: "2277", sectionId, activityName: "Material", fileName: `${candidateId}.pdf`, fileType: "file",
    contentType: "application/pdf", bytes: 100, sha256: candidateId.padEnd(64, "a").slice(0, 64), status: "downloaded",
    localRelativePath: `private/${candidateId}.pdf`, extractedText: text, textExtractionStatus: status,
  };
}

describe("course academic evidence", () => {
  it("classifies only ready extracted material and appends a stable explicit cutoff", () => {
    const evidence = buildCourseAcademicEvidence({
      courseId: "2277", courseName: "Ondas y Partículas", sections,
      files: [
        { ...file("schedule", "0", "Guía resumida con programación del curso."), activityName: "Guía resumida" },
        file("slides", "1", "Periodo, frecuencia angular y omega."),
        file("guide", "2", "Problemas de péndulo simple."),
        file("notes", "3", "Movimiento armónico simple."),
        file("scan", "3", null, "ocr_needed"),
      ],
      boundaryText: "Quedamos hasta función de onda sinusoidal.",
    });
    expect(evidence.map(({ sourceId, kind }) => [sourceId, kind])).toEqual([
      ["schedule", "schedule"], ["slides", "slides"], ["guide", "guide"], ["notes", "notes"],
      ["class-progress:2277", "class_progress"], ["class-boundary:2277", "boundary"],
    ]);
    expect(JSON.stringify(evidence)).not.toContain("private/");
  });

  it("builds the approved ten-row Ondas map from realistic extracted sources and exact class progress", () => {
    const evidence = buildCourseAcademicEvidence({
      courseId: "2277", courseName: "OndasParticulas_Sarmiento", sections,
      files: [
        file("slides", "1", [
          "Periodo, frecuencia angular omega y f=1/T. Sistema masa-resorte, ley de Hooke y k/m.",
          "Movimiento armónico simple. Cinemática MAS: posición, velocidad, aceleración y x(t).",
          "Velocidad máxima vmax y aceleración máxima amax. Energía del MAS, cinética y potencial.",
          "MAS como proyección circular. Péndulo simple. Oscilaciones amortiguadas y subamortiguadas.",
        ].join(" ")),
        file("guide", "2", "Problemas de energía cinética y potencial, péndulo simple y fuerza amortiguadora."),
      ],
      boundaryText: "Movimiento ondulatorio: onda viajera, longitud de onda, rapidez de onda y función de onda sinusoidal y(x,t). Ejemplo f=2 Hz, A=0.075 m, v=12 m/s. Quedamos hasta función de onda sinusoidal.",
    });
    const result = analyzeAcademicMaterials("OndasParticulas_Sarmiento", evidence);
    expect(result.map((row) => row.topic)).toEqual([
      "Periodo, frecuencia y frecuencia angular", "Sistema masa-resorte", "Cinematica del MAS", "Valores maximos",
      "Energia en el MAS", "MAS como proyeccion circular", "Pendulo simple", "Oscilaciones amortiguadas",
      "Conceptos de onda viajera", "Funcion de onda sinusoidal",
    ]);
    expect(result.at(-1)?.formulas).toContain("y(x,t) = 0.075 sin(4πt - (π/3)x)");
  });

  it("classifies TallerParcial1 as assessment before the generic guide label", () => {
    const evidence = buildCourseAcademicEvidence({
      courseId: "stats-1",
      courseName: "Estadística Inferencial y Muestreo",
      sections,
      files: [{
        ...file("taller-parcial", "2", "Seis preguntas del mapa del parcial."),
        activityName: "TallerParcial1",
        fileName: "TallerParcial1.pdf",
      }],
    });
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ sourceId: "taller-parcial", kind: "assessment" });
  });
});
