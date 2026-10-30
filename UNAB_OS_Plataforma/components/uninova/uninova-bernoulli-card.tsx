"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface StepDetail {
  step: string;
  badge: string;
  badgeColor: string;
  title: string;
  formula: string;
  explanation: string;
  proTip: string;
}

export interface ExamRecipe {
  id: string;
  subject: string;
  teacher: string;
  title: string;
  tagline: string;
  description: string;
  steps: StepDetail[];
}

export const EXAM_RECIPES: ExamRecipe[] = [
  {
    id: "bernoulli",
    subject: "Cálculo & Ecuaciones Diferenciales",
    teacher: "Prof. Leidy Johanna González Cely",
    title: "Ecuaciones Diferenciales: Algoritmo Mecánico de Bernoulli",
    tagline: "Plan Urgente de Clase · EDO Parcial",
    description: "Extraído del tablero de clase: y' + y = -x/y. Sigue los pasos mecánicos para linealizar y resolver sin álgebra engorrosa.",
    steps: [
      {
        step: "Paso 0",
        badge: "Identificación",
        badgeColor: "var(--color-accent-blue)",
        title: "Detectar la Forma de Bernoulli",
        formula: "y' + p(x)y = g(x)y^a",
        explanation: "Si la ecuación tiene la derivada y' más un término con y, y al lado derecho está multiplicada por y^a (con a ≠ 0 y a ≠ 1), ¡es Bernoulli directo!",
        proTip: "En el tablero: y' + y = -x/y se reescribe como y' + 1·y = (-x)·y⁻¹ con a = -1.",
      },
      {
        step: "Paso 1",
        badge: "Parámetros",
        badgeColor: "var(--color-accent-cyan)",
        title: "Extraer los Parámetros Clave",
        formula: "p(x) = 1,   g(x) = -x,   a = -1   ⇒   (1 - a) = 1 - (-1) = 2",
        explanation: "Identifica claramente cada ingrediente. El término (1 - a) es el factor multiplicador mágico para linealizar.",
        proTip: "No olvides los signos: si es -x/y, g(x) = -x y el exponente en el denominador sube como y⁻¹.",
      },
      {
        step: "Paso 2",
        badge: "Ecuación Auxiliar",
        badgeColor: "var(--color-accent-green)",
        title: "Linealizar en variable u (Fórmula Directa)",
        formula: "u' + (1 - a)p(x)u = (1 - a)g(x)   ⇒   u' + 2u = -2x",
        explanation: "Al sustituir u = y¹⁻ᵃ (u = y²), la ecuación no lineal se convierte inmediatamente en una EDO Lineal estándar u' + P(x)u = Q(x).",
        proTip: "¡No hagas el álgebra larga en el parcial! Usa directamente la fórmula auxiliar u' + (1-a)p u = (1-a)g.",
      },
      {
        step: "Paso 3",
        badge: "Factor Integrante",
        badgeColor: "var(--color-accent-amber)",
        title: "Calcular el Factor Integrante F(x)",
        formula: "F(x) = e^(∫ P(x) dx) = e^(∫ 2 dx) = e^(2x)",
        explanation: "Con P(x) = 2, la integral es directa: ∫ 2 dx = 2x. El factor que multiplica a toda la ecuación es e^(2x).",
        proTip: "Recuerda que en el factor integrante NUNCA se suma la constante +C (se reserva para el paso 4).",
      },
      {
        step: "Paso 4",
        badge: "Solución en u",
        badgeColor: "var(--color-accent-purple)",
        title: "Integrar para hallar u(x)",
        formula: "u(x) = e^(-2x) · [ ∫ e^(2x)·(-2x) dx + C ] = -x + 1/2 + C·e^(-2x)",
        explanation: "Por integración por partes de ∫ -2x e^(2x) dx obtenemos: -x e^(2x) + 1/2 e^(2x). Multiplicando por e^(-2x), queda la solución en u.",
        proTip: "Verifica que el término de integración por partes tenga signos correctos antes de simplificar.",
      },
      {
        step: "Paso 5",
        badge: "Despeje Final",
        badgeColor: "var(--color-accent-rose)",
        title: "Regresar a la Variable Original y",
        formula: "y(x) = ± √( u(x) ) = ± √( -x + 1/2 + C·e^(-2x) )",
        explanation: "Como definimos u = y², simplemente despejamos y aplicando raíz cuadrada a ambos lados. ¡Solución general lista!",
        proTip: "Si te dan condición inicial y(0) = 1, reemplazas en este paso para despejar el valor numérico exacto de C.",
      },
    ],
  },
  {
    id: "grashof",
    subject: "Dinámica y Mecanismos",
    teacher: "Prof. Hernán Ospina",
    title: "Cinemática: Criterio de Grashof para Eslabonamiento de 4 Barras",
    tagline: "Laboratorio Mecatrónico · Síntesis 4 Barras",
    description: "Determina rápidamente si un mecanismo de cuatro barras tiene rotación continua completa (360°) o si solo oscila como balancín.",
    steps: [
      {
        step: "Paso 0",
        badge: "Medición",
        badgeColor: "var(--color-accent-blue)",
        title: "Ordenar las Longitudes de los 4 Eslabones",
        formula: "S = mín(L1, L2, L3, L4),   L = máx(L1, L2, L3, L4),   P, Q = intermedios",
        explanation: "Identifica el eslabón más corto (S: Shortest), el más largo (L: Longest) y los dos restantes (P y Q).",
        proTip: "Mide siempre entre centros de pivote (centros de perno), nunca la longitud total exterior de la barra.",
      },
      {
        step: "Paso 1",
        badge: "Desigualdad",
        badgeColor: "var(--color-accent-cyan)",
        title: "Verificar la Desigualdad de Grashof",
        formula: "S + L  ≤  P + Q   (Condición de Grashof)",
        explanation: "Si se cumple S + L ≤ P + Q, al menos uno de los eslabones puede dar una revolución completa de 360° (Clase I). Si no, es Clase II (No Grashof).",
        proTip: "Si S + L > P + Q, ningún eslabón dará vuelta completa; todos serán balancines triples sin importar cuál fijes.",
      },
      {
        step: "Paso 2",
        badge: "Inversión",
        badgeColor: "var(--color-accent-green)",
        title: "Identificar la Inversión según el Eslabón Fijo",
        formula: "Fijar adyacente a S ⇒ Manivela-Balancín · Fijar S ⇒ Doble Manivela (Arrastre) · Fijar opuesto a S ⇒ Doble Balancín",
        explanation: "La cinemática del mecanismo depende de cuál barra esté anclada a la bancada (tierra).",
        proTip: "Para limpia-parabrisas o bombas de petróleo se usa Manivela-Balancín (bancada adyacente a S).",
      },
      {
        step: "Paso 3",
        badge: "Ángulo Transmisión",
        badgeColor: "var(--color-accent-amber)",
        title: "Comprobar Ángulo de Transmisión μ",
        formula: "45°  ≤  μ  ≤  135°   (Rango Óptimo de Fuerza)",
        explanation: "El ángulo entre la biela y el balancín no debe ser menor a 45° ni mayor a 135° para evitar que el mecanismo se trabe por atascamiento mecánico.",
        proTip: "Si μ se acerca a 0° o 180°, el mecanismo entra en punto muerto y se requerirá un volante de inercia.",
      },
    ],
  },
  {
    id: "fasores",
    subject: "Circuitos Eléctricos",
    teacher: "Prof. Ricardo Duarte",
    title: "Análisis Fasorial: Dominio de la Frecuencia en Circuitos RLC",
    tagline: "Taller & Previa · Estado Estable Sinusoidal",
    description: "Convierte derivadas e integrales de circuitos en simples operaciones algebraicas de números complejos usando fasores.",
    steps: [
      {
        step: "Paso 0",
        badge: "Transformación",
        badgeColor: "var(--color-accent-blue)",
        title: "Transformar Señales Temporales a Fasores",
        formula: "v(t) = Vm·cos(ωt + φ)  ⇒  V = Vm ∠ φ = Vm·e^(jφ)",
        explanation: "Convierte las fuentes sinusoidales al dominio fasorial. La amplitud y la fase pasan directamente al número complejo.",
        proTip: "Si la fuente está en seno: sen(ωt) = cos(ωt - 90°), réstale 90° antes de armar el fasor.",
      },
      {
        step: "Paso 1",
        badge: "Impedancias",
        badgeColor: "var(--color-accent-cyan)",
        title: "Calcular las Impedancias Complejas (Z)",
        formula: "ZR = R,   ZL = j·ω·L,   ZC = 1 / (j·ω·C) = -j / (ω·C)",
        explanation: "Las bobinas aportan reactancia inductiva positiva (+j) y los condensadores reactancia capacitiva negativa (-j).",
        proTip: "Recuerda: ω = 2π f. Verifica si la fuente te la dan en radianes/s (ω) o en Hertz (f).",
      },
      {
        step: "Paso 2",
        badge: "Leyes de Kirchhoff",
        badgeColor: "var(--color-accent-green)",
        title: "Resolver por Ley de Ohm Fasorial y Mallas",
        formula: "V = I · Z   ⇒   I = V / Z_total",
        explanation: "Trata los condensadores y bobinas exactamente igual que resistencias en serie o paralelo usando suma compleja.",
        proTip: "En paralelo: Z_eq = (Z1 · Z2) / (Z1 + Z2). Multiplica en polar y suma en rectangular.",
      },
      {
        step: "Paso 3",
        badge: "Dominio Tiempo",
        badgeColor: "var(--color-accent-purple)",
        title: "Antitransformar la Corriente o Voltaje Final",
        formula: "I = Im ∠ θ  ⇒  i(t) = Im·cos(ωt + θ)",
        explanation: "Toma la magnitud del fasor resultante y su ángulo de fase para escribir la ecuación instantánea real en el tiempo.",
        proTip: "Verifica que las unidades finales estén en Amperios (A) o Voltios (V) y añade la misma frecuencia angular ω.",
      },
    ],
  },
];

