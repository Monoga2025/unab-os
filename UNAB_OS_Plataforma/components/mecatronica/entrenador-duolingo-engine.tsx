"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// TIPOS Y MODELOS DE DATOS
// ============================================================================

export interface OptionChoice {
  id: string;
  intent: string;
  math: string;
  isCorrect: boolean;
  whyWrong?: string | null;
  easyExplanation?: string | null;
}

export interface ExerciseItem {
  id: string;
  topicName: string;
  category: "bernoulli" | "ondas" | "mas" | "circuitos";
  title: string;
  scenario: string;
  clue: string;
  options: OptionChoice[];
  isRetry?: boolean;
}

export interface SessionStats {
  totalAnswered: number;
  correctFirstTry: number;
  retriesCompleted: number;
  streak: number;
  maxStreak: number;
  xp: number;
  hearts: number;
}

// ============================================================================
// BASE DE PREGUNTAS MAESTRA (EDO BERNOULLI, ONDAS, MAS, CIRCUITOS)
// ============================================================================

export const FULL_EXERCISE_BANK: ExerciseItem[] = [
  // --- EDO BERNOULLI (CLASE PROF. LEIDY JOHANNA GONZÁLEZ CELY) ---
  {
    id: "edo_bern_01",
    topicName: "📐 EDO Bernoulli · Prof. Leidy Johanna",
    category: "bernoulli",
    title: "¿Cuál es la sustitución linealizadora exacta para la ecuación diferencial $y' + y = -x/y$ vista en tablero?",
    scenario: "En la clase de la <strong>Prof. Leidy Johanna González Cely</strong>, la ecuación se reescribe como $y' + 1\\cdot y = (-x)y^{-1}$, con $p(x)=1$, $g(x)=-x$ y exponente $a = -1$.",
    clue: "La regla de oro de Bernoulli: la sustitución maestra es siempre $u = y^{1-a}$. Si $a = -1$, entonces $1 - (-1) = 2$.",
    options: [
      {
        id: "b1_opt1",
        intent: "Sustitución Maestra u = y^(1-a) con a = -1",
        math: "u = y^{1 - (-1)} = y^2 \\implies u' + 2u = -2x",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "Al aplicar $u = y^2$, la ecuación no lineal se transforma instantáneamente en la ecuación lineal de 1er orden $u' + 2u = -2x$ sin rodeos algebraicos."
      },
      {
        id: "b1_opt2",
        intent: "Sustitución de variable separable directa",
        math: "u = \\frac{y}{x} \\implies y = ux",
        isCorrect: false,
        whyWrong: "Esa sustitución ($y = ux$) es exclusiva para ecuaciones homogéneas de grado cero $M(x,y)dx + N(x,y)dy = 0$, pero aquí tenemos una no linealidad de potencia $y^{-1}$.",
        easyExplanation: null
      },
      {
        id: "b1_opt3",
        intent: "Sustitución con exponente negativo",
        math: "u = y^{-1} \\implies u' - u = x",
        isCorrect: false,
        whyWrong: "Tomaste $u = y^a$ en vez de $u = y^{1-a}$. Recuerda que el exponente debe ser $1 - a = 1 - (-1) = +2$.",
        easyExplanation: null
      }
    ]
  },
  {
    id: "edo_bern_02",
    topicName: "📐 EDO Bernoulli · Factor Integrante",
    category: "bernoulli",
    title: "¿Cuál es el Factor Integrante $F(x)$ para resolver la ecuación auxiliar linealizada $u' + 2u = -2x$?",
    scenario: "Tras linealizar la ecuación de Bernoulli de clase, tenemos la forma estándar $u' + P(x)u = Q(x)$ donde $P(x) = 2$ y $Q(x) = -2x$.",
    clue: "El factor integrante de una EDO lineal de 1er orden se define como $F(x) = e^{\\int P(x)dx}$. Nunca se agrega la constante $+C$ en este paso.",
    options: [
      {
        id: "b2_opt1",
        intent: "Factor Integrante Exponencial Estándar",
        math: "F(x) = e^{\\int 2 dx} = e^{2x}",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "Integrando $P(x)=2$ obtenemos $\\int 2 dx = 2x$. Por tanto, el factor que multiplica a toda la ecuación para hacerla exacta es $e^{2x}$."
      },
      {
        id: "b2_opt2",
        intent: "Factor Integrante con signo negativo",
        math: "F(x) = e^{-\\int 2 dx} = e^{-2x}",
        isCorrect: false,
        whyWrong: "El signo negativo $e^{-2x}$ se usa cuando despejas la solución final $u(x) = \\frac{1}{F(x)}$, pero el factor integrante $F(x)$ lleva signo positivo $e^{+\\int P dx}$.",
        easyExplanation: null
      },
      {
        id: "b2_opt3",
        intent: "Integración polinómica directa",
        math: "F(x) = \\int (u' + 2u) dx = u + x^2",
        isCorrect: false,
        whyWrong: "No puedes integrar $u'$ directamente sin conocer la función $u(x)$. El método de Leibniz exige el factor exponencial $e^{\\int P dx}$.",
        easyExplanation: null
      }
    ]
  },
  {
    id: "edo_bern_03",
    topicName: "📐 EDO Bernoulli · Despeje Final",
    category: "bernoulli",
    title: "Con la solución en variable auxiliar $u(x) = -x + 1/2 + C e^{-2x}$, ¿cuál es la solución general para $y(x)$?",
    scenario: "Recordando que en el Paso 1 se aplicó la sustitución $u = y^2$ para la ecuación $y' + y = -x/y$.",
    clue: "Como $u = y^2$, para regresar a la incógnita original solo debes despejar $y$ aplicando raíz cuadrada: $y(x) = \\pm \\sqrt{u(x)}$.",
    options: [
      {
        id: "b3_opt1",
        intent: "Despeje con raíz cuadrada y constante arbitraria",
        math: "y(x) = \\pm \\sqrt{-x + \\frac{1}{2} + C e^{-2x}}",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "Exacto. Como $u = y^2$, la función original es $y = \\pm \\sqrt{u}$. Con la condición inicial $y(0)=1$, la constante resulta $C=1/2$."
      },
      {
        id: "b3_opt2",
        intent: "Elevación al cuadrado errónea",
        math: "y(x) = \\left( -x + \\frac{1}{2} + C e^{-2x} \\right)^2",
        isCorrect: false,
        whyWrong: "Si $u = y^2$, entonces $y = \\sqrt{u}$, no $y = u^2$. Elevar al cuadrado da una dimensión de potencia 4.",
        easyExplanation: null
      },
      {
        id: "b3_opt3",
        intent: "Despeje logarítmico",
        math: "y(x) = \\ln\\left| -x + \\frac{1}{2} + C e^{-2x} \\right|",
        isCorrect: false,
        whyWrong: "El logaritmo natural solo se aplicaría si la sustitución hubiese sido $u = e^y$, pero aquí tuvimos una potencia cuadrática $u = y^2$.",
        easyExplanation: null
      }
    ]
  },

  // --- ONDAS & CUERDAS (SECCIÓN 15) ---
  {
    id: "15.12",
    topicName: "🌊 Ondas & Cuerdas",
    category: "ondas",
    title: "¿Qué fórmula relaciona la velocidad máxima de vibración vertical ($v_y$) con la rapidez de la onda ($v$)?",
    scenario: "Dada la ecuación $y = A\\cos(kx - \\omega t)$, queremos que la <strong>velocidad máxima de vibración de las partículas</strong> sea igual a la rapidez con la que viaja la onda hacia adelante.",
    clue: "La onda viaja a rapidez constante $v$, pero las partículas suben y bajan con velocidad que cambia al derivar en el tiempo: $v_{y,\\max} = \\omega A$.",
    options: [
      {
        id: "1512_opt1",
        intent: "Velocidad de partícula (Derivada temporal) igualada a v",
        math: "v_{y,\\max} = \\omega A = \\left(\\frac{2\\pi v}{\\lambda}\\right) A \\implies A = \\frac{\\lambda}{2\\pi}",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "Al derivar respecto al tiempo, la velocidad de vibración máxima es $\\omega A$. Como $\\omega = 2\\pi v / \\lambda$, al igualar ambas velocidades se cancela $v$ y te queda directamente $A = \\lambda / 2\\pi$."
      },
      {
        id: "1512_opt2",
        intent: "Fórmula de Tensión por Masa Colgante",
        math: "v = \\sqrt{\\frac{T}{\\mu}} \\implies T = mg",
        isCorrect: false,
        whyWrong: "Esa fórmula es para calcular la velocidad de propagación de un pulso con una masa suspendida, no compara la oscilación vertical de los átomos.",
        easyExplanation: null
      },
      {
        id: "1512_opt3",
        intent: "Fórmula de Potencia Media de onda",
        math: "P_{\\mathrm{med}} = \\frac{1}{2}\\mu \\omega^2 A^2 v",
        isCorrect: false,
        whyWrong: "Esta fórmula calcula la tasa de transporte de energía en Watts, no la velocidad cinemática de un elemento de masa.",
        easyExplanation: null
      }
    ]
  },
  {
    id: "15.44",
    topicName: "🎸 Ondas Estacionarias",
    category: "ondas",
    title: "Una guitarra emite un sonido al aire: ¿Qué fórmula relaciona la cuerda con el aire?",
    scenario: "Una cuerda fija produce el <strong>segundo sobretono ($n = 3$)</strong> y emite sonido al aire con longitud $\\lambda_{aire} = 3.35\\text{ cm}$. Queremos hallar la tensión $T$ de la cuerda.",
    clue: "La clave física: La frecuencia $f$ en el aire y en la cuerda ES EXACTAMENTE LA MISMA (el aire es forzado a vibrar al mismo compás que la cuerda).",
    options: [
      {
        id: "1544_opt1",
        intent: "Frecuencia compartida + Armónico n=3 + Tensión",
        math: "f = \\frac{v_{aire}}{\\lambda_{aire}}, \\quad \\lambda_3 = \\frac{2L}{3}, \\quad T = \\mu (f \\cdot \\lambda_3)^2",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "1) Obtienes $f = v_{aire}/\\lambda_{aire}$. 2) Como es el 3er armónico en cuerda fija, $\\lambda_{cuerda} = 2L/3$. 3) La rapidez en la cuerda es $v = f\\lambda$, y la tensión sale con $T = \\mu v^2$."
      },
      {
        id: "1544_opt2",
        intent: "Fórmula de Resorte Oscilante M.A.S.",
        math: "\\omega = \\sqrt{\\frac{k}{m}}, \\quad T = 2\\pi\\sqrt{\\frac{m}{k}}",
        isCorrect: false,
        whyWrong: "¡Cuidado! Esta fórmula modela un resorte mecánico con masa puntual, no ondas continuas en cuerdas acústicas.",
        easyExplanation: null
      },
      {
        id: "1544_opt3",
        intent: "Fórmula de tubo semi-abierto (armónicos impares)",
        math: "\\lambda_n = \\frac{4L}{n}, \\quad T = \\mu v^2",
        isCorrect: false,
        whyWrong: "El divisor $4L/n$ corresponde a tubos o cuerdas con un extremo libre. Una cuerda de guitarra siempre está empotrada en ambos extremos ($2L/n$).",
        easyExplanation: null
      }
    ]
  },
  {
    id: "15.50",
    topicName: "🌊 Lectura de Ecuación de Onda",
    category: "ondas",
    title: "Dada la ecuación $y(x,t) = A\\cos(kx - \\omega t)$, ¿cómo extraes la rapidez $v$ y la frecuencia $f$?",
    scenario: "En el parcial te dan la ecuación numérica $y = 0.05\\cos(4.0x - 12.0t)$. ¿Cómo calculas con precisión $f$ y la velocidad $v$?",
    clue: "Lo que acompaña a 'x' es siempre el número de onda $k = 2\\pi/\\lambda$. Lo que acompaña a 't' es siempre la frecuencia angular $\\omega = 2\\pi f$.",
    options: [
      {
        id: "1550_opt1",
        intent: "Despeje directo de coeficientes angulares",
        math: "f = \\frac{\\omega}{2\\pi}, \\quad \\lambda = \\frac{2\\pi}{k}, \\quad v = \\frac{\\omega}{k} = \\lambda f",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "Como el número junto a $t$ es $\\omega = 2\\pi f$, divides $\\omega / 2\\pi$ para los Hertz ($f = 12 / 2\\pi = 1.91\\text{ Hz}$). Y la velocidad de avance es $v = \\omega / k = 12 / 4 = 3\\text{ m/s}$."
      },
      {
        id: "1550_opt2",
        intent: "Multiplicar k por omega",
        math: "v = \\omega \\cdot k, \\quad f = 2\\pi \\omega",
        isCorrect: false,
        whyWrong: "Si multiplicas $\\omega \\cdot k$ las unidades resultan en $\\text{rad}^2/(\\text{m}\\cdot\\text{s})$. La velocidad física siempre proviene del cociente $\\omega / k$ (m/s).",
        easyExplanation: null
      },
      {
        id: "1550_opt3",
        intent: "Cinemática de caída libre",
        math: "v = \\sqrt{2gh}, \\quad t = \\sqrt{\\frac{2h}{g}}",
        isCorrect: false,
        whyWrong: "Esta ecuación describe un cuerpo acelerado por la gravedad terrestre en caída libre, no una onda armónica senoidal.",
        easyExplanation: null
      }
    ]
  },
  {
    id: "15.41",
    topicName: "⚖️ Masa Colgante y Tensión",
    category: "ondas",
    title: "¿Qué fórmula determina la rapidez de onda cuando la tensión proviene de un peso suspendido?",
    scenario: "Una cuerda horizontal pasa por una polea ideal y en el extremo libre cuelga una masa <strong>$M$ suspendida en equilibrio estático</strong>.",
    clue: "Si la masa está en reposo colgando, la sumatoria de fuerzas verticales da $T - Mg = 0 \\implies T = Mg$.",
    options: [
      {
        id: "1541_opt1",
        intent: "Equilibrio estático + Rapidez en cuerda",
        math: "T = M g \\implies v = \\sqrt{\\frac{T}{\\mu}} = \\sqrt{\\frac{Mg}{\\mu}}",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "El peso del bloque ($Mg$) estira la cuerda generando la fuerza de tensión $T$. Luego la onda transversal se propaga a velocidad $v = \\sqrt{T/\\mu}$."
      },
      {
        id: "1541_opt2",
        intent: "Energía cinética en lugar de fuerza",
        math: "T = \\frac{1}{2} M v^2 \\implies v = \\sqrt{\\frac{2T}{M}}",
        isCorrect: false,
        whyWrong: "Confundiste fuerza con energía: $\\frac{1}{2}Mv^2$ se mide en Joules, mientras que la tensión es una fuerza vectorial en Newtons ($Mg$).",
        easyExplanation: null
      },
      {
        id: "1541_opt3",
        intent: "Periodo de péndulo simple",
        math: "T = 2\\pi\\sqrt{\\frac{L}{g}}",
        isCorrect: false,
        whyWrong: "Esta fórmula calcula el Periodo $T$ (tiempo en segundos de oscilación de un péndulo), pero el problema pide la Tensión $T$ (fuerza en Newtons). ¡Cuidado con la letra T!",
        easyExplanation: null
      }
    ]
  },

  // --- MOVIMIENTO ARMÓNICO SIMPLE (M.A.S.) ---
  {
    id: "mas_p19",
    topicName: "🌀 M.A.S. Masa-Resorte",
    category: "mas",
    title: "¿Cómo calcular el periodo de oscilación ($T$) de una masa acoplada a un resorte horizontal?",
    scenario: "Un bloque de masa $m = 0.5\\text{ kg}$ se desliza sobre una superficie sin fricción atado a un resorte de rigidez <strong>$k = 200\\text{ N/m}$</strong>.",
    clue: "En osciladores elásticos: La rigidez $k$ genera la fuerza restitutiva y la masa $m$ aporta la inercia: $\\omega = \\sqrt{k/m}$. El periodo es $T = 2\\pi/\\omega$.",
    options: [
      {
        id: "mas19_opt1",
        intent: "Frecuencia angular y periodo para resorte",
        math: "\\omega = \\sqrt{\\frac{k}{m}}, \\quad T = \\frac{2\\pi}{\\omega} = 2\\pi \\sqrt{\\frac{m}{k}}",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "La constante $k$ intenta regresar la masa al equilibrio y la inercia $m$ se opone. Por tanto $\\omega = \\sqrt{k/m}$ y el periodo es $T = 2\\pi\\sqrt{m/k}$."
      },
      {
        id: "mas19_opt2",
        intent: "Fórmula de Péndulo Simple gravitacional",
        math: "\\omega = \\sqrt{\\frac{g}{L}}, \\quad T = 2\\pi \\sqrt{\\frac{L}{g}}",
        isCorrect: false,
        whyWrong: "Esta expresión es exclusiva para un péndulo gravitacional oscilando en arcos pequeños, pero este sistema es un resorte elástico horizontal.",
        easyExplanation: null
      },
      {
        id: "mas19_opt3",
        intent: "Fórmula de Onda transversal en Cuerda",
        math: "v = \\sqrt{\\frac{T_{tens}}{\\mu}}, \\quad f = \\frac{v}{\\lambda}",
        isCorrect: false,
        whyWrong: "Aquí no hay ondas viajeras continuas ni cuerdas continuas; es una sola masa discreta oscilando en torno a su origen.",
        easyExplanation: null
      }
    ]
  },
  {
    id: "mas_p20",
    topicName: "⚡ Conservación de Energía en M.A.S.",
    category: "mas",
    title: "¿Cómo calcular la velocidad del bloque en una posición intermedia $x$ sin conocer el tiempo?",
    scenario: "Un resorte se estiró inicialmente hasta una amplitud $A$. ¿Cómo hallas la <strong>velocidad en cualquier coordenada $x$</strong> directamente?",
    clue: "Usa Conservación de la Energía Mecánica: La energía total en el extremo ($E_{tot} = \\frac{1}{2}kA^2$) se reparte entre cinética y elástica.",
    options: [
      {
        id: "mas20_opt1",
        intent: "Conservación de Energía Mecánica Total",
        math: "\\frac{1}{2} k A^2 = \\frac{1}{2} m v^2 + \\frac{1}{2} k x^2 \\implies v = \\pm \\omega \\sqrt{A^2 - x^2}",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "La energía total $\\frac{1}{2}kA^2$ es constante. Al restarle la energía potencial almacenada en la posición $x$ ($\\frac{1}{2}kx^2$), el remanente es pura energía cinética."
      },
      {
        id: "mas20_opt2",
        intent: "Cinemática temporal directa",
        math: "v = -\\omega A \\sin(\\omega t)",
        isCorrect: false,
        whyWrong: "Esta ecuación requiere conocer el instante de tiempo $t$. Cuando te dan la posición espacial $x$, la relación por energía evita calcular tiempos intermedios.",
        easyExplanation: null
      },
      {
        id: "mas20_opt3",
        intent: "Pérdida por fricción no conservativa",
        math: "W_{fric} = \\mu_k m g d",
        isCorrect: false,
        whyWrong: "El enunciado asume superficie ideal sin fricción; la energía mecánica total se conserva sin degradación térmica.",
        easyExplanation: null
      }
    ]
  },

  // --- CIRCUITOS ELÉCTRICOS (NODOS Y MALLAS) ---
  {
    id: "circ_01",
    topicName: "🔌 Análisis Nodal (LCK)",
    category: "circuitos",
    title: "¿Cómo formular la Ley de Corrientes de Kirchhoff (LCK) en un nodo principal de voltaje desconocido $V_1$?",
    scenario: "En un circuito lineal, el nodo $V_1$ está interconectado a dos fuentes de voltaje $V_{s1}$ y $V_{s2}$ a través de los resistores $R_1, R_2$ y a tierra mediante $R_3$.",
    clue: "Regla sistemática de Nodos: Sumatoria de corrientes salientes $= 0$. Cada corriente es $(V_{nodo} - V_{vecino}) / R_{rama}$.",
    options: [
      {
        id: "c1_opt1",
        intent: "Ecuación Nodal Estándar de Corrientes Salientes",
        math: "\\sum I_{\\text{salientes}} = 0 \\implies \\frac{V_1 - V_{s1}}{R_1} + \\frac{V_1 - V_{s2}}{R_2} + \\frac{V_1 - 0}{R_3} = 0",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "Por la Ley de Ohm, la corriente en cada rama saliente es la diferencia de potencial dividida entre la resistencia de dicha rama. Igualando a cero se despeja $V_1$ linealmente."
      },
      {
        id: "c1_opt2",
        intent: "Ley de Voltajes de Mallas (LVK)",
        math: "\\sum V = 0 \\implies -V_{s1} + R_1 I_1 + R_2(I_1 - I_2) = 0",
        isCorrect: false,
        whyWrong: "Esta es la formulación de MALLAS con corrientes de lazo, pero para análisis NODAL se plantean ecuaciones de voltajes de nodo divididos entre resistencias.",
        easyExplanation: null
      },
      {
        id: "c1_opt3",
        intent: "Divisor de Voltaje Simple en Serie",
        math: "V_1 = V_{s1} \\left(\\frac{R_2}{R_1 + R_2}\\right)",
        isCorrect: false,
        whyWrong: "El divisor de voltaje simple solo es válido si existe una única fuente con resistencias estrictamente en serie. Con ramas múltiples en paralelo genera un error grave.",
        easyExplanation: null
      }
    ]
  },
  {
    id: "circ_02",
    topicName: "🔌 Potencia y Efecto Joule",
    category: "circuitos",
    title: "¿Qué fórmula calcula la potencia disipada en calor por un resistor de valor $R$ por el que circula corriente $I$?",
    scenario: "Queremos determinar la disipación térmica en Watts generada por el resistor limitador de corriente para evitar sobrecalentamiento del circuito.",
    clue: "Por la ley de Joule: $P = V \\cdot I$. Sustituyendo la Ley de Ohm ($V = I R$), se obtiene $P = I^2 R = V^2 / R$.",
    options: [
      {
        id: "c2_opt1",
        intent: "Ley de Joule cuadrática en corriente",
        math: "P = I^2 R = \\frac{V^2}{R} = V \\cdot I \\quad [\\text{Watts}]",
        isCorrect: true,
        whyWrong: null,
        easyExplanation: "La potencia térmica transferida por efecto Joule escala con el cuadrado de la corriente multiplicada por la resistencia óhmica."
      },
      {
        id: "c2_opt2",
        intent: "Energía almacenada en inductor magnético",
        math: "E_L = \\frac{1}{2} L I^2 \\quad [\\text{Joules}]",
        isCorrect: false,
        whyWrong: "Esta fórmula calcula la energía magnética almacenada temporalmente en una bobina (inductor), no la disipación disipativa resistiva en Watts.",
        easyExplanation: null
      },
      {
        id: "c2_opt3",
        intent: "Carga de capacitor electrostático",
        math: "Q = C \\cdot V, \\quad E_C = \\frac{1}{2} C V^2",
        isCorrect: false,
        whyWrong: "Esta fórmula calcula la carga y energía en el campo electrostático de un condensador, no el calor disipado en un resistor.",
        easyExplanation: null
      }
    ]
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL: ENTRENADOR DUOLINGO ENGINE
// ============================================================================

export function EntrenadorDuolingoEngine({
  initialCategory = "all",
  onSessionFinish,
}: {
  initialCategory?: "all" | "bernoulli" | "ondas" | "mas" | "circuitos";
  onSessionFinish?: (stats: SessionStats) => void;
}) {
  // Filtro de categoría
  const [selectedCategory, setSelectedCategory] = useState<"all" | "bernoulli" | "ondas" | "mas" | "circuitos">(initialCategory);

  // Cola de Spaced Repetition activa
  const [sessionQueue, setSessionQueue] = useState<ExerciseItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Estados de Gamificación
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(5);
  const [retriesCompleted, setRetriesCompleted] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctFirstTry, setCorrectFirstTry] = useState<number>(0);

  // Estado de interacción por pregunta
  const [answeredState, setAnsweredState] = useState<"unanswered" | "correct" | "incorrect">("unanswered");
  const [selectedOption, setSelectedOption] = useState<OptionChoice | null>(null);
  const [currentShuffledOptions, setCurrentShuffledOptions] = useState<OptionChoice[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Referencia Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --------------------------------------------------------------------------
  // SINTETIZADOR DE AUDIO WEB AUDIO API (Harmonic Chord & Low Error Tone)
  // --------------------------------------------------------------------------
  const playSoundEffect = useCallback((isCorrect: boolean) => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (isCorrect) {
        // Acorde armónico ascendente de victoria (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0.08, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.35);
        });
      } else {
        // Tono grave disonante de advertencia
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.25); // D3

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio no bloqueante
    }
  }, []);

  // --------------------------------------------------------------------------
  // DISPARADOR DE CONFETTI DINÁMICO
  // --------------------------------------------------------------------------
  const fireConfetti = useCallback(() => {
    if (typeof window !== "undefined" && (window as unknown as { confetti?: (opts: unknown) => void }).confetti) {
      (window as unknown as { confetti: (opts: unknown) => void }).confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.8 },
      });
    }
  }, []);

  // --------------------------------------------------------------------------
  // INICIALIZADOR DE SESIÓN (TRUE SPACED REPETITION)
  // --------------------------------------------------------------------------
  const initSession = useCallback(() => {
    let pool = [...FULL_EXERCISE_BANK];
    if (selectedCategory !== "all") {
      pool = pool.filter((item) => item.category === selectedCategory);
    }
    // Barajado inicial aleatorio
    const shuffled = pool.sort(() => Math.random() - 0.5).map((item) => ({ ...item, isRetry: false }));

    setSessionQueue(shuffled);
    setCurrentIdx(0);
    setAnsweredState("unanswered");
    setSelectedOption(null);
    setIsCompleted(false);

    if (shuffled.length > 0) {
      // Barajar opciones de la primera pregunta
      const opts = [...shuffled[0].options].sort(() => Math.random() - 0.5);
      setCurrentShuffledOptions(opts);
    }
  }, [selectedCategory]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Cargar opciones barajadas al avanzar de pregunta
  const prepareQuestion = useCallback((ex: ExerciseItem) => {
    const opts = [...ex.options].sort(() => Math.random() - 0.5);
    setCurrentShuffledOptions(opts);
    setSelectedOption(null);
    setAnsweredState("unanswered");
  }, []);

  // --------------------------------------------------------------------------
  // EVALUACIÓN INSTANTÁNEA ONE-TAP
  // --------------------------------------------------------------------------
  const handleSelectOption = (opt: OptionChoice) => {
    if (answeredState !== "unanswered") return; // Evitar multi-clics

    const currentEx = sessionQueue[currentIdx];
    if (!currentEx) return;

    setSelectedOption(opt);
    setTotalAnswered((prev) => prev + 1);

    if (opt.isCorrect) {
      // RESPUESTA CORRECTA
      setAnsweredState("correct");
      playSoundEffect(true);

      if (currentEx.isRetry) {
        // Acierto en pregunta reagendada
        setXp((prev) => prev + 5);
        setRetriesCompleted((prev) => prev + 1);
      } else {
        // Acierto limpio a la primera
        setXp((prev) => prev + 15);
        setStreak((prev) => {
          const next = prev + 1;
          setMaxStreak((m) => Math.max(m, next));
          return next;
        });
        setCorrectFirstTry((prev) => prev + 1);
        fireConfetti();
      }
    } else {
      // RESPUESTA INCORRECTA
      setAnsweredState("incorrect");
      playSoundEffect(false);
      setStreak(0);
      setHearts((prev) => Math.max(0, prev - 1));

      // ALGORITMO TRUE SPACED REPETITION:
      // Reinsertar pregunta con flag isRetry para consolidar memoria a largo plazo
      const retryItem: ExerciseItem = { ...currentEx, isRetry: true };
      setSessionQueue((prevQueue) => {
        const newQueue = [...prevQueue];
        const minDistance = 3;
        const remainingSlots = newQueue.length - (currentIdx + minDistance);

        if (remainingSlots > 0) {
          const targetIndex = currentIdx + minDistance + Math.floor(Math.random() * remainingSlots);
          newQueue.splice(targetIndex, 0, retryItem);
        } else {
          newQueue.push(retryItem); // Al final de la sesión
        }
        return newQueue;
      });
    }
  };

  // --------------------------------------------------------------------------
  // AVANZAR AL SIGUIENTE EJERCICIO O FINALIZAR
  // --------------------------------------------------------------------------
  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= sessionQueue.length || hearts <= 0) {
      setIsCompleted(true);
      if (onSessionFinish) {
        onSessionFinish({
          totalAnswered,
          correctFirstTry,
          retriesCompleted,
          streak,
          maxStreak,
          xp,
          hearts,
        });
      }
    } else {
      setCurrentIdx(nextIdx);
      prepareQuestion(sessionQueue[nextIdx]);
    }
  };

  const currentEx = sessionQueue[currentIdx];
  const progressPercent = sessionQueue.length > 0 ? Math.min(100, Math.round((currentIdx / sessionQueue.length) * 100)) : 0;

  return (
    <div className="entrenador-duolingo-engine-root" style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>
      {/* -------------------------------------------------------------------- */}
      {/* BARRA SUPERIOR HUD DE GAMIFICACIÓN                                   */}
      {/* -------------------------------------------------------------------- */}
      <header
        className="engine-hud-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          background: "rgba(11, 15, 25, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "16px",
          marginBottom: "18px",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        {/* Lado Izquierdo: Categoría y Barra de Progreso */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "220px" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">🎯 Todos los Temas ({FULL_EXERCISE_BANK.length})</option>
            <option value="bernoulli">📐 EDO Bernoulli (Prof. Leidy)</option>
            <option value="ondas">🌊 Ondas & Cuerdas (Física)</option>
            <option value="mas">🌀 Movimiento Armónico (M.A.S.)</option>
            <option value="circuitos">🔌 Circuitos & Nodos</option>
          </select>

          {/* Barra de Progreso Visual */}
          <div
            style={{
              flex: 1,
              height: "10px",
              background: "#1e293b",
              borderRadius: "6px",
              overflow: "hidden",
              minWidth: "100px",
            }}
            title={`Progreso: ${currentIdx} de ${sessionQueue.length}`}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #10b981, #38bdf8)",
                transition: "width 0.35s ease-out",
                borderRadius: "6px",
              }}
            />
          </div>
        </div>

        {/* Lado Derecho: Estadísticas Gamificadas */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Racha de Fuego */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#f97316",
              fontWeight: 800,
              fontSize: "0.92rem",
            }}
            title="Racha de aciertos seguidos a la primera"
          >
            <span>🔥</span> <span>{streak}</span>
          </div>

          {/* XP Ganados */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#fbbf24",
              fontWeight: 800,
              fontSize: "0.92rem",
            }}
            title="Puntos de experiencia XP"
          >
            <span>⚡</span> <span>{xp} XP</span>
          </div>

          {/* Vidas / Corazones */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#ef4444",
              fontWeight: 800,
              fontSize: "0.92rem",
            }}
            title="Vidas restantes"
          >
            <span>❤️</span> <span>{hearts}</span>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* PANTALLA DE FINALIZACIÓN O COCKPIT DE PREGUNTAS                      */}
      {/* -------------------------------------------------------------------- */}
      {isCompleted ? (
        <div
          className="engine-completion-card"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "20px",
            padding: "36px 24px",
            textAlign: "center",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "3.8rem", marginBottom: "14px" }}>
            {hearts > 0 ? "🏆" : "💔"}
          </div>
          <h2 style={{ fontSize: "1.8rem", color: hearts > 0 ? "#4ade80" : "#f87171", marginBottom: "10px" }}>
            {hearts > 0 ? "¡Entrenamiento Completado con Éxito!" : "¡Te has quedado sin vidas!"}
          </h2>
          <p style={{ color: "#cbd5e1", maxWidth: "600px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            {hearts > 0
              ? "Has superado la sesión aplicando el algoritmo True Spaced Repetition. Todos tus errores fueron repasados y afianzados."
              : "No te preocupes, el error es parte del aprendizaje. Repite la sesión para consolidar las fórmulas clave."}
          </p>

          <div
            style={{
              display: "inline-flex",
              gap: "24px",
              background: "#090d16",
              padding: "16px 28px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "28px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fbbf24" }}>{xp}</div>
              <small style={{ color: "#94a3b8" }}>Total XP</small>
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f97316" }}>{maxStreak}</div>
              <small style={{ color: "#94a3b8" }}>Mejor Racha</small>
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#4ade80" }}>{correctFirstTry}</div>
              <small style={{ color: "#94a3b8" }}>Aciertos Limpios</small>
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#38bdf8" }}>{retriesCompleted}</div>
              <small style={{ color: "#94a3b8" }}>Repasos Salvados</small>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setHearts(5);
                initSession();
              }}
              style={{
                background: "linear-gradient(135deg, #10b981, #06b6d4)",
                color: "#04131a",
                border: "none",
                borderRadius: "12px",
                padding: "14px 32px",
                fontWeight: 800,
                fontSize: "1.05rem",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)",
              }}
            >
              🔄 REPETIR SESIÓN DE ENTRENAMIENTO
            </button>
          </div>
        </div>
      ) : currentEx ? (
        <div className="engine-active-stage">
          {/* AI Coach Speech Bubble */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              borderLeft: "4px solid #a855f7",
              borderRadius: "14px",
              padding: "12px 18px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.92rem", color: "#e2e8f0" }}>
              <span style={{ fontSize: "1.5rem" }}>🤖</span>
              <span>
                {currentEx.isRetry ? (
                  <>
                    <strong>Repaso Reagendado (Spaced Repetition):</strong> Veamos si ahora reconoces la fórmula por pura deducción lógica.
                  </>
                ) : (
                  <>
                    Toca directamente la fórmula que usarías en el parcial. <strong>¡Evaluación instantánea One-Tap!</strong>
                  </>
                )}
              </span>
            </div>
            {currentEx.isRetry && (
              <span
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                🔁 REPASO REAGENDADO
              </span>
            )}
          </div>

          {/* Tarjeta Principal del Ejercicio */}
          <div
            className="engine-question-card"
            style={{
              background: "rgba(19, 26, 43, 0.95)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: "20px",
              padding: "24px 22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              marginBottom: "20px",
            }}
          >
            {/* Cabecera del Ejercicio */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span
                style={{
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                {currentEx.topicName}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "0.82rem", fontWeight: 600, fontFamily: "monospace" }}>
                Ejercicio {currentEx.id} · {currentIdx + 1}/{sessionQueue.length}
              </span>
            </div>

            {/* Título de la Pregunta */}
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", lineHeight: "1.4", marginBottom: "14px" }}>
              {currentEx.title}
            </h3>

            {/* Escenario y Pistas */}
            <div
              style={{
                background: "#0d131f",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "14px 16px",
                fontSize: "0.95rem",
                color: "#cbd5e1",
                lineHeight: "1.55",
                marginBottom: "20px",
              }}
              dangerouslySetInnerHTML={{ __html: currentEx.scenario }}
            />

            {/* Prompt de selección */}
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>👇</span> Toca la fórmula que resuelve este ejercicio (evaluación instantánea):
            </div>

            {/* Lista de Opciones One-Tap */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {currentShuffledOptions.map((opt, idx) => {
                const isSelected = selectedOption?.id === opt.id;
                const isAnswered = answeredState !== "unanswered";

                let cardBg = "rgba(30, 41, 59, 0.7)";
                let cardBorder = "rgba(255, 255, 255, 0.1)";
                let cardGlow = "none";

                if (isAnswered) {
                  if (opt.isCorrect) {
                    cardBg = "rgba(34, 197, 94, 0.2)";
                    cardBorder = "#22c55e";
                    cardGlow = "0 0 16px rgba(34, 197, 94, 0.35)";
                  } else if (isSelected && !opt.isCorrect) {
                    cardBg = "rgba(239, 68, 68, 0.2)";
                    cardBorder = "#ef4444";
                    cardGlow = "0 0 16px rgba(239, 68, 68, 0.35)";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt)}
                    style={{
                      background: cardBg,
                      border: `2px solid ${cardBorder}`,
                      borderRadius: "14px",
                      padding: "14px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      cursor: isAnswered ? "default" : "pointer",
                      textAlign: "left",
                      boxShadow: cardGlow,
                      transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                      outline: "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: isAnswered && opt.isCorrect ? "#4ade80" : isAnswered && isSelected && !opt.isCorrect ? "#f87171" : "#38bdf8",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        Opción {idx + 1}: {opt.intent}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        {isAnswered ? (opt.isCorrect ? "✓ Correcto" : isSelected ? "✕ Incorrecto" : "") : "Toca para elegir"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "1.1rem",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontFamily: "ui-monospace, monospace",
                        padding: "4px 0",
                      }}
                    >
                      {opt.math}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CAJÓN DESLIZANTE DE FEEDBACK (DUOLINGO STYLE SHEET)              */}
          {/* ---------------------------------------------------------------- */}
          {answeredState !== "unanswered" && (
            <div
              className="engine-feedback-drawer"
              style={{
                marginTop: "16px",
                background: answeredState === "correct" ? "#0b2617" : "#2b0e13",
                borderTop: `3px solid ${answeredState === "correct" ? "#22c55e" : "#ef4444"}`,
                borderRadius: "18px",
                padding: "20px 22px",
                boxShadow: "0 -8px 30px rgba(0,0,0,0.6)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.4rem" }}>{answeredState === "correct" ? "🎉" : "❌"}</span>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: answeredState === "correct" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {answeredState === "correct"
                      ? currentEx.isRetry
                        ? "¡Bien hecho! Ya dominas este error."
                        : "¡Fórmula Correcta a la Primera!"
                      : "Fórmula Incorrecta (Cero puntos)"}
                  </h4>
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    background: answeredState === "correct" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                    color: answeredState === "correct" ? "#4ade80" : "#f87171",
                  }}
                >
                  {answeredState === "correct" ? (currentEx.isRetry ? "+5 XP (Recuperado)" : "+15 XP Ganados") : "+0 XP | Racha rota"}
                </div>
              </div>

              {/* Cajas explicativas */}
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "0.92rem",
                  lineHeight: "1.55",
                  color: "#f1f5f9",
                }}
              >
                {/* Pista Clave */}
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase" }}>
                    🔍 PISTA CLAVE DEL ENUNCIADO:
                  </span>
                  <p style={{ margin: "2px 0 0", color: "#fef08a", fontWeight: 600 }}>{currentEx.clue}</p>
                </div>

                {/* Explicación Sencilla */}
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>
                    💡 EXPLICACIÓN SENCILLA:
                  </span>
                  <p style={{ margin: "2px 0 0" }}>
                    {answeredState === "correct"
                      ? selectedOption?.easyExplanation || currentEx.options.find((o) => o.isCorrect)?.easyExplanation
                      : `La fórmula que debías usar era: ${currentEx.options.find((o) => o.isCorrect)?.math}. ${
                          currentEx.options.find((o) => o.isCorrect)?.easyExplanation || ""
                        }`}
                  </p>
                </div>

                {/* Análisis de Trampas (si se equivocó) */}
                {answeredState === "incorrect" && selectedOption?.whyWrong && (
                  <div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f87171", textTransform: "uppercase" }}>
                      ❌ POR QUÉ LA OTRA FÓRMULA NO APLICA AQUÍ:
                    </span>
                    <p style={{ margin: "2px 0 0", color: "#fca5a5" }}>{selectedOption.whyWrong}</p>
                  </div>
                )}
              </div>

              {/* Botón de Continuar */}
              <button
                type="button"
                onClick={handleNext}
                style={{
                  alignSelf: "flex-end",
                  background: answeredState === "correct" ? "#22c55e" : "#ef4444",
                  color: answeredState === "correct" ? "#04131a" : "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 30px",
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: answeredState === "correct" ? "0 0 16px rgba(34,197,94,0.4)" : "none",
                  transition: "transform 0.15s ease",
                }}
              >
                CONTINUAR →
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
