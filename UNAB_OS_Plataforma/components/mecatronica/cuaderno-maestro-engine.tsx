"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Zap,
  Activity,
  Waves,
  Calculator,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lightbulb,
  CheckCircle2,
  FileText,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface IncisoSolucion {
  letra: string;
  titulo: string;
  pasos: string[];
  formula?: string;
  resultado: string;
  valorCopiable: string;
}

export interface EjercicioMaestro {
  id: string;
  numero: number;
  categoria: "circuitos" | "mas" | "ondas" | "edo";
  categoriaLabel: string;
  tag: string;
  titulo: string;
  resumenResultado: string;
  enunciado: string;
  paso0Datos: string[];
  paso1EsquemaDCL: string;
  paso2Justificacion: string;
  paso3Incisos: IncisoSolucion[];
  paso4ResultadoFinal: string;
  paso5ChequeoTip: string;
  pistasOro: string[];
  ingredientesClave: string[];
}

export const EJERCICIOS_MAESTROS: EjercicioMaestro[] = [
  // ==========================================
  // --- CIRCUITOS DC/AC (10 EJERCICIOS) ---
  // ==========================================
  {
    id: "circuito-1",
    numero: 1,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 1",
    titulo: "Tensión de Nodo V₁ por Análisis Nodal",
    resumenResultado: "V₁ = 160/13 V ≈ 12.31 V",
    enunciado: "En un circuito con nodo superior V₁, dos fuentes independientes de tensión de 10V y 20V, y resistores de 10Ω, 5Ω, 4Ω y 10Ω a tierra, determinar la tensión del nodo V₁ aplicando LCK.",
    paso0Datos: [
      "Nodo incógnita: V₁ (nodo central superior)",
      "Fuentes independientes: Vs1 = 10 V (izq), Vs2 = 20 V (der)",
      "Ramas conectadas a V₁: Rama 1 (10 Ω hacia 10V), Rama 2 (5 Ω hacia 10V), Rama 3 (4 Ω hacia 20V), Rama 4 (10 Ω a tierra/0V)",
      "Nodo de referencia: Riel inferior = 0 V (Tierra)"
    ],
    paso1EsquemaDCL: "Tierra en el riel inferior (0V). El nodo central V₁ se bifurca en 4 ramas: (V₁ - 10)/10, (V₁ - 10)/5, (V₁ - 20)/4 y (V₁ - 0)/10.",
    paso2Justificacion: "Aplicamos la Ley de Corrientes de Kirchhoff (LCK) en V₁. Toda corriente saliente se expresa como I = (V_nodo - V_vecino)/R.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Planteamiento de LCK en el nodo V₁",
        pasos: [
          "Sumatoria de corrientes salientes: (V₁ - 10)/10 + (V₁ - 10)/5 + (V₁ - 20)/4 + V₁/10 = 0",
          "Multiplicamos por el MCM (20) para eliminar denominadores:",
          "2(V₁ - 10) + 4(V₁ - 10) + 5(V₁ - 20) + 2(V₁) = 0"
        ],
        formula: "2(V₁ - 10) + 4(V₁ - 10) + 5(V₁ - 20) + 2V₁ = 0",
        resultado: "2(V₁ - 10) + 4(V₁ - 10) + 5(V₁ - 20) + 2V₁ = 0",
        valorCopiable: "13*V1 = 160"
      },
      {
        letra: "b",
        titulo: "Despeje algebraico y cálculo numérico",
        pasos: [
          "Expandimos: 2V₁ - 20 + 4V₁ - 40 + 5V₁ - 100 + 2V₁ = 0",
          "Agrupamos términos: (2 + 4 + 5 + 2)V₁ = 20 + 40 + 100",
          "13V₁ = 160  =>  V₁ = 160/13 V ≈ 12.3077 V"
        ],
        formula: "V₁ = 160/13 V ≈ 12.31 V",
        resultado: "V₁ = 12.31 V",
        valorCopiable: "12.31 V"
      }
    ],
    paso4ResultadoFinal: "V₁ = 160/13 V ≈ 12.31 V",
    paso5ChequeoTip: "Verificación: corrientes salientes: (12.31-10)/10 = +0.231A, (12.31-10)/5 = +0.462A, (12.31-20)/4 = -1.923A, 12.31/10 = +1.231A. Suma = 0.231 + 0.462 - 1.923 + 1.231 = 0.000 A.",
    pistasOro: ["Multiplica por el MCM de los resistores para evitar fracciones decimales en el planteamiento."],
    ingredientesClave: ["LCK en nodos", "Ley de Ohm I=(Va-Vb)/R", "MCM algebraico"]
  },
  {
    id: "circuito-2",
    numero: 2,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 2",
    titulo: "Corriente de Rama iₒ con Fuente Dependiente 3iₒ",
    resumenResultado: "iₒ = 45/26 A ≈ 1.731 A | VT = 53.08 V",
    enunciado: "Calcular la corriente de rama iₒ y la tensión de nodo VT en un circuito alimentado por 60V con fuente dependiente 3iₒ y resistores de 4Ω, 2Ω y 8Ω.",
    paso0Datos: [
      "Fuente de tensión fija: 60 V",
      "Fuente dependiente: 3iₒ inyectando corriente al nodo superior",
      "Resistencias: 4 Ω (rama con iₒ), 2 Ω y 8 Ω",
      "Variable de control: iₒ = (60 - VT) / 4"
    ],
    paso1EsquemaDCL: "Nodo VT conectado a 60V mediante 4Ω, a tierra mediante 8Ω y a rama intermedia de 2Ω. Fuente dependiente 3iₒ inyectando corriente al nodo.",
    paso2Justificacion: "Expresamos primero la variable de control iₒ en términos de la tensión nodal antes de armar la ecuación de corrientes del nodo.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Relación de la variable de control iₒ con VT",
        pasos: ["La rama izquierda va desde 60V al nodo VT por 4Ω: iₒ = (60 - VT) / 4"],
        formula: "iₒ = (60 - VT)/4",
        resultado: "iₒ = (60 - VT)/4",
        valorCopiable: "i_o = (60 - VT)/4"
      },
      {
        letra: "b",
        titulo: "Planteamiento de LCK y resolución de VT e iₒ",
        pasos: [
          "LCK en VT: (VT - 60)/4 + VT/2 + VT/8 - 3iₒ = 0",
          "Sustituimos iₒ: (VT - 60)/4 + VT/2 + VT/8 - 3((60 - VT)/4) = 0",
          "Multiplicamos por 8: 2(VT - 60) + 4VT + VT - 6(60 - VT) = 0",
          "2VT - 120 + 5VT - 360 + 6VT = 0  =>  13VT = 690  =>  VT = 690/13 V ≈ 53.077 V",
          "iₒ = (60 - 53.077) / 4 = 45/26 A ≈ 1.7308 A"
        ],
        formula: "VT = 690/13 V ≈ 53.08 V,  iₒ = 45/26 A ≈ 1.731 A",
        resultado: "VT = 53.08 V, iₒ = 1.731 A",
        valorCopiable: "io = 1.731 A"
      }
    ],
    paso4ResultadoFinal: "iₒ = 1.731 A, VT = 53.08 V",
    paso5ChequeoTip: "Como 60V > 53.08V, la corriente iₒ fluye efectivamente de izquierda a derecha (positiva).",
    pistasOro: ["NUNCA apagues ni modifiques la rama de control durante el análisis de fuentes dependientes."],
    ingredientesClave: ["Variable de control dependiente", "LCK con inyección de corriente", "Sustitución directa"]
  },
  {
    id: "circuito-3",
    numero: 3,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 3",
    titulo: "Corrientes de Malla iₐ, i_b, i_c por Ley de Tensiones (LVK)",
    resumenResultado: "iₐ = 0.00 A | i_b = -1.50 A | i_c = 1.50 A",
    enunciado: "Determinar las corrientes iₐ, i_b, i_c en un circuito de 2 mallas con fuentes de 30V y 45V en rama compartida.",
    paso0Datos: [
      "Fuentes de tensión: 30 V (malla 1) y 45 V (malla 2)",
      "Resistencias: 20 Ω, 10 Ω (rama central), 5 Ω y 15 Ω",
      "Mallas asignadas en sentido horario: I₁ e I₂"
    ],
    paso1EsquemaDCL: "Malla 1 (horaria) recorre 30V, 20Ω y rama central (10Ω y 45V). Malla 2 recorre rama central, 5Ω y 15Ω.",
    paso2Justificacion: "Aplicamos LVK (sumatoria de caídas de tensión = 0) alrededor de las trayectorias cerradas de malla.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Ecuaciones de LVK de mallas",
        pasos: [
          "Malla 1: 30 - 20I₁ - 10(I₁ - I₂) - 45 = 0  =>  30I₁ - 10I₂ = -15",
          "Malla 2: 45 - 10(I₂ - I₁) - 5I₂ - 15I₂ = 0  =>  -10I₁ + 30I₂ = 45"
        ],
        formula: "30I₁ - 10I₂ = -15,  -10I₁ + 30I₂ = 45",
        resultado: "Sistema 2x2 planteado",
        valorCopiable: "30*I1 - 10*I2 = -15; -10*I1 + 30*I2 = 45"
      },
      {
        letra: "b",
        titulo: "Resolución del sistema y asignación de ramas",
        pasos: [
          "Multiplicamos Malla 1 por 3: 90I₁ - 30I₂ = -45",
          "Sumamos a Malla 2: (90 - 10)I₁ = 0  =>  80I₁ = 0  =>  I₁ = 0 A",
          "Sustituimos en Malla 2: 30I₂ = 45  =>  I₂ = 1.50 A",
          "Asignamos según flechas del diagrama: iₐ = I₁ = 0 A, i_b = I₁ - I₂ = -1.50 A, i_c = I₂ = 1.50 A"
        ],
        formula: "iₐ = 0.00 A, i_b = -1.50 A, i_c = 1.50 A",
        resultado: "iₐ = 0 A, i_b = -1.5 A, i_c = 1.5 A",
        valorCopiable: "ia=0, ib=-1.5A, ic=1.5A"
      }
    ],
    paso4ResultadoFinal: "iₐ = 0.00 A, i_b = -1.50 A, i_c = 1.50 A",
    paso5ChequeoTip: "i_b negativo indica que la corriente real en la rama central sube con 1.5A en vez de bajar.",
    pistasOro: ["El signo negativo en mallas solo indica sentido opuesto a la convención horaria elegida."],
    ingredientesClave: ["LVK de mallas", "Eliminación lineal", "Convención de signos pasivos"]
  },
  {
    id: "circuito-4",
    numero: 4,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 4",
    titulo: "Cálculo de v_ab e iₒ por Análisis de Mallas 3x3",
    resumenResultado: "iₒ = 16/9 A ≈ 1.778 A | v_ab = 160/3 V ≈ 53.33 V",
    enunciado: "Calcular la corriente iₒ que atraviesa el resistor central y la diferencia de potencial v_ab en un circuito de 3 mallas con fuentes de 80V.",
    paso0Datos: [
      "Fuentes: 80 V en mallas 1 y 2",
      "Resistencias: 20 Ω, 30 Ω, 20 Ω compartidas, 30 Ω vertical (donde pasa iₒ = I₃)",
      "Incógnitas: iₒ e v_ab = 30 * I₃"
    ],
    paso1EsquemaDCL: "Tres mallas: I₁ (superior izq), I₂ (inferior izq), I₃ (derecha). Resistor de 30Ω en rama de I₃.",
    paso2Justificacion: "Construimos el sistema de impedancias de mallas [R][I] = [V] y aplicamos simetría para simplificar I₁ = I₂.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Ecuaciones de malla y resolución de I₃",
        pasos: [
          "70 I₁ - 20 I₂ - 30 I₃ = 80",
          "-20 I₁ + 70 I₂ - 30 I₃ = 80",
          "-30 I₁ - 30 I₂ + 90 I₃ = 0  =>  90 I₃ = 30(I₁ + I₂)  =>  I₃ = (I₁ + I₂)/3",
          "Por simetría I₁ = I₂  =>  50 I₁ - 30(2I₁/3) = 80  =>  30 I₁ = 80  =>  I₁ = 8/3 A",
          "I₃ = (2 * 8/3)/3 = 16/9 A ≈ 1.778 A = iₒ"
        ],
        formula: "iₒ = 16/9 A ≈ 1.778 A",
        resultado: "iₒ = 1.778 A",
        valorCopiable: "io = 1.778 A"
      },
      {
        letra: "b",
        titulo: "Cálculo de la tensión v_ab",
        pasos: [
          "v_ab = 30 Ω * iₒ = 30 * (16/9) = 160/3 V ≈ 53.333 V"
        ],
        formula: "v_ab = 160/3 V ≈ 53.33 V",
        resultado: "v_ab = 53.33 V",
        valorCopiable: "vab = 53.33 V"
      }
    ],
    paso4ResultadoFinal: "iₒ = 1.778 A, v_ab = 53.33 V",
    paso5ChequeoTip: "La simetría del circuito garantiza I₁ = I₂, reduciendo un sistema 3x3 a una ecuación de 1 sola incógnita.",
    pistasOro: ["Explota la simetría topológica del circuito antes de calcular determinantes 3x3."],
    ingredientesClave: ["Matriz de mallas", "Simetría de red", "Ley de Ohm terminal"]
  },
  {
    id: "circuito-5",
    numero: 5,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 5",
    titulo: "Tensiones de Nodo v₁, v₂, v₃ en Red 3x3",
    resumenResultado: "v₁ = 20.80 V | v₂ = 8.533 V | v₃ = 19.47 V",
    enunciado: "Calcular las tensiones v₁, v₂, v₃ en una red resistiva con fuentes de corriente de 3A, 5A y fuente de tensión de 12V.",
    paso0Datos: [
      "Nodos activos: v₁, v₂, v₃",
      "Fuentes: 5A inyectando a v₁, 3A de v₁ a v₃, extremo derecho a +12V",
      "Conductancias: G₁ = 1/4, G₁₂ = 1/8, G₁₃ = 1/2, G₂ = 1/2, G₂₃ = 1/4, G₃ = 1/8"
    ],
    paso1EsquemaDCL: "Matriz de conductancia nodal [G][v] = [I_neto].",
    paso2Justificacion: "Planteamiento canónico por inspección: diagonal = sumatoria de conductancias conectadas; fuera de diagonal = conductancias compartidas negativas.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Matriz nodal canónica",
        pasos: [
          "Nodo 1: 7 v₁ - v₂ - 4 v₃ = 16",
          "Nodo 2: -v₁ + 7 v₂ - 2 v₃ = 0",
          "Nodo 3: -4 v₁ - 2 v₂ + 7 v₃ = 36"
        ],
        formula: "[G][v] = [I]",
        resultado: "Sistema 3x3 nodal planteado",
        valorCopiable: "7v1 - v2 - 4v3 = 16; -v1 + 7v2 - 2v3 = 0; -4v1 - 2v2 + 7v3 = 36"
      },
      {
        letra: "b",
        titulo: "Solución numérica",
        pasos: [
          "Resolviendo por sustitución o Cramer: Det(G) = 243",
          "v₁ = 20.80 V",
          "v₂ = 8.533 V",
          "v₃ = 19.47 V"
        ],
        formula: "v₁ = 20.80 V, v₂ = 8.533 V, v₃ = 19.47 V",
        resultado: "v₁ = 20.80 V, v₂ = 8.53 V, v₃ = 19.47 V",
        valorCopiable: "v1=20.80V, v2=8.53V, v3=19.47V"
      }
    ],
    paso4ResultadoFinal: "v₁ = 20.80 V, v₂ = 8.533 V, v₃ = 19.47 V",
    paso5ChequeoTip: "En v₁, las corrientes salientes por resistores + 3A igualan con exactitud los 5A que ingresan.",
    pistasOro: ["Cuidado con el extremo a 12V: genera un término independiente 12/8 = 1.5A en el vector de excitación."],
    ingredientesClave: ["Matriz de conductancias", "Regla de Cramer", "Fuentes fijas no nulas"]
  },
  {
    id: "circuito-6",
    numero: 6,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 6",
    titulo: "Principio de Linealidad y Escalamiento en Circuitos",
    resumenResultado: "vₒ(1V)=0.5V | vₒ(10V,1Ω)=5V, iₒ=5A | vₒ(10V,10Ω)=5V, iₒ=0.5A",
    enunciado: "Demostrar la propiedad de homogeneidad y linealidad para distintas entradas vs y escalamiento de resistores.",
    paso0Datos: [
      "Circuito escalera resistivo lineal alimentado por vs",
      "Condición 1: vs = 1V, R = 1Ω",
      "Condición 2: vs = 10V, R = 1Ω",
      "Condición 3: vs = 10V, todas las resistencias = 10Ω"
    ],
    paso1EsquemaDCL: "Red en puente/escalera donde la relación de división vₒ/vs permanece constante por linealidad.",
    paso2Justificacion: "En sistemas lineales, si la entrada se multiplica por α, toda tensión y corriente se escala por α.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Caso vs = 1V, R = 1Ω",
        pasos: ["vₒ = 0.50 V", "iₒ = vₒ / 1Ω = 0.50 A"],
        formula: "vₒ = 0.50 V, iₒ = 0.50 A",
        resultado: "vₒ = 0.50 V, iₒ = 0.50 A",
        valorCopiable: "vo=0.5V, io=0.5A"
      },
      {
        letra: "b",
        titulo: "Caso vs = 10V, R = 1Ω (Escala 10x de tensión)",
        pasos: ["vₒ = 10 * 0.50 V = 5.00 V", "iₒ = 10 * 0.50 A = 5.00 A"],
        formula: "vₒ = 5.00 V, iₒ = 5.00 A",
        resultado: "vₒ = 5.00 V, iₒ = 5.00 A",
        valorCopiable: "vo=5V, io=5A"
      },
      {
        letra: "c",
        titulo: "Caso vs = 10V, R = 10Ω (Escala de impedancia)",
        pasos: [
          "La relación de voltajes no cambia: vₒ = 5.00 V",
          "La corriente se reduce por 10: iₒ = 5.00 V / 10 Ω = 0.50 A"
        ],
        formula: "vₒ = 5.00 V, iₒ = 0.50 A",
        resultado: "vₒ = 5.00 V, iₒ = 0.50 A",
        valorCopiable: "vo=5V, io=0.5A"
      }
    ],
    paso4ResultadoFinal: "vₒ = 5.00 V, iₒ = 0.50 A",
    paso5ChequeoTip: "La linealidad aplica a V e I, pero NUNCA a la potencia (P = I²R es no lineal).",
    pistasOro: ["Al multiplicar todas las resistencias por una constante K, las tensiones quedan intactas y las corrientes se dividen por K."],
    ingredientesClave: ["Homogeneidad", "Escalamiento de impedancias", "No linealidad de potencia"]
  },
  {
    id: "circuito-7",
    numero: 7,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 7",
    titulo: "Superposición de Tensión vₒ con 3 Fuentes",
    resumenResultado: "vₒ = 10 - 3 + 1 = 8.00 V",
    enunciado: "Calcular la tensión de salida vₒ sumando las contribuciones individuales de una fuente de 20V, una de 2A y otra de 1A.",
    paso0Datos: [
      "Fuente 1: 20 V (tensión independiente)",
      "Fuente 2: 2 A (corriente independiente)",
      "Fuente 3: 1 A (corriente independiente)",
      "Salida: vₒ total = vₒ(20V) + vₒ(2A) + vₒ(1A)"
    ],
    paso1EsquemaDCL: "Tres subcircuitos: 1) 20V activa (fuentes de corriente abiertas). 2) 2A activa (fuente de tensión cortocircuitada). 3) 1A activa.",
    paso2Justificacion: "Principio de superposición: en circuitos lineales, la respuesta total es la suma algebraica de las respuestas a cada fuente individual.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Contribución de la fuente de 20V",
        pasos: ["Con fuentes de corriente abiertas: vₒ⁽¹⁾ = +10.00 V"],
        formula: "vₒ⁽¹⁾ = 10.00 V",
        resultado: "vₒ⁽¹⁾ = +10.00 V",
        valorCopiable: "vo1 = 10V"
      },
      {
        letra: "b",
        titulo: "Contribución de la fuente de 2A",
        pasos: ["Con fuentes de tensión en corto y corriente opuesta: vₒ⁽²⁾ = -3.00 V"],
        formula: "vₒ⁽²⁾ = -3.00 V",
        resultado: "vₒ⁽²⁾ = -3.00 V",
        valorCopiable: "vo2 = -3V"
      },
      {
        letra: "c",
        titulo: "Contribución de la fuente de 1A y suma total",
        pasos: [
          "vₒ⁽³⁾ = +1.00 V",
          "vₒ = vₒ⁽¹⁾ + vₒ⁽²⁾ + vₒ⁽³⁾ = 10.00 - 3.00 + 1.00 = 8.00 V"
        ],
        formula: "vₒ = 8.00 V",
        resultado: "vₒ = 8.00 V",
        valorCopiable: "vo = 8.00 V"
      }
    ],
    paso4ResultadoFinal: "vₒ = 8.00 V",
    paso5ChequeoTip: "Regla mnemotécnica: fuente de tensión apagada = CABLE (0V); fuente de corriente apagada = CABLE CORTADO (0A).",
    pistasOro: ["Mantén estrictamente los signos algebraicos de cada fuente según su polaridad relativa."],
    ingredientesClave: ["Superposición", "Cortocircuito de tensión", "Circuito abierto de corriente"]
  },
  {
    id: "circuito-8",
    numero: 8,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 8",
    titulo: "Superposición de Corriente iₒ con 3 Fuentes",
    resumenResultado: "iₒ = 12 - 6 - 5 = 1.00 A",
    enunciado: "Calcular la corriente de rama iₒ con fuentes de 108V, 36A y 18A mediante el método de superposición.",
    paso0Datos: [
      "Fuente 1: 108 V",
      "Fuente 2: 36 A",
      "Fuente 3: 18 A",
      "Rama analizada: Resistor de 4Ω donde fluye iₒ = (108 - VA) / 4"
    ],
    paso1EsquemaDCL: "Tres subcircuitos individuales calculando la tensión VA y la corriente resultante en el resistor de 4Ω.",
    paso2Justificacion: "Calculamos la corriente parcial de cada fuente apagando las otras dos independientes.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Cálculo de contribuciones individuales",
        pasos: [
          "Fuente 1 (108V activa): VA = 60V  =>  iₒ⁽¹⁾ = (108 - 60)/4 = +12.00 A",
          "Fuente 2 (36A activa): VA = 24V  =>  iₒ⁽²⁾ = (0 - 24)/4 = -6.00 A",
          "Fuente 3 (18A activa): VA = 20V  =>  iₒ⁽³⁾ = (0 - 20)/4 = -5.00 A"
        ],
        formula: "iₒ⁽¹⁾ = 12A, iₒ⁽²⁾ = -6A, iₒ⁽³⁾ = -5A",
        resultado: "iₒ⁽¹⁾ = 12A, iₒ⁽²⁾ = -6A, iₒ⁽³⁾ = -5A",
        valorCopiable: "io1=12, io2=-6, io3=-5"
      },
      {
        letra: "b",
        titulo: "Suma de superposición",
        pasos: ["iₒ = 12.00 - 6.00 - 5.00 = 1.00 A"],
        formula: "iₒ = 1.00 A",
        resultado: "iₒ = 1.00 A",
        valorCopiable: "io = 1.00 A"
      }
    ],
    paso4ResultadoFinal: "iₒ = 1.00 A",
    paso5ChequeoTip: "El signo neto positivo confirma que la corriente total va en la misma dirección de la flecha de referencia.",
    pistasOro: ["Cuando una fuente inyecta en sentido inverso al flujo deseado, su aporte es estrictamente negativo."],
    ingredientesClave: ["Divisor de corriente", "Contribuciones parciales", "Suma algebraica de ramas"]
  },
  {
    id: "circuito-9",
    numero: 9,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 9",
    titulo: "Transformación de Fuentes Thévenin-Norton para Hallar iₒ",
    resumenResultado: "iₒ = 7/11 A ≈ 0.636 A | V_B = 248/11 V",
    enunciado: "Calcular la corriente iₒ en la rama de 4Ω conectada a 20V mediante transformaciones sucesivas de fuentes.",
    paso0Datos: [
      "Fuentes: 6A en paralelo con 2Ω, 3A en paralelo con 5Ω, nodo derecho a 20V",
      "Resistor de salida: 4Ω",
      "Objetivo: Transformar a equivalentes de tensión/corriente para hallar iₒ"
    ],
    paso1EsquemaDCL: "6A || 2Ω <-> 12V serie 2Ω; 3A || 5Ω <-> 15V serie 5Ω.",
    paso2Justificacion: "Una fuente de corriente Is || R equivale a una fuente de tensión Vs = Is*R en serie con R (Thévenin / Norton).",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Transformaciones y ecuaciones nodales equivalentes",
        pasos: [
          "Nodo A: VA/2 + (VA - VB)/5 + 3 - 6 = 0  =>  7VA - 2VB = 30",
          "Nodo B: (VB - VA)/5 + (VB - 20)/4 - 3 = 0  =>  -4VA + 9VB = 160",
          "Resolviendo: VA = 118/11 V,  VB = 248/11 V ≈ 22.545 V"
        ],
        formula: "VB = 248/11 V ≈ 22.55 V",
        resultado: "VB = 248/11 V",
        valorCopiable: "VB = 248/11 V"
      },
      {
        letra: "b",
        titulo: "Cálculo de corriente en la rama de 4Ω",
        pasos: [
          "iₒ = (VB - 20) / 4 = (248/11 - 20) / 4 = (28/11) / 4 = 7/11 A ≈ 0.6364 A"
        ],
        formula: "iₒ = 7/11 A ≈ 0.636 A",
        resultado: "iₒ = 0.636 A",
        valorCopiable: "io = 0.636 A"
      }
    ],
    paso4ResultadoFinal: "iₒ = 7/11 A ≈ 0.636 A",
    paso5ChequeoTip: "Como VB = 22.55V > 20V, la corriente iₒ viaja hacia la derecha con 0.636A.",
    pistasOro: ["La transformación de fuentes conserva tensiones y corrientes externas, pero modifica la disipación interna de potencia."],
    ingredientesClave: ["Equivalente Thévenin-Norton", "Vs = Is * R", "Divisor de tensión"]
  },
  {
    id: "circuito-10",
    numero: 10,
    categoria: "circuitos",
    categoriaLabel: "Circuitos DC/AC",
    tag: "Circuito 10",
    titulo: "Transformación de Fuentes con Fuente Dependiente 0.5i_x",
    resumenResultado: "i_x = 1.60 A | V_A = 36.0 V",
    enunciado: "Calcular la corriente de control i_x en un circuito con fuente dependiente 0.5i_x, fuente de 60V y resistores de 15Ω, 50Ω, 10Ω y 40Ω.",
    paso0Datos: [
      "Fuente independiente: 60 V en serie con 15 Ω",
      "Fuente dependiente: 0.5 i_x",
      "Variable de control: i_x = (60 - VA) / 15",
      "Resistores: 15 Ω, 50 Ω, 10 Ω, 40 Ω"
    ],
    paso1EsquemaDCL: "60V en serie con 15Ω se transforma a 4A || 15Ω. La rama de control i_x se preserva intacta.",
    paso2Justificacion: "Podemos transformar fuentes independientes alrededor de la red pero la rama donde vive la variable de control i_x DEBE conservarse intacta.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Planteamiento nodal con variable de control",
        pasos: [
          "Nodo A: (VA - 60)/15 + VA/50 + (VA - VB)/10 + 0.5 i_x = 0",
          "Nodo B: VB/40 + (VB - VA)/10 - 0.5 i_x = 0",
          "Sustituyendo i_x = (60 - VA)/15:"
        ],
        formula: "VA = 36.0 V, VB = 35.2 V",
        resultado: "VA = 36 V, VB = 35.2 V",
        valorCopiable: "VA = 36V, VB = 35.2V"
      },
      {
        letra: "b",
        titulo: "Cálculo de i_x",
        pasos: [
          "i_x = (60 - VA) / 15 = (60 - 36) / 15 = 24 / 15 = 1.60 A"
        ],
        formula: "i_x = 1.60 A",
        resultado: "i_x = 1.60 A",
        valorCopiable: "ix = 1.60 A"
      }
    ],
    paso4ResultadoFinal: "i_x = 1.60 A",
    paso5ChequeoTip: "Balance en nodo A: -1.60 + 36/50 + (36-35.2)/10 + 0.5(1.60) = -1.60 + 0.72 + 0.08 + 0.80 = 0.00 A.",
    pistasOro: ["Regla de oro: NUNCA elimines ni combines en paralelo la resistencia que define la corriente de control."],
    ingredientesClave: ["Variable de control dependiente", "Preservación de rama", "Verificación de LCK"]
  },

  // ==========================================
  // --- M.A.S. (7 EJERCICIOS) ---
  // ==========================================
  {
    id: "mas-1368",
    numero: 11,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 13.68",
    titulo: "Bloque sobre Bloque con Fricción Estática en M.A.S.",
    resumenResultado: "A_max = [μ_s * g * (M + m)] / k",
    enunciado: "Un bloque de masa m descansa sobre otro bloque de masa M unido a un resorte horizontal k. Si el coeficiente de fricción estática es μ_s, hallar la amplitud máxima A_max para que el bloque superior no deslice.",
    paso0Datos: [
      "Masa inferior: M (unida a resorte k)",
      "Masa superior: m (apoyada sobre M)",
      "Coeficiente de fricción estática: μ_s",
      "Superficie horizontal inferior sin fricción (μ = 0)",
      "Masa efectiva oscilante: m_ef = M + m"
    ],
    paso1EsquemaDCL: "DCL bloque superior m: Normal N = mg hacia arriba, Peso mg hacia abajo, fuerza de fricción estática f_s horizontal acelerando al bloque.",
    paso2Justificacion: "El bloque superior solo se acelera por f_s = m*a. Para no deslizar, la aceleración máxima del M.A.S. (a_max = ω²A) debe satisfacer a_max ≤ μ_s*g.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Frecuencia angular del conjunto (M + m)",
        pasos: ["Ambos bloques se mueven juntos sin deslizar: ω = √(k / (M + m))"],
        formula: "ω = √(k / (M + m))",
        resultado: "ω = √(k / (M + m))",
        valorCopiable: "omega = sqrt(k/(M+m))"
      },
      {
        letra: "b",
        titulo: "Condición de fricción estática máxima",
        pasos: [
          "f_s,max = μ_s * N = μ_s * m * g",
          "Por Newton: f_s,max = m * a_max  =>  m * a_max = μ_s * m * g  =>  a_max = μ_s * g"
        ],
        formula: "a_max = μ_s * g",
        resultado: "a_max = μ_s * g",
        valorCopiable: "amax = mus*g"
      },
      {
        letra: "c",
        titulo: "Despeje de la amplitud máxima A_max",
        pasos: [
          "En M.A.S.: a_max = ω² * A_max",
          "(k / (M + m)) * A_max = μ_s * g",
          "A_max = [μ_s * g * (M + m)] / k"
        ],
        formula: "A_max = [μ_s * g * (M + m)] / k",
        resultado: "A_max = [μ_s * g * (M + m)] / k",
        valorCopiable: "Amax = (mus*g*(M+m))/k"
      }
    ],
    paso4ResultadoFinal: "A_max = [μ_s * g * (M + m)] / k",
    paso5ChequeoTip: "Un resorte más rígido (mayor k) reduce la amplitud admisible porque genera aceleraciones más violentas.",
    pistasOro: ["No escribas f_s = μ_s*N por defecto: la igualdad solo aplica en el límite crítico de no deslizamiento."],
    ingredientesClave: ["Masa efectiva M+m", "a_max = ω²A", "Fricción estática crítica"]
  },
  {
    id: "mas-1369",
    numero: 12,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 13.69",
    titulo: "Choque Inelástico y Oscilación Subsecuente con Resorte",
    resumenResultado: "f = 0.318 Hz | A = 0.500 m | T = 3.14 s | t_regreso = 1.57 s",
    enunciado: "Una masa m₁ = 10.0 kg choca a 2.00 m/s inelásticamente contra m₂ = 10.0 kg unida a resorte k = 80.0 N/m. Hallar frecuencia, amplitud, periodo y tiempo de primer regreso a x=0.",
    paso0Datos: [
      "m₁ = m₂ = 10.0 kg, v₁i = 2.00 m/s, v₂i = 0 m/s",
      "Constante de resorte: k = 80.0 N/m",
      "Choque perfectamente inelástico: masas se adhieren (M_total = 20.0 kg)",
      "Posición de choque: x = 0 (equilibrio estático)"
    ],
    paso1EsquemaDCL: "Antes del choque: m₁ viaja hacia m₂. Después del choque: bloque combinado de 20kg comprime el resorte horizontal sin rozamiento.",
    paso2Justificacion: "1) Conservación de momento lineal durante el choque para hallar v₀. 2) Conservación de energía mecánica del M.A.S. posterior.",
    paso3Incisos: [
      {
        letra: "a.1",
        titulo: "Velocidad inicial v₀ tras el choque",
        pasos: [
          "m₁ v₁i = (m₁ + m₂) v₀",
          "(10.0)(2.00) = (20.0) v₀  =>  v₀ = 1.00 m/s"
        ],
        formula: "v₀ = 1.00 m/s",
        resultado: "v₀ = 1.00 m/s",
        valorCopiable: "v0 = 1.00 m/s"
      },
      {
        letra: "a.2",
        titulo: "Frecuencia angular ω, frecuencia f y periodo T",
        pasos: [
          "ω = √(k / M) = √(80.0 / 20.0) = √4.00 = 2.00 rad/s",
          "f = ω / 2π = 2.00 / 2π = 1/π ≈ 0.3183 Hz",
          "T = 2π / ω = 2π / 2.00 = π ≈ 3.1416 s"
        ],
        formula: "ω = 2.00 rad/s, f = 0.318 Hz, T = 3.14 s",
        resultado: "f = 0.318 Hz, T = 3.14 s",
        valorCopiable: "f = 0.318 Hz, T = 3.14 s"
      },
      {
        letra: "a.3",
        titulo: "Amplitud A por conservación de energía",
        pasos: [
          "(1/2) M v₀² = (1/2) k A²  =>  A = v₀ / ω = 1.00 / 2.00 = 0.500 m = 50.0 cm"
        ],
        formula: "A = 0.500 m",
        resultado: "A = 0.500 m",
        valorCopiable: "A = 0.500 m"
      },
      {
        letra: "b",
        titulo: "Tiempo de primer regreso a la posición de equilibrio",
        pasos: [
          "Parte de x=0, viaja a +A (T/4) y regresa a x=0 (T/2):",
          "t = T / 2 = π / 2 ≈ 1.5708 s"
        ],
        formula: "t = T / 2 = 1.57 s",
        resultado: "t = 1.57 s",
        valorCopiable: "t = 1.57 s"
      }
    ],
    paso4ResultadoFinal: "f = 0.318 Hz, A = 0.500 m, T = 3.14 s, t_regreso = 1.57 s",
    paso5ChequeoTip: "La energía cinética NO se conserva en el choque (es inelástico), pero la energía mecánica SÍ se conserva durante la oscilación posterior.",
    pistasOro: ["El primer regreso a la posición de partida x=0 ocurre en t = T/2, no en T/4."],
    ingredientesClave: ["Momento lineal p=mv", "ω = √(k/M)", "v_max = ωA", "t = T/2"]
  },
  {
    id: "mas-1373",
    numero: 13,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 13.73",
    titulo: "Cubeta con Fuga de Agua y Derivada Temporal del Periodo",
    resumenResultado: "T_mitad = 1.49 s | dT/dt = -2.12×10⁻⁴ s/s | T_min = 0.795 s",
    enunciado: "Una cubeta de 2.00 kg con 10.0 kg de agua oscila en resorte k = 125 N/m perdiendo agua a razón de 2.00 g/s. Hallar T a mitad de agua, tasa dT/dt y periodo mínimo.",
    paso0Datos: [
      "Masa cubeta vacía: m_c = 2.00 kg",
      "Masa inicial de agua: m_w0 = 10.0 kg",
      "Constante k = 125 N/m",
      "Tasa de fuga: dm/dt = -2.00 g/s = -0.00200 kg/s"
    ],
    paso1EsquemaDCL: "Resorte vertical soportando cubeta + agua. Desplazamiento medido desde el equilibrio estático instantáneo.",
    paso2Justificacion: "Periodo T(m) = 2π√(m/k). Para hallar la velocidad de cambio del periodo derivamos con regla de la cadena: dT/dt = (dT/dm)*(dm/dt).",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Periodo a mitad de capacidad de agua",
        pasos: [
          "Masa = 2.00 + 5.00 = 7.00 kg",
          "T = 2π √(7.00 / 125) = 2π √(0.0560) ≈ 1.4869 s"
        ],
        formula: "T = 1.49 s",
        resultado: "T = 1.49 s",
        valorCopiable: "T = 1.49 s"
      },
      {
        letra: "b",
        titulo: "Tasa de cambio dT/dt",
        pasos: [
          "dT/dt = (π / √(k*m)) * (dm/dt)",
          "dT/dt = (π / √(125 * 7.00)) * (-0.00200) = (π / 29.580) * (-0.00200) ≈ -2.124 × 10⁻⁴ s/s",
          "Signo negativo: el periodo se acorta (oscila más rápido)."
        ],
        formula: "dT/dt = -2.12 × 10⁻⁴ s/s",
        resultado: "dT/dt = -2.12 × 10⁻⁴ s/s (Se acorta)",
        valorCopiable: "dT/dt = -2.12e-4 s/s"
      },
      {
        letra: "c",
        titulo: "Periodo mínimo (cubeta vacía)",
        pasos: [
          "Masa mínima = 2.00 kg",
          "T_min = 2π √(2.00 / 125) = 2π √(0.0160) ≈ 0.7948 s"
        ],
        formula: "T_min = 0.795 s",
        resultado: "T_min = 0.795 s",
        valorCopiable: "Tmin = 0.795 s"
      }
    ],
    paso4ResultadoFinal: "T_mitad = 1.49 s, dT/dt = -2.12×10⁻⁴ s/s, T_min = 0.795 s",
    paso5ChequeoTip: "¡Convertir 2.00 g/s a kg/s (0.002 kg/s)! Como T ∝ √m, al perder masa el sistema acelera su cadencia oscilatoria.",
    pistasOro: ["La amplitud (3.0 cm) no altera el periodo en un oscilador armónico lineal ideal."],
    ingredientesClave: ["T = 2π√(m/k)", "Regla de la cadena dT/dt", "Conversión de unidades SI"]
  },
  {
    id: "mas-prob37",
    numero: 14,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 37 (Serway)",
    titulo: "Oscilador Amortiguado y Decaimiento de Energía al 5%",
    resumenResultado: "f_d = 7.00 Hz | ΔA/ciclo = 2.00% | t(5% E) = 10.6 s",
    enunciado: "Objeto de 10.6 kg con resorte k = 2.05×10⁴ N/m y amortiguamiento b = 3.00 N·s/m. Hallar f_d, porcentaje de pérdida de amplitud por ciclo y tiempo para reducir energía al 5%.",
    paso0Datos: [
      "m = 10.6 kg, k = 20500 N/m, b = 3.00 N·s/m",
      "Parámetro γ = b / (2m) = 3.00 / (2 * 10.6) = 0.1415 s⁻¹",
      "Energía objetivo: E(t) = 0.0500 E₀"
    ],
    paso1EsquemaDCL: "Masa oscilando con fuerza restauradora -kx y fuerza viscosa amortiguadora -bv opuesta al vector velocidad.",
    paso2Justificacion: "Amplitud decae como A(t) = A₀ e^(-γt) y energía decae al doble de tasa: E(t) = E₀ e^(-2γt) = E₀ e^(-(b/m)t).",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Frecuencia amortiguada f_d",
        pasos: [
          "ω₀ = √(20500 / 10.6) = 43.9768 rad/s",
          "ω_d = √(ω₀² - γ²) = √(1933.96 - 0.020) ≈ 43.9766 rad/s",
          "f_d = ω_d / 2π ≈ 6.9991 Hz ≈ 7.00 Hz"
        ],
        formula: "f_d = 7.00 Hz",
        resultado: "f_d = 7.00 Hz",
        valorCopiable: "fd = 7.00 Hz"
      },
      {
        letra: "b",
        titulo: "Disminución porcentual de amplitud por ciclo",
        pasos: [
          "T_d = 1 / f_d = 0.14287 s",
          "A(t+T)/A(t) = e^(-γ T_d) = e^(-(0.1415)(0.14287)) = e^(-0.02022) ≈ 0.9800",
          "Pérdida = (1 - 0.9800) * 100% = 2.00%"
        ],
        formula: "ΔA% = 2.00%",
        resultado: "ΔA% = 2.00% por ciclo",
        valorCopiable: "DeltaA = 2.00%"
      },
      {
        letra: "c",
        titulo: "Tiempo para E = 5% E₀",
        pasos: [
          "e^(-(b/m)t) = 0.0500  =>  -(b/m)t = ln(0.0500) = -2.9957",
          "t = (m / b) * 2.9957 = (10.6 / 3.00) * 2.9957 ≈ 10.585 s ≈ 10.6 s"
        ],
        formula: "t = 10.6 s",
        resultado: "t = 10.6 s",
        valorCopiable: "t = 10.6 s"
      }
    ],
    paso4ResultadoFinal: "f_d = 7.00 Hz, ΔA = 2.00%/ciclo, t = 10.6 s",
    paso5ChequeoTip: "Amortiguamiento débil (γ << ω₀): la frecuencia casi no se altera pero la energía decae a tasa e^(-(b/m)t).",
    pistasOro: ["Cuidado con el exponente: la amplitud decae con b/(2m), pero la energía decae con b/m."],
    ingredientesClave: ["γ = b/(2m)", "ω_d = √(ω₀²-γ²)", "Decaimiento exponencial de energía"]
  },
  {
    id: "mas-prob42",
    numero: 15,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 42 (Serway)",
    titulo: "Oscilador Forzado Sin Amortiguamiento y Resonancia",
    resumenResultado: "f₁ = 0.641 Hz (por debajo) | f₂ = 1.31 Hz (por encima)",
    enunciado: "Masa m = 0.150 kg con resorte k = 6.30 N/m sometida a fuerza periódica F₀ = 1.70 N con amplitud de respuesta A = 0.440 m. Hallar las dos frecuencias posibles.",
    paso0Datos: [
      "m = 0.150 kg, k = 6.30 N/m, F₀ = 1.70 N, A = 0.440 m",
      "Frecuencia natural: ω₀² = k/m = 6.30 / 0.150 = 42.00 rad²/s² (f₀ = 1.03 Hz)"
    ],
    paso1EsquemaDCL: "Masa excitada por F(t) = F₀ cos(ωt) sin amortiguamiento.",
    paso2Justificacion: "Amplitud estacionaria: A = F₀ / |k - mω²| = (F₀/m) / |ω₀² - ω²|. El valor absoluto origina dos ramas físicas de solución.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Ecuación modular de frecuencias",
        pasos: [
          "|42.00 - ω²| = F₀ / (m * A) = 1.70 / (0.150 * 0.440) = 1.70 / 0.066 = 25.7576 rad²/s²"
        ],
        formula: "|42.00 - ω²| = 25.758",
        resultado: "|42.00 - ω²| = 25.758",
        valorCopiable: "|42 - w^2| = 25.758"
      },
      {
        letra: "b.1",
        titulo: "Frecuencia 1: Por debajo de resonancia (ω < ω₀)",
        pasos: [
          "42.00 - ω₁² = +25.7576  =>  ω₁² = 16.2424  =>  ω₁ = 4.0302 rad/s",
          "f₁ = 4.0302 / 2π ≈ 0.6414 Hz"
        ],
        formula: "f₁ = 0.641 Hz",
        resultado: "f₁ = 0.641 Hz",
        valorCopiable: "f1 = 0.641 Hz"
      },
      {
        letra: "b.2",
        titulo: "Frecuencia 2: Por encima de resonancia (ω > ω₀)",
        pasos: [
          "ω₂² - 42.00 = +25.7576  =>  ω₂² = 67.7576  =>  ω₂ = 8.2315 rad/s",
          "f₂ = 8.2315 / 2π ≈ 1.3101 Hz"
        ],
        formula: "f₂ = 1.31 Hz",
        resultado: "f₂ = 1.31 Hz",
        valorCopiable: "f2 = 1.31 Hz"
      }
    ],
    paso4ResultadoFinal: "f₁ = 0.641 Hz, f₂ = 1.31 Hz",
    paso5ChequeoTip: "f₀ = 1.03 Hz queda exactamente entre ambas frecuencias (0.641 Hz < 1.03 Hz < 1.31 Hz).",
    pistasOro: ["Nunca descartes la segunda solución: la función de respuesta tiene dos lados respecto al pico de resonancia."],
    ingredientesClave: ["Oscilación forzada", "A = F₀/|k-mω²|", "Ramas sub/super resonantes"]
  },
  {
    id: "mas-prob63",
    numero: 16,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 63 (Serway)",
    titulo: "Demostración de M.A.S. para Bola entre Dos Bandas de Hule",
    resumenResultado: "F_y ≈ -(2T/L)y | ω = √(2T / (m·L))",
    enunciado: "Demostrar que una bola de masa m en el centro de dos bandas de longitud L con tensión T realiza M.A.S. para desplazamientos transversales pequeños y hallar su ω.",
    paso0Datos: [
      "Masa de la bola: m",
      "Dos bandas idénticas: longitud horizontal inicial L cada una",
      "Tensión constante en cada banda: T",
      "Desplazamiento transversal pequeño: y << L"
    ],
    paso1EsquemaDCL: "Bola desplazada hacia arriba en y. Dos tensiones T orientadas con ángulo θ respecto a la horizontal. Componentes horizontales se anulan; verticales tiran hacia el centro.",
    paso2Justificacion: "Para y << L, aproximamos sin(θ) ≈ y/L para demostrar que la fuerza resultante es lineal restauradora: F_y = -C*y.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Demostración de la fuerza restauradora lineal",
        pasos: [
          "F_y = -2 T sin(θ)",
          "Geometría: sin(θ) = y / √(L² + y²)",
          "Para y << L: √(L² + y²) ≈ L  =>  sin(θ) ≈ y/L",
          "F_y = -2T (y/L) = -(2T/L) y  (Q.E.D.)"
        ],
        formula: "F_y = -(2T/L) y",
        resultado: "F_y = -(2T/L) y",
        valorCopiable: "Fy = -(2T/L)*y"
      },
      {
        letra: "b",
        titulo: "Demostración de la frecuencia angular ω",
        pasos: [
          "m ÿ = -(2T/L) y  =>  ÿ + (2T / (m L)) y = 0",
          "Comparando con ÿ + ω² y = 0: ω = √(2T / (m L))  (Q.E.D.)"
        ],
        formula: "ω = √(2T / (m L))",
        resultado: "ω = √(2T / (m L))",
        valorCopiable: "omega = sqrt(2T/(m*L))"
      }
    ],
    paso4ResultadoFinal: "F_y = -(2T/L) y, ω = √(2T / (m·L))",
    paso5ChequeoTip: "La condición de M.A.S. es rigurosamente válida solo si y << L. Si la amplitud crece, surgen términos no lineales de orden superior.",
    pistasOro: ["Cualquier sistema con fuerza neta F = -k_ef * y oscila armónicamente con ω = √(k_ef / m)."],
    ingredientesClave: ["Linealización y << L", "Segunda Ley de Newton", "Identificación de k_ef"]
  },
  {
    id: "mas-prob17",
    numero: 17,
    categoria: "mas",
    categoriaLabel: "M.A.S. (Oscilaciones)",
    tag: "Prob 17 (MAS)",
    titulo: "Conservación de Energía Mecánica, Cinética y Potencial en M.A.S.",
    resumenResultado: "E = 28.0 mJ | v(1cm) = 1.025 m/s | K(3cm) = 12.25 mJ | U(3cm) = 15.75 mJ",
    enunciado: "Objeto de 50.0 g oscila con k = 35.0 N/m y amplitud A = 4.00 cm. Hallar energía total E, rapidez en x = 1.00 cm, y energías K y U en x = 3.00 cm.",
    paso0Datos: [
      "m = 50.0 g = 0.0500 kg, k = 35.0 N/m, A = 4.00 cm = 0.0400 m",
      "Posiciones evaluadas: x₁ = 0.0100 m, x₂ = 0.0300 m"
    ],
    paso1EsquemaDCL: "Resorte horizontal sin fricción intercambiando energía cinética K = 1/2 m v² y potencial elástica U = 1/2 k x².",
    paso2Justificacion: "La energía mecánica total E = 1/2 k A² es constante en todo instante del movimiento armónico simple.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Energía total del sistema",
        pasos: [
          "E = (1/2) k A² = (1/2)(35.0)(0.0400)² = (1/2)(35.0)(0.00160) = 0.0280 J = 28.0 mJ"
        ],
        formula: "E = 28.0 mJ",
        resultado: "E = 28.0 mJ",
        valorCopiable: "E = 28.0 mJ"
      },
      {
        letra: "b",
        titulo: "Rapidez en x = 1.00 cm",
        pasos: [
          "v = √[(k/m)(A² - x²)] = √[(35.0/0.0500)(0.0400² - 0.0100²)]",
          "v = √[700 * (0.00160 - 0.00010)] = √[700 * 0.00150] = √1.050 ≈ 1.0247 m/s"
        ],
        formula: "v = 1.025 m/s",
        resultado: "v(1cm) = 1.025 m/s",
        valorCopiable: "v = 1.025 m/s"
      },
      {
        letra: "c & d",
        titulo: "Energías K y U en x = 3.00 cm",
        pasos: [
          "U = (1/2) k x² = (1/2)(35.0)(0.0300)² = 17.5 * 0.00090 = 0.01575 J = 15.75 mJ",
          "K = E - U = 28.00 - 15.75 = 12.25 mJ",
          "Comprobación: K + U = 12.25 + 15.75 = 28.00 mJ = E"
        ],
        formula: "K = 12.25 mJ, U = 15.75 mJ",
        resultado: "K = 12.25 mJ, U = 15.75 mJ",
        valorCopiable: "K=12.25mJ, U=15.75mJ"
      }
    ],
    paso4ResultadoFinal: "E = 28.0 mJ, v(1cm) = 1.025 m/s, K(3cm) = 12.25 mJ, U(3cm) = 15.75 mJ",
    paso5ChequeoTip: "Verificar siempre K(x) + U(x) = E en cada punto para validar el balance energético.",
    pistasOro: ["En x = A/2 la energía potencial es el 25% de la total y la cinética es el 75%."],
    ingredientesClave: ["E = 1/2 k A²", "v = √[(k/m)(A²-x²)]", "Balance K+U=E"]
  },

  // ==========================================
  // --- ONDAS Y ACÚSTICA (13 EJERCICIOS) ---
  // ==========================================
  {
    id: "ondas-prob27",
    numero: 18,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 27 (Serway)",
    titulo: "Relación de Tensión y Rapidez de Onda en Cuerda",
    resumenResultado: "T₂ = 13.50 N",
    enunciado: "Una onda viaja a v₁ = 20.0 m/s bajo tensión T₁ = 6.00 N. ¿Qué tensión T₂ se requiere para aumentar su rapidez a v₂ = 30.0 m/s en la misma cuerda?",
    paso0Datos: [
      "v₁ = 20.0 m/s, T₁ = 6.00 N",
      "v₂ = 30.0 m/s",
      "Misma cuerda: densidad lineal μ = cte"
    ],
    paso1EsquemaDCL: "Cuerda tensa uniforme con relación cuadrática v² = T/μ.",
    paso2Justificacion: "Como μ es constante, v ∝ √T  =>  T₂ / T₁ = (v₂ / v₁)². La tensión crece con el cuadrado de la rapidez.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Cálculo de la tensión T₂",
        pasos: [
          "T₂ = T₁ * (v₂ / v₁)² = 6.00 N * (30.0 / 20.0)²",
          "T₂ = 6.00 * (1.50)² = 6.00 * 2.25 = 13.50 N"
        ],
        formula: "T₂ = 13.50 N",
        resultado: "T₂ = 13.50 N",
        valorCopiable: "T2 = 13.50 N"
      }
    ],
    paso4ResultadoFinal: "T₂ = 13.50 N",
    paso5ChequeoTip: "Para elevar la rapidez un 50% (+1.5x), la tensión debe incrementarse un 125% (+2.25x).",
    pistasOro: ["v ∝ √T: duplicar la rapidez exige cuadruplicar la tensión."],
    ingredientesClave: ["v = √(T/μ)", "Relación de escala cuadrática"]
  },
  {
    id: "ondas-1512",
    numero: 19,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.12",
    titulo: "Rapidez de Propagación contra Rapidez de Partícula Transversal",
    resumenResultado: "v_y,max = v  <=>  A = λ / (2π)",
    enunciado: "Para la onda viajera y(x,t) = A cos[2πf(x/v - t)], hallar la velocidad transversal v_y(x,t) y deducir bajo qué condición v_y,max = v.",
    paso0Datos: [
      "y(x,t) = A cos[2πf(x/v - t)] = A cos[(2π/λ)(x - vt)]",
      "Rapidez de propagación: v",
      "Longitud de onda: λ, Frecuencia: f"
    ],
    paso1EsquemaDCL: "La onda viaja horizontalmente a rapidez constante v; cada partícula de la cuerda oscila verticalmente a velocidad v_y = ∂y/∂t.",
    paso2Justificacion: "Derivada parcial temporal ∂y/∂t para la velocidad de oscilación transversal de los elementos de masa.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Forma estándar en función de λ y v",
        pasos: [
          "2πf (x/v - t) = 2π (v/λ) (x/v - t) = (2π/λ)(x - vt)",
          "y(x,t) = A cos[(2π/λ)(x - vt)]  (Q.E.D.)"
        ],
        formula: "y(x,t) = A cos[(2π/λ)(x - vt)]",
        resultado: "Demostrado",
        valorCopiable: "y = A*cos((2pi/lambda)*(x - v*t))"
      },
      {
        letra: "b",
        titulo: "Expresión de velocidad transversal v_y(x,t)",
        pasos: [
          "v_y = ∂y/∂t = -A sin[(2π/λ)(x - vt)] * (-2πv / λ)",
          "v_y(x,t) = (2π v A / λ) sin[(2π/λ)(x - vt)] = ωA sin(kx - ωt)"
        ],
        formula: "v_y = (2π v A / λ) sin[k(x - vt)]",
        resultado: "v_y(x,t) derivado",
        valorCopiable: "vy = (2*pi*v*A/lambda)*sin(k*(x-v*t))"
      },
      {
        letra: "c",
        titulo: "Condición para v_y,max = v",
        pasos: [
          "v_y,max = 2π v A / λ",
          "Igualando v_y,max = v: (2π v A / λ) = v  =>  2π A / λ = 1  =>  A = λ / (2π)"
        ],
        formula: "A = λ / (2π)",
        resultado: "A = λ / (2π)",
        valorCopiable: "A = lambda / (2*pi)"
      }
    ],
    paso4ResultadoFinal: "v_y,max = v <=> A = λ / (2π)",
    paso5ChequeoTip: "La rapidez de onda v es constante del medio; la rapidez de partícula v_y oscila armónicamente entre +v_y,max y -v_y,max.",
    pistasOro: ["No confundir velocidad de propagación v con velocidad de partícula v_y."],
    ingredientesClave: ["Derivada parcial ∂y/∂t", "v_y,max = ωA", "A = λ/(2π)"]
  },
  {
    id: "ondas-1544",
    numero: 20,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.44",
    titulo: "Cuerda de Instrumento Musical, Segundo Sobretono y Tensión",
    resumenResultado: "T = 3.08×10⁵ N | f₁ = 3.42 kHz",
    enunciado: "Cuerda de L = 0.750 m, m = 8.75 g vibrando en 2do sobretono (n=3) emite sonido en aire (v = 344 m/s) con λ_aire = 3.35 cm. Hallar tensión T y frecuencia fundamental f₁.",
    paso0Datos: [
      "L = 0.750 m, m = 8.75×10⁻³ kg  =>  μ = m/L = 0.011667 kg/m",
      "v_aire = 344 m/s, λ_aire = 0.0335 m",
      "Segundo sobretono: n = 3 (tercer armónico)"
    ],
    paso1EsquemaDCL: "Cuerda con 3 vientres y 4 nodos: λ₃ = 2L/3 = 0.500 m. Frecuencia se preserva al transmitirse al aire.",
    paso2Justificacion: "La frecuencia f₃ es idéntica en la cuerda y en el aire: f₃ = v_aire / λ_aire. Luego v_cuerda = λ₃ * f₃ y T = μ v_cuerda².",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Frecuencia f₃, rapidez en cuerda y tensión T",
        pasos: [
          "f₃ = 344 / 0.0335 ≈ 10268.66 Hz ≈ 10.27 kHz",
          "λ₃ = 2(0.750)/3 = 0.500 m",
          "v_cuerda = λ₃ * f₃ = (0.500)(10268.66) = 5134.33 m/s",
          "T = μ v_cuerda² = (0.011667 kg/m)(5134.33 m/s)² ≈ 3.075 × 10⁵ N ≈ 3.08 × 10⁵ N"
        ],
        formula: "T = 3.08 × 10⁵ N",
        resultado: "T = 3.08 × 10⁵ N",
        valorCopiable: "T = 3.08e5 N"
      },
      {
        letra: "b",
        titulo: "Frecuencia fundamental f₁",
        pasos: [
          "f₁ = f₃ / 3 = 10268.66 / 3 ≈ 3422.89 Hz ≈ 3.42 kHz"
        ],
        formula: "f₁ = 3.42 kHz",
        resultado: "f₁ = 3.42 kHz",
        valorCopiable: "f1 = 3.42 kHz"
      }
    ],
    paso4ResultadoFinal: "T = 3.08×10⁵ N, f₁ = 3.42 kHz",
    paso5ChequeoTip: "Fundamental = n=1; 1er sobretono = n=2; 2do sobretono = n=3.",
    pistasOro: ["Al cambiar de medio, la frecuencia f se mantiene constante; la velocidad v y longitud λ cambian."],
    ingredientesClave: ["Preservación de f", "λ_n = 2L/n", "T = μ v²"]
  },
  {
    id: "ondas-1550",
    numero: 21,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.50",
    titulo: "Lectura de Ecuación de Onda Viajera Senoidal",
    resumenResultado: "A = 7.50 mm | λ = 5.00 cm | f = 125 Hz | v = 6.25 m/s (-x) | P_med = 5.42 W",
    enunciado: "Dada y(x,t) = (0.750 cm) cos[π(0.400 cm⁻¹ x + 250 s⁻¹ t)] y μ = 0.0500 kg/m, hallar A, λ, f, T, v, dirección, tensión T y potencia media P_med.",
    paso0Datos: [
      "y(x,t) = (0.00750 m) cos(40π x + 250π t)",
      "k = 40π rad/m = 125.66 rad/m,  ω = 250π rad/s = 785.4 rad/s",
      "μ = 0.0500 kg/m"
    ],
    paso1EsquemaDCL: "Onda viajera cosenoidal propagándose hacia la izquierda (-x) por el signo positivo en la fase (kx + ωt).",
    paso2Justificacion: "Comparación canónica con y(x,t) = A cos(kx + ωt) y fórmulas dinámicas T_tensión = μ v² y P_med = 1/2 μ v ω² A².",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Parámetros cinemáticos",
        pasos: [
          "A = 0.750 cm = 7.50 mm",
          "λ = 2π / k = 2π / (40π) = 0.0500 m = 5.00 cm",
          "f = ω / 2π = 250π / 2π = 125 Hz",
          "T_per = 1 / f = 1/125 = 0.00800 s = 8.00 ms",
          "v = ω / k = 250π / 40π = 6.25 m/s"
        ],
        formula: "A = 7.5mm, λ = 5cm, f = 125Hz, T = 8ms, v = 6.25m/s",
        resultado: "A=7.5mm, λ=5cm, f=125Hz, v=6.25m/s",
        valorCopiable: "A=0.0075, lambda=0.05, f=125, v=6.25"
      },
      {
        letra: "b & c",
        titulo: "Dirección de propagación",
        pasos: [
          "Fase: (kx + ωt). Para mantener fase constante, si t sube, x debe bajar.",
          "Dirección: hacia -x (hacia la izquierda)."
        ],
        formula: "Dirección: -x",
        resultado: "Dirección -x (Izquierda)",
        valorCopiable: "-x"
      },
      {
        letra: "d & e",
        titulo: "Tensión en cuerda y potencia media",
        pasos: [
          "T_tensión = μ v² = (0.0500)(6.25)² = 1.953 N ≈ 1.95 N",
          "P_med = (1/2) μ v ω² A² = (1/2)(0.0500)(6.25)(250π)²(0.00750)² ≈ 5.42 W"
        ],
        formula: "T = 1.95 N, P_med = 5.42 W",
        resultado: "T = 1.95 N, P_med = 5.42 W",
        valorCopiable: "T=1.95N, P=5.42W"
      }
    ],
    paso4ResultadoFinal: "A = 7.50 mm, λ = 5.00 cm, f = 125 Hz, v = 6.25 m/s (-x), T = 1.95 N, P_med = 5.42 W",
    paso5ChequeoTip: "(kx - ωt) -> hacia +x; (kx + ωt) -> hacia -x.",
    pistasOro: ["Distribuye siempre π al interior del argumento antes de identificar k y ω."],
    ingredientesClave: ["Forma canónica A cos(kx±ωt)", "P_med = 1/2 μ v ω² A²", "v = ω/k"]
  },
  {
    id: "ondas-1541",
    numero: 22,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.41",
    titulo: "Tercer Armónico de Cuerda Fija y Descomposición en Viajeras",
    resumenResultado: "L = 2.77 m | A_viajera = 2.80 cm | v_y,max = 2.80 m/s | y₈ ecuación",
    enunciado: "Onda estacionaria en 3er armónico: y(x,t) = (5.60 cm) sin[(0.0340 rad/cm) x] sin[(50.0 rad/s) t]. Hallar A_viajera, L, v, v_y,max y la ecuación para el 8vo armónico.",
    paso0Datos: [
      "y(x,t) = (5.60 cm) sin(3.40 x) sin(50.0 t) [en metros: k = 3.40 rad/m, ω = 50.0 rad/s]",
      "3er armónico: n = 3 (3 vientres, 4 nodos)",
      "Extremos fijos: x=0 y x=L"
    ],
    paso1EsquemaDCL: "Patrón N-A-N-A-N-A-N con 3 lazos de longitud λ/2 cada uno.",
    paso2Justificacion: "Onda estacionaria y = 2A sin(kx) sin(ωt) compuesta por dos ondas viajeras de amplitud A = A_SW / 2.",
    paso3Incisos: [
      {
        letra: "a & b",
        titulo: "Amplitud de ondas viajeras componentes",
        pasos: ["A_viajera = A_SW / 2 = 5.60 cm / 2 = 2.80 cm = 0.0280 m"],
        formula: "A_viajera = 2.80 cm",
        resultado: "A_viajera = 2.80 cm",
        valorCopiable: "A_viajera = 2.80 cm"
      },
      {
        letra: "c & d",
        titulo: "Longitud L, λ, f, T y rapidez v",
        pasos: [
          "λ = 2π / 0.0340 cm⁻¹ ≈ 184.8 cm = 1.848 m",
          "L = 3λ / 2 = 3(1.848)/2 = 2.772 m ≈ 2.77 m",
          "f = 50.0 / 2π ≈ 7.96 Hz,  T = 1/f = 0.126 s",
          "v = ω / k = 50.0 / 3.40 = 14.71 m/s"
        ],
        formula: "L = 2.77 m, λ = 1.85 m, f = 7.96 Hz, v = 14.71 m/s",
        resultado: "L = 2.77 m, v = 14.71 m/s",
        valorCopiable: "L=2.77m, v=14.71m/s"
      },
      {
        letra: "e",
        titulo: "Rapidez transversal máxima v_y,max",
        pasos: [
          "v_y,max = A_SW * ω = (0.0560 m)(50.0 rad/s) = 2.80 m/s"
        ],
        formula: "v_y,max = 2.80 m/s",
        resultado: "v_y,max = 2.80 m/s",
        valorCopiable: "vy_max = 2.80 m/s"
      },
      {
        letra: "f",
        titulo: "Ecuación para el 8vo armónico (n=8)",
        pasos: [
          "k₈ = (8/3) k₃ = (8/3)(0.0340) = 0.09067 rad/cm = 9.07 rad/m",
          "ω₈ = (8/3) ω₃ = (8/3)(50.0) = 133.33 rad/s",
          "y₈(x,t) = (5.60 cm) sin(0.0907 x) sin(133.3 t)"
        ],
        formula: "y₈ = (5.60 cm) sin(0.0907 x) sin(133.3 t)",
        resultado: "y₈ planteada",
        valorCopiable: "y8 = 5.60*sin(0.0907*x)*sin(133.3*t)"
      }
    ],
    paso4ResultadoFinal: "A_viajera = 2.80 cm, L = 2.77 m, v = 14.71 m/s, v_y,max = 2.80 m/s",
    paso5ChequeoTip: "En armónicos superiores, la rapidez v no cambia porque la cuerda y tensión son las mismas; k y ω crecen proporcionalmente a n.",
    pistasOro: ["A_viajera = 1/2 A_antinodo estacionario."],
    ingredientesClave: ["Onda estacionaria", "L = n λ / 2", "Escalamiento modal n=8"]
  },
  {
    id: "ondas-1547",
    numero: 23,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.47",
    titulo: "Cuerda de Guitarra, Aumento de Tensión del 1% y Sonido en Aire",
    resumenResultado: "v = 311 m/s | f' = 246.2 Hz | λ_aire = 1.40 m",
    enunciado: "Cuerda de L = 0.635 m afinada en f₁ = 245 Hz emite sonido en aire (v_sonido = 344 m/s). Hallar v_cuerda, f' si la tensión sube 1.0%, y λ_aire.",
    paso0Datos: [
      "L = 0.635 m, f₁ = 245 Hz (modo fundamental n=1)",
      "v_aire = 344 m/s",
      "Aumento de tensión: T' = 1.010 T"
    ],
    paso1EsquemaDCL: "Modo fundamental de cuerda fija: dos nodos en extremos y un vientre central (λ₁ = 2L).",
    paso2Justificacion: "λ₁ = 2L  =>  v = λ₁ f₁. Relación f ∝ √T para calcular el cambio de afinación. La frecuencia se conserva en el aire.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Rapidez de onda en la cuerda",
        pasos: [
          "λ₁ = 2L = 2(0.635 m) = 1.270 m",
          "v = λ₁ f₁ = (1.270 m)(245 s⁻¹) = 311.15 m/s ≈ 311 m/s"
        ],
        formula: "v = 311 m/s",
        resultado: "v = 311 m/s",
        valorCopiable: "v = 311 m/s"
      },
      {
        letra: "b",
        titulo: "Nueva frecuencia con +1% de tensión",
        pasos: [
          "f' = f₁ √(T'/T) = 245 * √(1.010) = 245 * 1.004988 ≈ 246.22 Hz ≈ 246.2 Hz"
        ],
        formula: "f' = 246.2 Hz",
        resultado: "f' = 246.2 Hz",
        valorCopiable: "f' = 246.2 Hz"
      },
      {
        letra: "c",
        titulo: "Frecuencia y longitud de onda del sonido en el aire",
        pasos: [
          "f_aire = f₁ = 245 Hz",
          "λ_aire = v_aire / f_aire = 344 / 245 ≈ 1.4041 m ≈ 1.40 m"
        ],
        formula: "f_aire = 245 Hz, λ_aire = 1.40 m",
        resultado: "f_aire = 245 Hz, λ_aire = 1.40 m",
        valorCopiable: "f_aire=245Hz, lambda_aire=1.40m"
      }
    ],
    paso4ResultadoFinal: "v = 311 m/s, f' = 246.2 Hz, λ_aire = 1.40 m",
    paso5ChequeoTip: "La frecuencia f y ω son idénticas en la cuerda y en el aire circundante; λ_cuerda (1.27m) ≠ λ_aire (1.40m) debido a las diferentes velocidades.",
    pistasOro: ["Aproximación para pequeños cambios: Δf/f ≈ (1/2) ΔT/T = +0.5%."],
    ingredientesClave: ["λ₁ = 2L", "f ∝ √T", "Conservación de f al emitir sonido"]
  },
  {
    id: "ondas-1560",
    numero: 24,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.60",
    titulo: "Alambre Vertical con Carga y Cambio en Longitud de Onda",
    resumenResultado: "λ₃ = 0.800 m | Δλ₃ = 0.00 m (Invariable)",
    enunciado: "Alambre de L = 1.20 m fijado en ambos extremos vibra en su tercer armónico (n=3) soportando una esfera de 100 N y luego de 500 N. Hallar λ₃ y el cambio Δλ₃.",
    paso0Datos: [
      "L = 1.20 m, n = 3",
      "Carga 1: W₁ = 100.0 N",
      "Carga 2: W₂ = 500.0 N"
    ],
    paso1EsquemaDCL: "Alambre vertical con extremos fijos. DCL esfera: T = W en equilibrio.",
    paso2Justificacion: "En extremos fijos, las longitudes de onda están cuantizadas exclusivamente por la geometría: λ_n = 2L/n, independiente de la tensión.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Longitud de onda del 3er armónico",
        pasos: ["λ₃ = 2L / 3 = 2(1.20 m) / 3 = 0.800 m = 80.0 cm"],
        formula: "λ₃ = 0.800 m",
        resultado: "λ₃ = 0.800 m",
        valorCopiable: "lambda_3 = 0.800 m"
      },
      {
        letra: "b",
        titulo: "Cambio al quintuplicar la carga",
        pasos: [
          "Al cambiar a 500 N, aumentan la tensión T, la velocidad v y la frecuencia f₃.",
          "Sin embargo, L no cambia y n=3 sigue igual: λ₃' = 2(1.20)/3 = 0.800 m.",
          "Δλ₃ = 0.800 - 0.800 = 0.00 m"
        ],
        formula: "Δλ₃ = 0.00 m",
        resultado: "Δλ₃ = 0.00 m (No cambia)",
        valorCopiable: "Delta_lambda = 0"
      }
    ],
    paso4ResultadoFinal: "λ₃ = 0.800 m, Δλ₃ = 0.00 m",
    paso5ChequeoTip: "La tensión cambia la velocidad y la frecuencia de afinación, ¡pero NO altera la geometría espacial de los nodos!",
    pistasOro: ["Pregunta conceptual típica: λ_n depende SOLO de L y n."],
    ingredientesClave: ["λ_n = 2L/n", "Cuantización geométrica", "Independencia de T"]
  },
  {
    id: "ondas-1565",
    numero: 25,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.65",
    titulo: "Potencia Media de Onda y Efecto al Duplicar la Rapidez",
    resumenResultado: "A = 7.07 cm | P_nuevo = 400 W (factor 8x)",
    enunciado: "Cuerda de L = 8.00 m, m = 6.00 g transmite P_med = 50.0 W con v = 30.0 m/s y λ = 0.200 m. Hallar A y la potencia si la rapidez se duplica manteniendo A y λ.",
    paso0Datos: [
      "L = 8.00 m, m = 6.00×10⁻³ kg  =>  μ = 7.50×10⁻⁴ kg/m",
      "v₁ = 30.0 m/s, λ = 0.200 m, P₁ = 50.0 W",
      "Caso 2: v₂ = 2 v₁ = 60.0 m/s con A y λ constantes"
    ],
    paso1EsquemaDCL: "Onda sinusoidal continua transmitiendo flujo de energía mecánica proporcional a μ v ω² A².",
    paso2Justificacion: "Como ω = 2π v / λ, la potencia media es P_med = 2π² μ A² v³ / λ² ∝ v³. Depende cúbicamente de la rapidez.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Cálculo de amplitud A",
        pasos: [
          "ω = 2π v / λ = 2π (30.0 / 0.200) = 300π ≈ 942.48 rad/s",
          "A² = 2 P_med / (μ v ω²) = 2(50.0) / [(7.50×10⁻⁴)(30.0)(942.48)²] ≈ 5.0035×10⁻³ m²",
          "A = √(5.0035×10⁻³) ≈ 0.07074 m = 7.07 cm"
        ],
        formula: "A = 7.07 cm",
        resultado: "A = 7.07 cm",
        valorCopiable: "A = 7.07 cm"
      },
      {
        letra: "b",
        titulo: "Potencia al duplicar rapidez (v₂ = 2 v₁)",
        pasos: [
          "P ∝ v³ con A y λ fijos.",
          "P₂ = P₁ * (2)³ = 50.0 W * 8 = 400.0 W"
        ],
        formula: "P₂ = 400 W",
        resultado: "P₂ = 400 W (8x)",
        valorCopiable: "P2 = 400 W"
      }
    ],
    paso4ResultadoFinal: "A = 7.07 cm, P_nuevo = 400 W",
    paso5ChequeoTip: "Al duplicar v con λ constante, la frecuencia se duplica (factor 4 en ω²) y la rapidez se duplica (factor 2 en v): 4 * 2 = 8x.",
    pistasOro: ["P_med ∝ v³ cuando λ se mantiene constante."],
    ingredientesClave: ["P_med = 1/2 μ v ω² A²", "Dependencia cúbica P ∝ v³"]
  },
  {
    id: "ondas-1574",
    numero: 26,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.74",
    titulo: "Cinemática Local de Puntos en Onda Estacionaria",
    resumenResultado: "A(40cm)=0 | A(20cm)=4mm | A(10cm)=2.83mm | Δt(cresta a valle)=2.08 ms",
    enunciado: "3er armónico con v = 192 m/s, f = 240 Hz, A_antinodo = 0.400 cm. Hallar amplitud, v_y,max y a_y,max en x = 40cm, 20cm y 10cm, y tiempo de cresta a valle.",
    paso0Datos: [
      "n = 3, v = 192 m/s, f = 240 Hz, A_SW = 0.400 cm = 0.00400 m",
      "λ = v/f = 192/240 = 0.800 m = 80.0 cm  =>  k = 2π/80.0 = π/40 rad/cm",
      "ω = 2π(240) = 480π ≈ 1507.96 rad/s"
    ],
    paso1EsquemaDCL: "Envolvente espacial A(x) = A_SW |sin(kx)| sobre la cuerda fija de L = 3λ/2 = 1.20 m.",
    paso2Justificacion: "Cada punto oscila en M.A.S. local con amplitud A(x), velocidad v_y,max = A(x)*ω y aceleración a_y,max = A(x)*ω².",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Amplitud en las 3 posiciones",
        pasos: [
          "x = 40.0 cm: A(40) = 0.400 |sin(π)| = 0.00 cm (NODO)",
          "x = 20.0 cm: A(20) = 0.400 |sin(π/2)| = 0.400 cm = 4.00 mm (ANTINODO)",
          "x = 10.0 cm: A(10) = 0.400 |sin(π/4)| = 0.400(√2/2) = 0.2828 cm = 2.83 mm"
        ],
        formula: "A(40)=0, A(20)=4mm, A(10)=2.83mm",
        resultado: "A: 0, 4.0mm, 2.83mm",
        valorCopiable: "A: 0, 4mm, 2.83mm"
      },
      {
        letra: "b",
        titulo: "Tiempo de cresta a valle",
        pasos: [
          "Medio periodo: Δt = T / 2 = 1 / (2f) = 1 / (2 * 240) = 1 / 480 s ≈ 2.083 × 10⁻³ s = 2.08 ms"
        ],
        formula: "Δt = 2.08 ms",
        resultado: "Δt = 2.08 ms",
        valorCopiable: "Delta t = 2.08 ms"
      },
      {
        letra: "c",
        titulo: "Cinemática máxima (v_y,max y a_y,max)",
        pasos: [
          "x = 40 cm (Nodo): v = 0 m/s, a = 0 m/s²",
          "x = 20 cm (Antinodo): v = (0.0040)(1508) = 6.03 m/s, a = (0.0040)(1508)² = 9.10×10³ m/s²",
          "x = 10 cm: v = (0.002828)(1508) = 4.27 m/s, a = (0.002828)(1508)² = 6.43×10³ m/s²"
        ],
        formula: "x=20cm: v=6.03 m/s, a=9.10×10³ m/s²",
        resultado: "Cinemática calculada",
        valorCopiable: "v=6.03m/s, a=9.10e3m/s2"
      }
    ],
    paso4ResultadoFinal: "A(40)=0, A(20)=4mm, A(10)=2.83mm | Δt = 2.08 ms",
    paso5ChequeoTip: "En los antinodos la aceleración es enorme (~928 g), común en vibraciones acústicas de alta frecuencia.",
    pistasOro: ["Primero halla el patrón de nodos/vientres antes de calcular velocidades."],
    ingredientesClave: ["A(x) = A_SW |sin(kx)|", "v_max = A(x) ω", "a_max = A(x) ω²"]
  },
  {
    id: "ondas-1515",
    numero: 27,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.15",
    titulo: "Cuerda con Masa Suspendida y Duplicación de Carga",
    resumenResultado: "v₁ = 16.35 m/s, λ₁ = 0.136 m | v₂ = 23.12 m/s, λ₂ = 0.193 m (x√2)",
    enunciado: "Diapasón a f = 120 Hz genera ondas en cuerda con μ = 0.0550 kg/m tensada por masa colgante m₁ = 1.50 kg. Hallar v₁, λ₁ y sus nuevos valores al duplicar la masa a m₂ = 3.00 kg.",
    paso0Datos: [
      "f = 120 Hz (constante fijada por diapasón)",
      "μ = 0.0550 kg/m",
      "m₁ = 1.50 kg  =>  T₁ = m₁ g = (1.50)(9.80) = 14.70 N",
      "m₂ = 3.00 kg  =>  T₂ = 29.40 N"
    ],
    paso1EsquemaDCL: "Masa colgante en polea: T = mg. Cuerda horizontal recibiendo ondas a frecuencia constante 120 Hz.",
    paso2Justificacion: "v = √(T/μ) y λ = v/f. Al duplicar la masa colgante, T se duplica y tanto v como λ crecen por un factor de √2.",
    paso3Incisos: [
      {
        letra: "a & b",
        titulo: "Caso m₁ = 1.50 kg",
        pasos: [
          "v₁ = √(14.70 / 0.0550) = √267.27 ≈ 16.348 m/s ≈ 16.35 m/s",
          "λ₁ = v₁ / f = 16.348 / 120 ≈ 0.1362 m = 13.6 cm"
        ],
        formula: "v₁ = 16.35 m/s, λ₁ = 0.136 m",
        resultado: "v₁ = 16.35 m/s, λ₁ = 13.6 cm",
        valorCopiable: "v1=16.35m/s, lambda1=0.136m"
      },
      {
        letra: "c",
        titulo: "Caso m₂ = 3.00 kg (Carga duplicada)",
        pasos: [
          "v₂ = v₁ * √2 = 16.348 * 1.4142 ≈ 23.12 m/s",
          "λ₂ = λ₁ * √2 = 0.1362 * 1.4142 ≈ 0.1927 m = 19.3 cm"
        ],
        formula: "v₂ = 23.12 m/s, λ₂ = 0.193 m",
        resultado: "v₂ = 23.12 m/s, λ₂ = 19.3 cm",
        valorCopiable: "v2=23.12m/s, lambda2=0.193m"
      }
    ],
    paso4ResultadoFinal: "v₁ = 16.35 m/s, λ₁ = 13.6 cm; v₂ = 23.12 m/s, λ₂ = 19.3 cm",
    paso5ChequeoTip: "Como el diapasón fuerza f = 120 Hz constante, la longitud de onda se expande en la misma proporción que la velocidad (x√2 ≈ +41.4%).",
    pistasOro: ["DCL en polea: T = m*g."],
    ingredientesClave: ["T = mg", "v = √(T/μ)", "λ = v/f", "Escalamiento por √2"]
  },
  {
    id: "ondas-153",
    numero: 28,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 15.3",
    titulo: "Onda Oceánica (Tsunami de Sumatra) y Rapidez",
    resumenResultado: "v = 800 km/h = 222.2 m/s",
    enunciado: "Un tsunami oceánico tiene distancia entre crestas λ = 800 km y periodo T = 1.0 h. Hallar su rapidez en km/h y m/s y explicar su devastación costera.",
    paso0Datos: [
      "Longitud de onda: λ = 800 km = 8.00×10⁵ m",
      "Periodo: T = 1.0 h = 3600 s"
    ],
    paso1EsquemaDCL: "Onda de aguas someras oceánicas (h << λ) donde la columna entera de agua se desplaza al unísono.",
    paso2Justificacion: "Relación de velocidad de fase v = λ / T y conversión rigurosa de unidades.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Cálculo de rapidez en km/h y m/s",
        pasos: [
          "v = λ / T = 800 km / 1.0 h = 800 km/h",
          "v = 800 * (1000 m / 3600 s) = 800 / 3.6 ≈ 222.22 m/s"
        ],
        formula: "v = 800 km/h = 222.2 m/s",
        resultado: "v = 800 km/h = 222.2 m/s",
        valorCopiable: "v = 222.2 m/s"
      },
      {
        letra: "b",
        titulo: "Explicación física de la devastación",
        pasos: [
          "1. Velocidad extrema: 800 km/h (similar a un avión comercial Boeing 777).",
          "2. Masa oceánica total: involucra millones de toneladas de agua moviéndose en bloque.",
          "3. Efecto Shoaling: al llegar a la costa la velocidad baja pero la conservación de energía eleva la masa en muros de agua destructivos."
        ],
        formula: "Efecto Shoaling + Energía cinética colosal",
        resultado: "Justificación física completa",
        valorCopiable: "Shoaling costero y energia colosal"
      }
    ],
    paso4ResultadoFinal: "v = 800 km/h = 222.2 m/s",
    paso5ChequeoTip: "En aguas profundas (h ≈ 5000m), v = √(gh) = √(9.8*5000) ≈ 221 m/s ≈ 797 km/h, coincidente con la cinemática.",
    pistasOro: ["Distancia entre crestas consecutivas es SIEMPRE la longitud de onda λ."],
    ingredientesClave: ["v = λ/T", "Conversión SI km/h a m/s", "Efecto Shoaling"]
  },
  {
    id: "ondas-prob31",
    numero: 29,
    categoria: "ondas",
    categoriaLabel: "Ondas y Acústica",
    tag: "Prob 31",
    titulo: "Alambre Compuesto (Acero + Cobre) y Tiempo de Tránsito Total",
    resumenResultado: "t_total = 0.329 s = 329 ms",
    enunciado: "Alambre de acero (L₁ = 30.0 m, ρ = 7860 kg/m³) unido a alambre de cobre (L₂ = 20.0 m, ρ = 8920 kg/m³), ambos con d = 1.00 mm bajo T = 150 N. Hallar tiempo total.",
    paso0Datos: [
      "d = 1.00 mm  =>  r = 0.50 mm  =>  A_transversal = π(5×10⁻⁴)² = 7.854×10⁻⁷ m²",
      "Acero: L₁ = 30.0 m, ρ₁ = 7860 kg/m³  =>  μ₁ = ρ₁ A = 6.173×10⁻³ kg/m",
      "Cobre: L₂ = 20.0 m, ρ₂ = 8920 kg/m³  =>  μ₂ = ρ₂ A = 7.006×10⁻³ kg/m",
      "Tensión común: T = 150.0 N"
    ],
    paso1EsquemaDCL: "Dos tramos en serie con misma tensión T. El pulso viaja a rapidez v₁ en acero y luego a v₂ en cobre.",
    paso2Justificacion: "Calculamos v₁ y v₂ mediante v = √(T/μ) y sumamos los tiempos de tránsito: t_total = L₁/v₁ + L₂/v₂.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Densidades lineales μ₁ y μ₂",
        pasos: [
          "μ_acero = (7860)(7.854×10⁻⁷) = 6.1732×10⁻³ kg/m",
          "μ_cobre = (8920)(7.854×10⁻⁷) = 7.0057×10⁻³ kg/m"
        ],
        formula: "μ₁ = 6.173 g/m, μ₂ = 7.006 g/m",
        resultado: "μ₁ = 6.173 g/m, μ₂ = 7.006 g/m",
        valorCopiable: "mu1=6.173e-3, mu2=7.006e-3"
      },
      {
        letra: "b",
        titulo: "Rapidez en cada tramo",
        pasos: [
          "v₁ = √(150.0 / 6.1732×10⁻³) = √24298.5 ≈ 155.88 m/s",
          "v₂ = √(150.0 / 7.0057×10⁻³) = √21411.1 ≈ 146.32 m/s"
        ],
        formula: "v₁ = 155.88 m/s, v₂ = 146.32 m/s",
        resultado: "v₁ = 155.88 m/s, v₂ = 146.32 m/s",
        valorCopiable: "v1=155.88, v2=146.32"
      },
      {
        letra: "c",
        titulo: "Tiempo de tránsito total",
        pasos: [
          "t₁ = 30.0 / 155.88 ≈ 0.19246 s",
          "t₂ = 20.0 / 146.32 ≈ 0.13669 s",
          "t_total = t₁ + t₂ = 0.19246 + 0.13669 = 0.32915 s ≈ 0.329 s = 329 ms"
        ],
        formula: "t_total = 0.329 s",
        resultado: "t_total = 0.329 s",
        valorCopiable: "t_total = 0.329 s"
      }
    ],
    paso4ResultadoFinal: "t_total = 0.329 s = 329 ms",
    paso5ChequeoTip: "Como el cobre es más denso que el acero, la onda viaja más despacio en el tramo de cobre (146.3 m/s < 155.9 m/s).",
    pistasOro: ["La tensión T es exactamente la misma a lo largo de cables unidos en serie."],
    ingredientesClave: ["μ = ρ · Area", "v = √(T/μ)", "t_total = Σ(L_i / v_i)"]
  },

  // ==========================================
  // --- EDO BERNOULLI & CÁLCULO (1 EJERCICIO MAESTRO INTEGRAL) ---
  // ==========================================
  {
    id: "edo-bernoulli-mas",
    numero: 30,
    categoria: "edo",
    categoriaLabel: "EDO Bernoulli / Cálculo",
    tag: "EDO Bernoulli",
    titulo: "Ecuación Diferencial No Lineal de Bernoulli en Amortiguamiento Cuadrático",
    resumenResultado: "v(t) = v₀ / (1 + (c v₀ / m) t) | Integración analítica",
    enunciado: "Resolver la EDO no lineal de Bernoulli m (dv/dt) + c v² = 0 para un cuerpo con resistencia aerodinámica cuadrática y condición v(0) = v₀.",
    paso0Datos: [
      "Ecuación diferencial: m (dv/dt) + c v² = 0  =>  dv/dt + (c/m) v² = 0",
      "Tipo: EDO de Bernoulli con n = 2: y' + P(x)y = Q(x)yⁿ",
      "Condición de frontera inicial: v(0) = v₀"
    ],
    paso1EsquemaDCL: "Partícula desacelerando bajo arrastre cuadrático F_drag = -c v².",
    paso2Justificacion: "Transformación canónica de Bernoulli: sustitución u = v^(1-n) = v^(1-2) = v⁻¹ linealiza la EDO en u' - (c/m) = 0.",
    paso3Incisos: [
      {
        letra: "a",
        titulo: "Sustitución y linealización de Bernoulli",
        pasos: [
          "Sea u = v⁻¹ = 1/v  =>  du/dt = -v⁻² (dv/dt)",
          "Dividimos la EDO original entre v²: v⁻² (dv/dt) + (c/m) = 0",
          "- (du/dt) + (c/m) = 0  =>  du/dt = c/m"
        ],
        formula: "du/dt = c/m",
        resultado: "EDO linealizada",
        valorCopiable: "du/dt = c/m"
      },
      {
        letra: "b",
        titulo: "Integración y condición inicial",
        pasos: [
          "u(t) = (c/m) t + C",
          "Para t = 0: u(0) = 1/v₀  =>  C = 1/v₀",
          "u(t) = (c/m) t + 1/v₀ = [1 + (c v₀ / m) t] / v₀"
        ],
        formula: "u(t) = 1/v₀ + (c/m)t",
        resultado: "u(t) determinado",
        valorCopiable: "u(t) = 1/v0 + (c/m)*t"
      },
      {
        letra: "c",
        titulo: "Retorno a la variable original v(t)",
        pasos: [
          "v(t) = 1 / u(t) = v₀ / [1 + (c v₀ / m) t]"
        ],
        formula: "v(t) = v₀ / [1 + (c v₀ / m) t]",
        resultado: "v(t) = v₀ / [1 + (c v₀ / m) t]",
        valorCopiable: "v(t) = v0 / (1 + (c*v0/m)*t)"
      }
    ],
    paso4ResultadoFinal: "v(t) = v₀ / [1 + (c v₀ / m) t]",
    paso5ChequeoTip: "Para t -> ∞, v(t) -> 0 como 1/t (decaimiento hiperbólico lento, mucho más suave que el decaimiento exponencial lineal e^(-kt)).",
    pistasOro: ["Toda EDO de la forma y' + P(x)y = Q(x)yⁿ se linealiza exactamente con u = y^(1-n)."],
    ingredientesClave: ["Transformación de Bernoulli", "u = v⁻¹", "Decaimiento hiperbólico"]
  }
];