export function UniNovaBernoulliCard() {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("bernoulli");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const recipe = EXAM_RECIPES.find((r) => r.id === selectedRecipeId) || EXAM_RECIPES[0];
  const step = recipe.steps[activeStep] || recipe.steps[0];

  function playStepAudio() {
    if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) return;
    try {
      setIsPlayingAudio(true);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440 + activeStep * 65, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      setTimeout(() => setIsPlayingAudio(false), 350);
    } catch {
      setIsPlayingAudio(false);
    }
  }

  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setActiveStep(0);
  };

  return (
    <div className="bernoulli-master-card">
      {/* Recipe Switcher Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>
        <span style={{ fontSize: "0.74rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--color-text-muted)", alignSelf: "center", marginRight: "6px" }}>
          Recetas de Examen:
        </span>
        {EXAM_RECIPES.map((r) => {
          const isSelected = r.id === recipe.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelectRecipe(r.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "16px",
                fontSize: "0.8rem",
                fontWeight: isSelected ? 800 : 500,
                backgroundColor: isSelected ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
                color: isSelected ? "var(--color-primary-strong)" : "var(--color-text-secondary)",
                border: isSelected ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {r.id === "bernoulli" ? "📐 EDO Bernoulli" : r.id === "grashof" ? "⚙️ Grashof (4 Barras)" : "⚡ Fasores RLC"}
            </button>
          );
        })}
      </div>

      {/* Header Badge & Title */}
      <div className="bernoulli-card-header">
        <div className="bernoulli-card-tagline">
          <span className="bernoulli-live-dot" />
          <span className="bernoulli-tag">{recipe.tagline}</span>
          <span className="bernoulli-teacher-chip">{recipe.teacher}</span>
        </div>
        <h2 className="bernoulli-card-title">
          {recipe.title}
        </h2>
        <p className="bernoulli-card-desc">
          {recipe.description}
        </p>
      </div>

      {/* Stepper Ribbon */}
      <div className="bernoulli-stepper-ribbon">
        {recipe.steps.map((s, idx) => {
          const isCurrent = idx === activeStep;
          const isDone = idx < activeStep;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                setActiveStep(idx);
                playStepAudio();
              }}
              className={`bernoulli-step-btn ${isCurrent ? "active" : ""} ${isDone ? "done" : ""}`}
            >
              <span className="bernoulli-step-num">{idx === 0 ? "0" : idx}</span>
              <div className="bernoulli-step-text">
                <span className="bernoulli-step-label">{s.step}</span>
                <span className="bernoulli-step-badge">{s.badge}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Showcase Box */}
      <div className="bernoulli-step-display">
        <div className="bernoulli-step-top">
          <div className="bernoulli-step-heading">
            <span
              className="bernoulli-step-pill"
              style={{ backgroundColor: `${step.badgeColor}20`, color: step.badgeColor, borderColor: step.badgeColor }}
            >
              {step.step}: {step.badge}
            </span>
            <h3 className="bernoulli-step-active-title">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={playStepAudio}
            className={`bernoulli-audio-cue-btn ${isPlayingAudio ? "playing" : ""}`}
            title="Sintetizar nota de audio"
          >
            🔊 Paso {activeStep}
          </button>
        </div>

        {/* Formula Box */}
        <div className="bernoulli-formula-box">
          <div className="bernoulli-formula-label">FÓRMULA CLAVE DE PARCIAL</div>
          <code className="bernoulli-formula-code">{step.formula}</code>
        </div>

        {/* Explanation & ProTip */}
        <div className="bernoulli-explanation-grid">
          <div className="bernoulli-explanation-item">
            <strong>Explicación mecánica:</strong>
            <p>{step.explanation}</p>
          </div>
          <div className="bernoulli-protip-item">
            <strong>⚡ Tip del Parcial (Cheat Sheet):</strong>
            <p>{step.proTip}</p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="bernoulli-nav-actions">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => {
              setActiveStep((prev) => Math.max(0, prev - 1));
              playStepAudio();
            }}
            className="academic-btn academic-btn-secondary"
          >
            ← Paso Anterior
          </button>

          <div className="bernoulli-stepper-counter">
            Paso {activeStep + 1} de {recipe.steps.length}
          </div>

          {activeStep < recipe.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setActiveStep((prev) => Math.min(recipe.steps.length - 1, prev + 1));
                playStepAudio();
              }}
              className="academic-btn academic-btn-primary"
            >
              Siguiente Paso →
            </button>
          ) : (
            <Link href="/mecatronica" className="academic-btn academic-btn-primary">
              ⚡ Ir al Simulador 2D & Laboratorio →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
