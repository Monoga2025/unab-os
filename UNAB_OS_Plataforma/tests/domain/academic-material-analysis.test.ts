import { describe, expect, it } from "vitest";
import {
  analyzeAcademicMaterials,
  normalizeAcademicText,
  type AcademicMaterialEvidence,
} from "@/lib/domain/academic-material-analysis";

const completeEvidence: AcademicMaterialEvidence[] = [
  { sourceId: "schedule", kind: "schedule", label: "Cronograma", text: "Reflexión, interferencia, ondas estacionarias y sonido aparecen después.", order: 0 },
  { sourceId: "slides-1", kind: "slides", label: "Diapositivas 3-19", text: [
    "Periodo, frecuencia angular omega y f = 1/T.",
    "Movimiento armónico simple y sistema masa-resorte; ley de Hooke; k/m.",
    "Cinemática MAS: posición, velocidad y aceleración; x(t).",
    "Velocidad máxima vmax y aceleración máxima amax.",
    "Energía del MAS: energía cinética y potencial.",
    "MAS como proyección circular.",
    "Péndulo simple.",
    "Oscilaciones amortiguadas: subamortiguado, amortiguamiento crítico y sobreamortiguado.",
  ].join(" "), order: 1 },
  { sourceId: "notes-32", kind: "notes", label: "Apuntes", text: [
    "Movimiento ondulatorio: onda viajera, longitud de onda y rapidez de onda.",
    "Función de onda sinusoidal y(x,t). Ejemplo: f=2 Hz, A=0.075 m, v=12 m/s.",
    "Más adelante: reflexión de onda, interferencia constructiva, ondas estacionarias y ondas sonoras.",
  ].join(" "), order: 2 },
  { sourceId: "cutoff", kind: "boundary", label: "Avance real", text: "Quedamos hasta la función de onda sinusoidal.", order: 3 },
];

const statisticsEvidence: AcademicMaterialEvidence[] = [
  {
    sourceId: "schedule-week-3",
    kind: "schedule",
    label: "SEMANA3 · Cronograma",
    text: "Distribución muestral de la varianza, intervalos de confianza y pruebas de hipótesis.",
    order: 0,
  },
  {
    sourceId: "unit-1-notes",
    kind: "notes",
    label: "Apuntes · Unidad 1",
    text: [
      "Variable aleatoria, distribución de probabilidad, valor esperado y varianza.",
      "Distribución normal y estandarización Z para calcular probabilidades.",
      "Aproximación normal a la binomial cuando npq > 9 y corrección de continuidad de ±0.5.",
      "Teoría de muestreo: población, muestra, parámetro, estadístico y muestreo con o sin reemplazo.",
      "Media muestral y error estándar; corrección por población finita.",
      "Distribución muestral de las proporciones.",
    ].join(" "),
    order: 1,
  },
  {
    sourceId: "taller-parcial-1",
    kind: "assessment",
    label: "TallerParcial1.pdf · 6 preguntas",
    text: [
      "Pregunta 1: distribución normal directa, probabilidad normal entre dos valores y días esperados.",
      "Pregunta 2: normal inversa con cola superior.",
      "Pregunta 3: enumerar todas las muestras con reemplazo y construir la distribución muestral de medias por enumeración; hallar la media muestral y el error estándar.",
      "Pregunta 4: calcular probabilidades de la media muestral.",
      "Pregunta 5: distribución muestral de proporciones.",
      "Pregunta 6: población uniforme discreta, probabilidad de la media muestral mediante TCL y ajuste al décimo.",
    ].join(" "),
    order: 2,
  },
  {
    sourceId: "week-3-guide",
    kind: "guide",
    label: "SEMANA3 · Guía posterior",
    text: "Distribución muestral de la varianza y chi cuadrado. Intervalos de confianza. Pruebas de hipótesis.",
    order: 3,
  },
];