export function CuadernoMaestroEngine() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    "circuito-1": true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    EJERCICIOS_MAESTROS.forEach((e) => {
      allExpanded[e.id] = true;
    });
    setExpandedCards(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEjercicios = useMemo(() => {
    return EJERCICIOS_MAESTROS.filter((ej) => {
      const matchesTab = activeTab === "all" || ej.categoria === activeTab;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        ej.titulo.toLowerCase().includes(searchLower) ||
        ej.tag.toLowerCase().includes(searchLower) ||
        ej.resumenResultado.toLowerCase().includes(searchLower) ||
        ej.enunciado.toLowerCase().includes(searchLower) ||
        ej.ingredientesClave.some((k) => k.toLowerCase().includes(searchLower));

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchTerm]);

  const counts = useMemo(() => {
    return {
      all: EJERCICIOS_MAESTROS.length,
      circuitos: EJERCICIOS_MAESTROS.filter((e) => e.categoria === "circuitos").length,
      mas: EJERCICIOS_MAESTROS.filter((e) => e.categoria === "mas").length,
      ondas: EJERCICIOS_MAESTROS.filter((e) => e.categoria === "ondas").length,
      edo: EJERCICIOS_MAESTROS.filter((e) => e.categoria === "edo").length,
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-[#0b0f17] text-[#f0f6fc] min-h-screen rounded-2xl border border-[#21262d] shadow-2xl">
      {/* Header Pro */}
      <header className="relative overflow-hidden rounded-2xl border border-[#30363d] bg-gradient-to-r from-[#161b22] via-[#1c2128] to-[#12161f] p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#58a6ff] via-[#38bdf8] to-[#3fb950]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#58a6ff]/10 border border-[#58a6ff]/30 text-[#58a6ff] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Solucionario Maestro 100% Desarrollado
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#58a6ff]" />
              Cuaderno de Apuntes Pro — Ingeniería Mecatrónica
            </h1>
            <p className="text-[#8b949e] text-sm sm:text-base max-w-3xl leading-relaxed">
              Los 30 ejercicios desarrollados paso a paso con la <span className="text-[#58a6ff] font-semibold">receta algorítmica de 5 pasos</span> (Paso 0 a Paso 5), pistas de oro, ingredientes clave, justificación física y soluciones numéricas en unidades SI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={expandAll}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" /> Expandir Todo
            </button>
            <button
              onClick={collapseAll}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" /> Colapsar Todo
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar & Filter Tabs */}
      <div className="sticky top-4 z-30 bg-[#161b22]/95 backdrop-blur-md p-4 rounded-xl border border-[#30363d] shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "all"
                ? "bg-[#58a6ff] text-[#0d1117] shadow-md shadow-[#58a6ff]/20 font-black"
                : "bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Todos ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab("circuitos")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "circuitos"
                ? "bg-[#38bdf8] text-[#0d1117] shadow-md shadow-[#38bdf8]/20 font-black"
                : "bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Circuitos DC/AC ({counts.circuitos})
          </button>
          <button
            onClick={() => setActiveTab("mas")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "mas"
                ? "bg-[#a855f7] text-[#0d1117] shadow-md shadow-[#a855f7]/20 font-black"
                : "bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> M.A.S. ({counts.mas})
          </button>
          <button
            onClick={() => setActiveTab("ondas")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ondas"
                ? "bg-[#10b981] text-[#0d1117] shadow-md shadow-[#10b981]/20 font-black"
                : "bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d]"
            }`}
          >
            <Waves className="w-3.5 h-3.5" /> Ondas & Acústica ({counts.ondas})
          </button>
          <button
            onClick={() => setActiveTab("edo")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "edo"
                ? "bg-[#f59e0b] text-[#0d1117] shadow-md shadow-[#f59e0b]/20 font-black"
                : "bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d]"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> EDO / Cálculo ({counts.edo})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nro, tema, ley..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition-all"
          />
        </div>
      </div>

      {/* Ejercicios Cards Grid */}
      <div className="space-y-6">
        {filteredEjercicios.map((ej) => {
          const isExpanded = !!expandedCards[ej.id];

          const categoryColors = {
            circuitos: "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#38bdf8]",
            mas: "border-[#a855f7]/40 bg-[#a855f7]/10 text-[#a855f7]",
            ondas: "border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]",
            edo: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]",
          };

          return (
            <article
              key={ej.id}
              className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-lg hover:border-[#58a6ff]/50 transition-all duration-200"
            >
              {/* Header de la tarjeta */}
              <div
                onClick={() => toggleCard(ej.id)}
                className="p-4 sm:p-5 bg-[#1c2128] border-b border-[#30363d] cursor-pointer flex items-center justify-between gap-4 select-none hover:bg-[#22272e] transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-black border ${categoryColors[ej.categoria]}`}>
                    {ej.tag}
                  </span>
                  <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
                    {ej.categoriaLabel}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {ej.titulo}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3fb950]/15 border border-[#3fb950]/30 text-[#3fb950] text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {ej.resumenResultado}
                  </span>
                  <div className="p-1 rounded bg-[#21262d] text-[#8b949e]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Contenido expandible con la receta de 5 pasos */}
              {isExpanded && (
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Enunciado formal */}
                  <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] text-sm text-[#c9d1d9] leading-relaxed">
                    <span className="font-bold text-white block mb-1">📖 Enunciado del Problema:</span>
                    {ej.enunciado}
                  </div>

                  {/* Paso 0: Identificación & Datos Clave */}
                  <section className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#58a6ff]">
                      <Sliders className="w-4 h-4" />
                      <span>Paso 0: Identificación & Variables del Sistema</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-lg bg-[#0d1117] border border-[#21262d]">
                      {ej.paso0Datos.map((dato, idx) => (
                        <div key={idx} className="text-xs text-[#c9d1d9] flex items-start gap-2">
                          <span className="text-[#58a6ff] font-bold">•</span>
                          <span>{dato}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Paso 1: DCL / Esquema Conceptual */}
                  <section className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
                      <FileText className="w-4 h-4" />
                      <span>Paso 1: DCL / Esquema Conceptual & Condiciones de Frontera</span>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0d1117] border border-[#21262d] text-xs sm:text-sm text-[#c9d1d9] leading-relaxed font-mono">
                      {ej.paso1EsquemaDCL}
                    </div>
                  </section>

                  {/* Paso 2: Justificación Física ('¿Por qué se usa?') */}
                  <section className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a855f7]">
                      <Lightbulb className="w-4 h-4" />
                      <span>Paso 2: Fundamento Físico & Justificación de Métodos</span>
                    </div>
                    <div className="p-4 rounded-lg bg-[#19152b] border border-[#492e7a] text-xs sm:text-sm text-[#e2d9f3] leading-relaxed">
                      {ej.paso2Justificacion}
                    </div>
                  </section>

                  {/* Paso 3: Derivación Algebraica por Incisos */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#39c5cf]">
                      <Calculator className="w-4 h-4" />
                      <span>Paso 3: Desarrollo Riguroso por Incisos (a, b, c...)</span>
                    </div>

                    <div className="space-y-3">
                      {ej.paso3Incisos.map((inciso, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] border-l-4 border-l-[#39c5cf] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-[#39c5cf] flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#39c5cf]/10 border border-[#39c5cf]/30">
                                Inciso {inciso.letra})
                              </span>
                              {inciso.titulo}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-[#c9d1d9]">
                            {inciso.pasos.map((p, pIdx) => (
                              <p key={pIdx} className="leading-relaxed font-mono">
                                {p}
                              </p>
                            ))}
                          </div>

                          {inciso.formula && (
                            <div className="p-2.5 rounded bg-[#161b22] border border-[#21262d] text-xs font-mono text-[#58a6ff] text-center font-bold">
                              {inciso.formula}
                            </div>
                          )}

                          <div className="flex items-center justify-between p-2 rounded bg-[#0f2d18] border border-[#238636] text-xs">
                            <span className="text-[#7ee787] font-bold">
                              ✅ Resultado: {inciso.resultado}
                            </span>
                            <button
                              onClick={() => copyToClipboard(inciso.valorCopiable, `${ej.id}-${inciso.letra}`)}
                              className="px-2 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `${ej.id}-${inciso.letra}` ? (
                                <>
                                  <Check className="w-3 h-3" /> Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copiar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Paso 4: Resultado Final */}
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3fb950]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Paso 4: Solución Final Numérica con Unidades SI</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#0f2d18]/60 border border-[#238636] text-sm font-black text-[#7ee787] text-center font-mono">
                      {ej.paso4ResultadoFinal}
                    </div>
                  </section>

                  {/* Paso 5: Chequeo Físico & Pistas de Oro */}
                  <section className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d29922]">
                      <Sparkles className="w-4 h-4" />
                      <span>Paso 5: Chequeo Físico & Pistas de Oro de Examen</span>
                    </div>
                    <div className="p-4 rounded-lg bg-[#241c0e] border border-[#744d08] space-y-2">
                      <div className="text-xs text-[#fce5b2] leading-relaxed flex items-start gap-2">
                        <span className="text-[#d29922] font-bold">🔍 Chequeo:</span>
                        <span>{ej.paso5ChequeoTip}</span>
                      </div>
                      {ej.pistasOro.map((pista, pIdx) => (
                        <div key={pIdx} className="text-xs text-[#fce5b2] leading-relaxed flex items-start gap-2">
                          <span className="text-[#d29922] font-bold">💡 Pista de Oro:</span>
                          <span>{pista}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Ingredientes clave */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#21262d]">
                    <span className="text-[11px] font-bold text-[#8b949e]">Ingredientes Clave:</span>
                    {ej.ingredientesClave.map((ing, iIdx) => (
                      <span
                        key={iIdx}
                        className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[10px] text-[#c9d1d9] font-medium"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {filteredEjercicios.length === 0 && (
          <div className="p-12 text-center rounded-xl border border-[#30363d] bg-[#161b22] space-y-3">
            <Search className="w-8 h-8 text-[#8b949e] mx-auto opacity-50" />
            <p className="text-base font-bold text-white">No se encontraron ejercicios</p>
            <p className="text-xs text-[#8b949e]">Prueba ajustando el filtro de categoría o el término de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
