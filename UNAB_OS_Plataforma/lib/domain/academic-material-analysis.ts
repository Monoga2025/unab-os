export type AcademicEvidenceKind = "schedule" | "slides" | "notes" | "assessment" | "guide" | "class_progress" | "boundary";

export type AcademicMaterialEvidence = Readonly<{
  sourceId: string;
  kind: AcademicEvidenceKind;
  label: string;
  text: string;
  order?: number;
}>;

export type AcademicTopicAnalysis = Readonly<{
  topic: string;
  priority: "media" | "alta" | "muy_alta" | "maxima";
  skill: string;
  formulas: readonly string[];
  sourceRefs: readonly string[];
  confidence: "low" | "medium" | "high";
  boundary: boolean;
}>;

type TopicDefinition = Readonly<{
  id: string;
  topic: string;
  priority: AcademicTopicAnalysis["priority"];
  skill: string;
  formulas: readonly string[];
  patterns: readonly RegExp[];
  dependencies?: readonly string[];
}>;

type CatalogProfile = Readonly<{
  id: "waves" | "statistics";
  coursePattern: RegExp;
  topics: readonly TopicDefinition[];
  assessmentDefinesBoundary?: boolean;
}>;

const SUBSTANTIVE_KINDS = new Set<AcademicEvidenceKind>(["slides", "notes", "assessment", "guide", "class_progress"]);