const literalTallerParcialEvidence: AcademicMaterialEvidence = {
  sourceId: "taller-parcial-1-literal",
  kind: "assessment",
  label: "TallerParcial1.pdf",
  text: [
    "La temperatura máxima sigue una distribución normal, con media 23° y desviación estándar 5°. Calcular el número de días entre 21° y 27°.",
    "La probabilidad de tener un ritmo cardíaco igual o mayor al registrado es 0.04. Se distribuyen de manera Normal. ¿Cuál fue el ritmo cardíaco?",
    "Considerar todas las muestras posibles de tamaño dos con remplazamiento. Hallar la media y la desviación típica de la distribución muestral de medias.",
    "¿Cuál es la probabilidad de que la media de la temperatura de la muestra sea menor o igual a 36,7° C?",
    "Hallar la probabilidad de que de los próximos 200 niños nacidos: menos del 40%, entre el 43% y el 57%, y más del 54%. Supóngase iguales las probabilidades de nacimientos.",
    "Dada la población uniforme discreta, calcule la probabilidad de que una muestra aleatoria produzca una media muestral mayor que 4,1 pero menor que 4,4.",
  ].join(" "),
  order: 2,
};

describe("academic material analysis", () => {
  it("normalizes accents and Greek symbols deterministically", () => {
    expect(normalizeAcademicText("PÉNDULO · ω = 2πf · Longitud λ")).toBe("pendulo omega = 2 pi f longitud lambda");
  });

  it("reproduces the ten approved rows and the numeric rope example", () => {
    const result = analyzeAcademicMaterials("Ondas y Partículas", completeEvidence);
    expect(result.map((row) => row.topic)).toEqual([
      "Periodo, frecuencia y frecuencia angular",
      "Sistema masa-resorte",
      "Cinematica del MAS",
      "Valores maximos",
      "Energia en el MAS",
      "MAS como proyeccion circular",
      "Pendulo simple",
      "Oscilaciones amortiguadas",
      "Conceptos de onda viajera",
      "Funcion de onda sinusoidal",
    ]);
    expect(result.at(-1)).toMatchObject({
      priority: "maxima",
      sourceRefs: ["notes-32"],
      confidence: "high",
      boundary: true,
    });
    expect(result.at(-1)?.formulas).toEqual([
      "y(x,t) = A sin(ωt - kx)",
      "A = 0.075 m",
      "T = 0.50 s",
      "λ = 6 m",
      "ω = 4π rad/s",
      "k = π/3 rad/m",
      "y(x,t) = 0.075 sin(4πt - (π/3)x)",
    ]);
    expect(result.map((row) => row.topic)).not.toEqual(expect.arrayContaining(["Reflexion", "Interferencia", "Ondas estacionarias", "Sonido"]));
  });

  it("does not activate topics from a schedule or boundary without substantive evidence", () => {
    expect(analyzeAcademicMaterials("Ondas", [
      { sourceId: "schedule", kind: "schedule", label: "Programa", text: "MAS, energía, péndulo, ondas y sonido." },
      { sourceId: "boundary", kind: "boundary", label: "Corte", text: "Hasta sonido." },
    ])).toEqual([]);
    expect(analyzeAcademicMaterials("Circuitos", completeEvidence)).toEqual([]);
  });

  it("accepts explicit class progress as low-confidence substantive evidence", () => {
    const result = analyzeAcademicMaterials("Ondas", [
      { sourceId: "progress", kind: "class_progress", label: "Avance", text: "Periodo, frecuencia angular y omega." },
      { sourceId: "boundary", kind: "boundary", label: "Corte", text: "Hasta periodo, frecuencia y frecuencia angular." },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ topic: "Periodo, frecuencia y frecuencia angular", confidence: "low", boundary: true });
  });

  it("keeps catalog order and source references stable when evidence input is shuffled", () => {
    const forward = analyzeAcademicMaterials("Oscilaciones y ondas", completeEvidence);
    const reversed = analyzeAcademicMaterials("Oscilaciones y ondas", [...completeEvidence].reverse());
    expect(reversed).toEqual(forward);
  });

  it("uses the amplitude in evidence instead of correcting it heuristically", () => {
    const changed = completeEvidence.map((item) => item.sourceId === "notes-32"
      ? { ...item, text: item.text.replace("A=0.075 m", "A=0.75 m") }
      : item);
    const wave = analyzeAcademicMaterials("Ondas", changed).at(-1);
    expect(wave?.formulas).toContain("A = 0.75 m");
    expect(wave?.formulas).toContain("y(x,t) = 0.75 sin(4πt - (π/3)x)");
    expect(wave?.formulas.join(" ")).not.toContain("0.075");
  });

  it("builds the exact TallerParcial1 statistics map and stops before later Semana 3 topics", () => {
    const result = analyzeAcademicMaterials("ESTADÍSTICA INFERENCIAL Y MUESTREO", statisticsEvidence);
    expect(result.map((row) => row.topic)).toEqual([
      "Variable aleatoria y distribuciones",
      "Distribución normal y estandarización Z",
      "Normal inversa y cuantiles",
      "Aproximación normal a la binomial",
      "Teoría de muestreo",
      "Distribución muestral de medias por enumeración",
      "Media muestral, error estándar y corrección finita",
      "Probabilidades de la media muestral y TCL",
      "Distribución muestral de proporciones",
    ]);
    expect(result.map((row) => row.priority)).toEqual([
      "alta", "maxima", "maxima", "alta", "alta", "maxima", "maxima", "maxima", "maxima",
    ]);
    expect(result.at(-1)).toMatchObject({ boundary: true, confidence: "high" });
    expect(result.map((row) => row.topic)).not.toEqual(expect.arrayContaining([
      "Distribucion muestral de la varianza", "Intervalos de confianza", "Pruebas de hipotesis",
    ]));
  });

  it("recognizes the applied wording used literally in TallerParcial1", () => {
    const evidence = statisticsEvidence.map((item) => item.kind === "assessment" ? literalTallerParcialEvidence : item);
    const result = analyzeAcademicMaterials("Estadística Inferencial y Muestreo", evidence);
    expect(result).toHaveLength(9);
    expect(result.find((row) => row.topic === "Normal inversa y cuantiles")?.priority).toBe("maxima");
    expect(result.find((row) => row.topic === "Distribución muestral de proporciones")).toMatchObject({
      priority: "maxima",
      boundary: true,
      sourceRefs: ["unit-1-notes", "taller-parcial-1-literal"],
    });
  });

  it("keeps the statistics catalog ordered and accepts the short course name", () => {
    const forward = analyzeAcademicMaterials("Estadistica", statisticsEvidence);
    const reversed = analyzeAcademicMaterials("Estadistica", [...statisticsEvidence].reverse());
    expect(reversed).toEqual(forward);
    expect(forward).toHaveLength(9);
  });

  it("honors an explicit statistics boundary before the assessment-derived boundary", () => {
    const result = analyzeAcademicMaterials("Estadística", [
      ...statisticsEvidence,
      { sourceId: "class-cutoff", kind: "boundary", label: "Corte real", text: "Quedamos hasta normal inversa y cuantiles." },
    ]);
    expect(result.map((row) => row.topic)).toEqual([
      "Variable aleatoria y distribuciones",
      "Distribución normal y estandarización Z",
      "Normal inversa y cuantiles",
    ]);
    expect(result.at(-1)?.boundary).toBe(true);
  });

  it("does not cross-activate the waves and statistics profiles or activate a schedule alone", () => {
    expect(analyzeAcademicMaterials("Ondas y Partículas", statisticsEvidence)).toEqual([]);
    expect(analyzeAcademicMaterials("Estadística Inferencial y Muestreo", completeEvidence)).toEqual([]);
    expect(analyzeAcademicMaterials("Estadística", [statisticsEvidence[0]])).toEqual([]);
  });
});
