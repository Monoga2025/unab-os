/** Source-grounded, deterministic brief; it does not depend on an AI service. */
export const DIFFERENTIAL_EQUATIONS_BRIEF = Object.freeze({
  courseId: "765",
  title: "Ecuaciones Diferenciales · Unidad I",
  summary: "Plan basado en las tres diapositivas disponibles en TEMA. No afirma una fecha de evaluación.",
  actions: Object.freeze([
    Object.freeze({ title: "1. Asegurá las derivadas", detail: "Repasá suma, producto, cociente y regla de la cadena antes de trabajar con EDO.", candidateId: "candidate-0241", resourceLabel: "Introducción a las Ecuaciones Diferenciales" }),
    Object.freeze({ title: "2. Leé la representación", detail: "Distinguí la forma implícita F(x, y, y') = 0 de la forma explícita y' = f(x, y); identificá el orden y el intervalo de validez.", candidateId: "candidate-0242", resourceLabel: "Soluciones de una Ecuación Diferencial" }),
    Object.freeze({ title: "3. Verificá, no adivines", detail: "Derivá la función propuesta y sustituila en la EDO, indicando el intervalo donde es válida.", candidateId: "candidate-0242", resourceLabel: "Soluciones de una Ecuación Diferencial" }),
    Object.freeze({ title: "4. Cerrá con equilibrio y PVI", detail: "Para equilibrio, imponé y' = 0. Luego usá las condiciones iniciales para pasar de una solución general a una particular.", candidateId: "candidate-0243", resourceLabel: "Problemas de Valor Inicial" }),
  ]),
  resources: Object.freeze([
    Object.freeze({ candidateId: "candidate-0241", label: "Introducción a las Ecuaciones Diferenciales", detail: "Reglas de derivación y regla de la cadena" }),
    Object.freeze({ candidateId: "candidate-0242", label: "Soluciones de una Ecuación Diferencial", detail: "Forma, orden, sustitución e intervalo" }),
    Object.freeze({ candidateId: "candidate-0243", label: "Problemas de Valor Inicial", detail: "Equilibrio, solución general, particular y PVI" }),
  ]),
});