/** Normalizes Spanish prose for deterministic matching without changing numeric evidence. */
export function normalizeAcademicText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ωΩ]/g, " omega ")
    .replace(/[λΛ]/g, " lambda ")
    .replace(/[πΠ]/g, " pi ")
    .toLocaleLowerCase("es")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[^a-z0-9.=+*/()<>\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const WAVES_TOPICS: readonly TopicDefinition[] = [
  {
    id: "period-frequency",
    topic: "Periodo, frecuencia y frecuencia angular",
    priority: "alta",
    skill: "Convertir entre periodo, frecuencia y frecuencia angular.",
    formulas: ["f = 1/T", "ω = 2πf"],
    patterns: [/\bperiodo\b/, /\bfrecuencia angular\b|\bomega\b/, /\bf\s*=\s*1\s*\/\s*t\b/],
  },
  {
    id: "mass-spring",
    topic: "Sistema masa-resorte",
    priority: "alta",
    skill: "Obtener la constante, el periodo y la frecuencia de un sistema masa-resorte.",
    formulas: ["F = -kx", "ω = √(k/m)", "T = 2π√(m/k)"],
    patterns: [/masa\s*-?\s*resorte/, /ley de hooke|fuerza elastica/, /\bk\s*\/\s*m\b/],
    dependencies: ["period-frequency"],
  },
  {
    id: "shm-kinematics",
    topic: "Cinematica del MAS",
    priority: "muy_alta",
    skill: "Hallar posicion, velocidad, aceleracion, amplitud y fase inicial en el MAS.",
    formulas: ["x = A cos(ωt + φ)", "v = -Aω sin(ωt + φ)", "a = -ω²x"],
    patterns: [/cinematica.*(?:mas|armonico)|movimiento armonico simple/, /x\s*\(\s*t\s*\)/, /velocidad.*aceleracion|posicion.*velocidad/],
    dependencies: ["period-frequency"],
  },
  {
    id: "maximum-values",
    topic: "Valores maximos",
    priority: "alta",
    skill: "Reconocer donde la velocidad y la aceleracion alcanzan sus valores maximos.",
    formulas: ["vmax = Aω", "amax = Aω²"],
    patterns: [/velocidad maxima|rapidez maxima|vmax/, /aceleracion maxima|amax/],
    dependencies: ["shm-kinematics"],
  },
  {
    id: "shm-energy",
    topic: "Energia en el MAS",
    priority: "alta",
    skill: "Relacionar energia cinetica, potencial, total y posicion en el MAS.",
    formulas: ["E = ½kA²", "U = ½kx²", "K = E - U"],
    patterns: [/energia.*(?:mas|armonico)/, /energia cinetica.*potencial|energia potencial.*cinetica/, /\bk\s*a\s*\^?\s*2\b/],
    dependencies: ["mass-spring", "shm-kinematics"],
  },
  {
    id: "circular-projection",
    topic: "MAS como proyeccion circular",
    priority: "media",
    skill: "Obtener posicion, velocidad y aceleracion del MAS desde una proyeccion circular.",
    formulas: ["x = A cos θ", "θ = ωt + φ"],
    patterns: [/proyeccion.*circular|movimiento circular.*(?:mas|armonico)/],
    dependencies: ["shm-kinematics"],
  },
  {
    id: "simple-pendulum",
    topic: "Pendulo simple",
    priority: "alta",
    skill: "Calcular periodo y frecuencia de un pendulo para angulos pequenos.",
    formulas: ["ω = √(g/L)", "T = 2π√(L/g)"],
    patterns: [/pendulo simple/, /longitud.*gravedad.*periodo/],
    dependencies: ["period-frequency"],
  },
  {
    id: "damping",
    topic: "Oscilaciones amortiguadas",
    priority: "alta",
    skill: "Distinguir movimiento subamortiguado, critico y sobreamortiguado.",
    formulas: ["mx'' + bx' + kx = 0", "x = Ae^(-γt) cos(ωdt + φ)"],
    patterns: [/oscilacion(?:es)? amortiguad/, /subamortiguad|sobreamortiguad|amortiguamiento critico/, /fuerza amortiguadora/],
    dependencies: ["mass-spring"],
  },
  {
    id: "travelling-wave",
    topic: "Conceptos de onda viajera",
    priority: "muy_alta",
    skill: "Distinguir amplitud, longitud de onda, periodo, frecuencia, rapidez y direccion.",
    formulas: ["v = λf", "k = 2π/λ", "ω = 2πf", "v = ω/k"],
    patterns: [/onda viajera|movimiento ondulatorio/, /longitud de onda/, /rapidez de (?:la )?onda/],
    dependencies: ["period-frequency"],
  },
  {
    id: "sinusoidal-wave",
    topic: "Funcion de onda sinusoidal",
    priority: "maxima",
    skill: "Construir y evaluar la funcion de una onda sinusoidal con su direccion y fase.",
    formulas: ["y(x,t) = A sin(ωt - kx)"],
    patterns: [/funcion de onda (?:sinusoidal|armonica)/, /y\s*\(\s*x\s*,\s*t\s*\)/, /sin\s*\(.*(?:omega|pi).*x/],
    dependencies: ["travelling-wave"],
  },
  {
    id: "reflection",
    topic: "Reflexion",
    priority: "media",
    skill: "Analizar la reflexion de una onda en una frontera.",
    formulas: [],
    patterns: [/reflexion de (?:la )?onda|onda reflejada/],
    dependencies: ["sinusoidal-wave"],
  },
  {
    id: "interference",
    topic: "Interferencia",
    priority: "media",
    skill: "Aplicar superposicion para identificar interferencia constructiva o destructiva.",
    formulas: [],
    patterns: [/interferencia constructiva|interferencia destructiva/],
    dependencies: ["sinusoidal-wave"],
  },
  {
    id: "standing-waves",
    topic: "Ondas estacionarias",
    priority: "media",
    skill: "Identificar nodos, vientres y modos normales.",
    formulas: [],
    patterns: [/ondas? estacionarias?|nodos?.*vientres?/],
    dependencies: ["sinusoidal-wave"],
  },
  {
    id: "sound",
    topic: "Sonido",
    priority: "media",
    skill: "Relacionar frecuencia, propagacion y cualidades del sonido.",
    formulas: [],
    patterns: [/ondas? sonoras?|efecto doppler|cualidades del sonido/],
    dependencies: ["sinusoidal-wave"],
  },
] as const;

const STATISTICS_TOPICS: readonly TopicDefinition[] = [
  {
    id: "random-variable",
    topic: "Variable aleatoria y distribuciones",
    priority: "alta",
    skill: "Identificar una variable aleatoria, su distribución y los valores esperados que se derivan de ella.",
    formulas: ["Σp(x) = 1", "E(X) = Σx·p(x)", "Var(X) = E(X²) - [E(X)]²"],
    patterns: [/variable aleatoria/, /distribucion de probabilidad|funcion de probabilidad/, /valor esperado.*varianza/],
  },
  {
    id: "normal-z",
    topic: "Distribución normal y estandarización Z",
    priority: "alta",
    skill: "Estandarizar valores y calcular probabilidades normales directas entre límites o en una cola.",
    formulas: ["Z = (X - μ)/σ", "P(a < X < b) = P(zₐ < Z < zᵦ)"],
    patterns: [/distribucion normal|normal directa/, /estandarizacion.*z|puntaje z/, /probabilidad.*normal.*entre/],
    dependencies: ["random-variable"],
  },
  {
    id: "normal-quantiles",
    topic: "Normal inversa y cuantiles",
    priority: "alta",
    skill: "Encontrar un valor original a partir de una probabilidad acumulada o de cola superior.",
    formulas: ["x = μ + zₚσ", "P(X > x) = α ⇔ x = μ + z₁₋ασ"],
    patterns: [
      /normal inversa|cuantil(?:es)?/,
      /cola superior/,
      /hallar.*valor.*probabilidad|valor que deja.*por ciento/,
      /probabilidad.*igual o mayor.*(?:cual|hallar).*(?:valor|ritmo cardiaco)/,
    ],
    dependencies: ["normal-z"],
  },
  {
    id: "normal-binomial",
    topic: "Aproximación normal a la binomial",
    priority: "alta",
    skill: "Verificar la condición de aproximación y aplicar la corrección de continuidad adecuada.",
    formulas: ["μ = np", "σ = √(npq)", "npq > 9", "Corrección de continuidad: ±0.5"],
    patterns: [/aproximacion normal.*binomial|normal a la binomial/, /npq\s*>\s*9/, /correccion de continuidad|correccion.*0.5/],
    dependencies: ["normal-z"],
  },
  {
    id: "sampling-theory",
    topic: "Teoría de muestreo",
    priority: "alta",
    skill: "Distinguir población, muestra, parámetro, estadístico y muestreo con o sin reemplazo.",
    formulas: ["Con reemplazo: Nⁿ muestras ordenadas posibles"],
    patterns: [/teoria de muestreo/, /poblacion.*muestra.*parametro.*estadistico/, /muestreo (?:con|sin) reemplazo/],
  },
  {
    id: "enumerated-sample-means",
    topic: "Distribución muestral de medias por enumeración",
    priority: "alta",
    skill: "Enumerar todas las muestras con reemplazo, calcular cada media y construir su distribución muestral.",
    formulas: ["x̄ = Σxᵢ/n", "P(x̄) = frecuencia de x̄ / número de muestras"],
    patterns: [/enumerar.*muestras.*reemplazo/, /distribucion muestral de (?:las )?medias.*enumeracion/, /todas las muestras.*medias/],
    dependencies: ["sampling-theory"],
  },
  {
    id: "sample-mean-error",
    topic: "Media muestral, error estándar y corrección finita",
    priority: "alta",
    skill: "Calcular la media y el error estándar de x̄, aplicando la corrección por población finita cuando corresponda.",
    formulas: ["E(x̄) = μ", "σx̄ = σ/√n", "σx̄ = (σ/√n)√((N-n)/(N-1))"],
    patterns: [/media muestral.*error estandar|error estandar.*media muestral/, /correccion por poblacion finita|correccion finita/, /desviacion.*distribucion muestral de (?:las )?medias/],
    dependencies: ["sampling-theory"],
  },
  {
    id: "sample-mean-probability-clt",
    topic: "Probabilidades de la media muestral y TCL",
    priority: "alta",
    skill: "Estandarizar x̄ y usar el Teorema Central del Límite para calcular probabilidades de medias muestrales.",
    formulas: ["Z = (x̄ - μ)/(σ/√n)", "x̄ ≈ N(μ, σ/√n) por TCL"],
    patterns: [/probabilidad(?:es)? de (?:la )?media muestral/, /teorema central del limite|\btcl\b/, /poblacion uniforme discreta.*media/],
    dependencies: ["sample-mean-error"],
  },
  {
    id: "sample-proportions",
    topic: "Distribución muestral de proporciones",
    priority: "alta",
    skill: "Calcular la media, el error estándar y probabilidades de una proporción muestral.",
    formulas: ["E(p̂) = p", "σp̂ = √(pq/n)", "Z = (p̂ - p)/√(pq/n)"],
    patterns: [
      /distribucion muestral de (?:las )?proporciones/,
      /proporcion muestral/,
      /media.*error.*proporcion/,
      /probabilidad.*proximos \d+.*(?:menos del|entre el|mas del).*(?:probabilidades.*nacimientos?|sean (?:ninos|ninas))/,
    ],
    dependencies: ["sampling-theory"],
  },
  {
    id: "sample-variance",
    topic: "Distribucion muestral de la varianza",
    priority: "alta",
    skill: "Trabajar con la distribución de S² y su relación con chi-cuadrado.",
    formulas: ["χ² = (n-1)S²/σ²"],
    patterns: [/distribucion muestral de (?:la )?varianza/, /chi cuadrado.*varianza/],
    dependencies: ["sampling-theory"],
  },
  {
    id: "confidence-intervals",
    topic: "Intervalos de confianza",
    priority: "media",
    skill: "Construir e interpretar intervalos de confianza.",
    formulas: [],
    patterns: [/intervalos? de confianza/],
    dependencies: ["sample-mean-error"],
  },
  {
    id: "hypothesis-testing",
    topic: "Pruebas de hipotesis",
    priority: "media",
    skill: "Plantear hipótesis y tomar decisiones con un estadístico de prueba.",
    formulas: [],
    patterns: [/pruebas? de hipotesis|contraste de hipotesis/],
    dependencies: ["confidence-intervals"],
  },
] as const;

const CATALOGS: readonly CatalogProfile[] = [
  { id: "statistics", coursePattern: /estadistica(?: inferencial)?(?: y muestreo)?/, topics: STATISTICS_TOPICS, assessmentDefinesBoundary: true },
  { id: "waves", coursePattern: /onda|oscilacion/, topics: WAVES_TOPICS },
] as const;

function matches(definition: TopicDefinition, text: string): boolean {
  return definition.patterns.some((pattern) => pattern.test(text));
}

function boundaryIndex(profile: CatalogProfile, evidence: readonly AcademicMaterialEvidence[]): number {
  const boundaries = evidence.filter((item) => item.kind === "boundary");
  const boundarySources = boundaries.length
    ? boundaries
    : profile.assessmentDefinesBoundary ? evidence.filter((item) => item.kind === "assessment") : [];
  if (!boundarySources.length) return profile.topics.length - 1;
  const text = normalizeAcademicText(boundarySources.map((item) => `${item.label} ${item.text}`).join(" "));
  let result = -1;
  profile.topics.forEach((definition, index) => {
    if (matches(definition, text) || text.includes(normalizeAcademicText(definition.topic))) result = Math.max(result, index);
  });
  return result;
}

function decimal(text: string, symbol: string, unit: string): number | null {
  const pattern = new RegExp(`\\b${symbol}\\s*=\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`, "i");
  const match = pattern.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function neat(value: number, digits = 6): string {
  return Number(value.toFixed(digits)).toString();
}

function waveExampleFormulas(text: string): string[] {
  const frequency = decimal(text, "f", "hz");
  const amplitude = decimal(text, "a", "m");
  const speed = decimal(text, "v", "m(?:\\s*\\/\\s*s|\\s*s-1)");
  if (frequency === null || amplitude === null || speed === null || frequency <= 0 || speed <= 0) return [];

  const period = 1 / frequency;
  const wavelength = speed / frequency;
  const omegaPi = 2 * frequency;
  const waveNumberPi = 2 / wavelength;
  const omega = omegaPi === 1 ? "π" : `${neat(omegaPi)}π`;
  const waveNumber = waveNumberPi === 1 ? "π" : waveNumberPi < 1 && Number.isInteger(1 / waveNumberPi)
    ? `π/${neat(1 / waveNumberPi)}`
    : `${neat(waveNumberPi)}π`;

  return [
    `A = ${neat(amplitude)} m`,
    `T = ${period.toFixed(2)} s`,
    `λ = ${neat(wavelength)} m`,
    `ω = ${omega} rad/s`,
    `k = ${waveNumber} rad/m`,
    `y(x,t) = ${neat(amplitude)} sin(${omega}t - (${waveNumber})x)`,
  ];
}

function confidenceFor(evidence: readonly AcademicMaterialEvidence[]): AcademicTopicAnalysis["confidence"] {
  const kinds = new Set(evidence.map((item) => item.kind));
  if (kinds.size >= 2 || kinds.has("notes") || kinds.has("assessment")) return "high";
  return kinds.has("slides") || kinds.has("guide") ? "medium" : "low";
}

/** Builds a profile-specific, evidence-only study map without an AI service. */
export function analyzeAcademicMaterials(
  courseName: string,
  evidence: readonly AcademicMaterialEvidence[],
): readonly AcademicTopicAnalysis[] {
  const normalizedCourse = normalizeAcademicText(courseName);
  const profile = CATALOGS.find((candidate) => candidate.coursePattern.test(normalizedCourse));
  if (!profile) return [];

  const orderedEvidence = evidence
    .map((item, index) => ({ item, index, normalized: normalizeAcademicText(`${item.label} ${item.text}`) }))
    .sort((left, right) => (left.item.order ?? Number.MAX_SAFE_INTEGER) - (right.item.order ?? Number.MAX_SAFE_INTEGER)
      || left.item.sourceId.localeCompare(right.item.sourceId, "es") || left.index - right.index);
  const limit = boundaryIndex(profile, evidence);
  if (limit < 0) return [];

  const active = new Set<string>();
  const results: AcademicTopicAnalysis[] = [];
  profile.topics.forEach((definition, topicIndex) => {
    if (topicIndex > limit) return;
    const sources = orderedEvidence.filter(({ item, normalized }) => SUBSTANTIVE_KINDS.has(item.kind) && matches(definition, normalized));
    const dependenciesMet = (definition.dependencies ?? []).every((dependency) => active.has(dependency));
    if (!sources.length || !dependenciesMet) return;

    active.add(definition.id);
    const sourceRefs = [...new Set(sources.map(({ item }) => item.sourceId))];
    const formulas = definition.id === "sinusoidal-wave"
      ? [...definition.formulas, ...waveExampleFormulas(sources.map(({ normalized }) => normalized).join(" "))]
      : [...definition.formulas];
    results.push(Object.freeze({
      topic: definition.topic,
      priority: sources.some(({ item }) => item.kind === "assessment") ? "maxima" : definition.priority,
      skill: definition.skill,
      formulas: Object.freeze(formulas),
      sourceRefs: Object.freeze(sourceRefs),
      confidence: confidenceFor(sources.map(({ item }) => item)),
      boundary: topicIndex === limit,
    }));
  });
  return Object.freeze(results);
}
