"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// Types
export type LabTab = "waves" | "standing" | "mas" | "circuits";
export type ConceptTopic = "omega" | "transversal" | "freq_vs_speed" | "why_more_waves" | "nodes" | "energy" | "kirchhoff";

interface WaveState {
  amp: number;
  freq: number;
  tension: number;
  mu: number;
  v: number;
  lambda: number;
  omega: number;
  k: number;
  isStanding: boolean;
  harmonic: number;
  length: number;
  time: number;
  isPaused: boolean;
  speedMultiplier: number;
}

interface MASState {
  mass: number;
  k: number;
  amp: number;
  x: number;
  v: number;
  isDragging: boolean;
  time: number;
}

interface CircuitState {
  Vs: number;
  R1: number;
  R2: number;
  R3: number;
  electronOffset: number;
}

export function LaboratorioCanvasEngine() {
  // Tab State
  const [activeTab, setActiveTab] = useState<LabTab>("waves");

  // Audio Synth
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscNodeRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Concept Explanation State
  const [activeConcept, setActiveConcept] = useState<ConceptTopic>("omega");
  const [explainerTitle, setExplainerTitle] = useState("🔄 EXPLICADOR DEL SISTEMA: ¿Qué es la Frecuencia Angular ω?");
  const [explainerBody, setExplainerBody] = useState(
    "Mira el círculo giratorio de la izquierda: ω mide la velocidad de giro en radianes/segundo (ω = 2π f). Cada vez que el punto da una vuelta completa (2π rad = 360°), en la cuerda se dibuja exactamente una onda senoidal completa."
  );

  // 1 & 2: WAVES & STANDING STATE
  const waveStateRef = useRef<WaveState>({
    amp: 0.05,
    freq: 2.0,
    tension: 25.6,
    mu: 0.01,
    v: 1.6,
    lambda: 0.8,
    omega: 12.57,
    k: 7.85,
    isStanding: false,
    harmonic: 3,
    length: 2.4,
    time: 0,
    isPaused: false,
    speedMultiplier: 1.0,
  });

  const [waveFreq, setWaveFreq] = useState(2.0);
  const [waveTension, setWaveTension] = useState(25.6);
  const [waveAmp, setWaveAmp] = useState(0.05);
  const [waveMu, setWaveMu] = useState(0.01);
  const [waveHarmonic, setWaveHarmonic] = useState(3);
  const [waveIsStanding, setWaveIsStanding] = useState(false);
  const [waveIsPaused, setWaveIsPaused] = useState(false);
  const [waveSlowMo, setWaveSlowMo] = useState(false);
  const [wavePreset, setWavePreset] = useState("custom");

  // Readouts for Waves
  const [waveOut, setWaveOut] = useState({
    omega: 12.57,
    freq: 2.0,
    speed: 1.6,
    lambda: 0.8,
    k: 7.85,
    vyMax: 0.63,
  });

  // 3: MAS STATE
  const masStateRef = useRef<MASState>({
    mass: 0.5,
    k: 200,
    amp: 0.1,
    x: 0.1,
    v: 0.0,
    isDragging: false,
    time: 0,
  });

  const [masMass, setMasMass] = useState(0.5);
  const [masK, setMasK] = useState(200);
  const [masAmp, setMasAmp] = useState(0.1);
  const [masPreset, setMasPreset] = useState("custom");

  const [masOut, setMasOut] = useState({
    x: 0.1,
    v: 0.0,
    omega: 20.0,
    period: 0.314,
    Ek: 0.25,
    Ep: 0.25,
    Etot: 0.5,
    maxE: 0.5,
  });

  // 4: CIRCUITS STATE
  const circStateRef = useRef<CircuitState>({
    Vs: 24,
    R1: 6,
    R2: 12,
    R3: 8,
    electronOffset: 0,
  });

  const [circVs, setCircVs] = useState(24);
  const [circR1, setCircR1] = useState(6);
  const [circR2, setCircR2] = useState(12);
  const [circR3, setCircR3] = useState(8);
  const [circPreset, setCircPreset] = useState("ex01");

  const [circOut, setCircOut] = useState({
    Vs: 24.0,
    It: 2.0,
    Req: 12.0,
    Ptot: 48.0,
    I1: 2.0,
    I2: 0.8,
    I3: 1.2,
    Vp: 12.0,
    P1: 24.0,
    P2: 9.6,
    P3: 14.4,
  });

  // Canvas Refs
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const masCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const circCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Audio Helpers
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        const ctx = new AudioCtxClass();
        const gain = ctx.createGain();
        gain.gain.value = 0.035;
        gain.connect(ctx.destination);
        audioCtxRef.current = ctx;
        gainNodeRef.current = gain;
      }
    }
  };

  const playWaveTone = useCallback((frequency: number) => {
    if (!audioCtxRef.current || !gainNodeRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    if (!oscNodeRef.current) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.connect(gainNodeRef.current);
      osc.start();
      oscNodeRef.current = osc;
    }
    const clamped = Math.max(80, Math.min(1200, frequency));
    oscNodeRef.current.frequency.setTargetAtTime(clamped, ctx.currentTime, 0.05);
  }, []);

  const stopAudioTone = useCallback(() => {
    if (oscNodeRef.current) {
      try {
        oscNodeRef.current.stop();
        oscNodeRef.current.disconnect();
      } catch {}
      oscNodeRef.current = null;
    }
  }, []);

  const toggleAudio = () => {
    if (!audioEnabled) {
      initAudio();
      setAudioEnabled(true);
      playWaveTone(waveStateRef.current.freq * 110);
    } else {
      setAudioEnabled(false);
      stopAudioTone();
    }
  };

  // Concept Explainer Manager
  const explainConcept = (topic: ConceptTopic) => {
    setActiveConcept(topic);
    const ws = waveStateRef.current;

    if (topic === "omega") {
      setExplainerTitle("🔄 ¿QUÉ ES ω (FRECUENCIA ANGULAR)?");
      setExplainerBody(
        `Mira el círculo generador púrpura a la izquierda: ω mide la velocidad con la que gira el vector en radianes por segundo (ω = 2π f). Con f = ${ws.freq.toFixed(1)} Hz, el ángulo gira a ω = 2π(${ws.freq.toFixed(1)}) = ${(2 * Math.PI * ws.freq).toFixed(2)} rad/s. La proyección vertical de ese giro proyecta la perturbación senoidal a la cuerda.`
      );
    } else if (topic === "transversal") {
      setExplainerTitle("↕️ ¿POR QUÉ ES UNA ONDA 'TRANSVERSAL'?");
      setExplainerBody(
        `Transversal significa que la oscilación es perpendicular (90°) a la dirección de propagación. Observa el punto verde: solo oscila hacia arriba y abajo en el eje Y. La materia no avanza hacia la derecha; lo que viaja a velocidad v en el eje X es la forma geométrica y el paquete de energía.`
      );
    } else if (topic === "freq_vs_speed") {
      setExplainerTitle("⚡ FRECUENCIA (f) vs VELOCIDAD (v): ¿POR QUÉ NO SON LO MISMO?");
      setExplainerBody(
        `La frecuencia f es el ritmo temporal del motor generador (ciclos/segundo). La velocidad v es qué tan rápido se propaga el frente de onda por el medio y depende exclusivamente de la tensión T y densidad μ (v = √(T/μ)). Si aumentas f sin cambiar T ni μ, la onda sigue viajando a la misma velocidad espacial v, obligando a que las crestas se compriman.`
      );
    } else if (topic === "why_more_waves") {
      setExplainerTitle("🌊 ¿POR QUÉ AL SUBIR f SE COMPRIMEN LAS ONDAS?");
      setExplainerBody(
        `Porque la velocidad v = √(T/μ) = ${ws.v.toFixed(2)} m/s permanece fija. Si emites más ciclos en el mismo segundo, cada cresta dispone de menos espacio antes de que nazca la siguiente. En consecuencia, la longitud de onda λ = v/f se reduce de ${(ws.v / 2).toFixed(2)} m a ${(ws.v / ws.freq).toFixed(2)} m, aumentando la densidad de crestas.`
      );
    } else if (topic === "nodes") {
      setExplainerTitle("🎸 ONDAS ESTACIONARIAS: NODOS Y ANTINODOS");
      setExplainerBody(
        `Superposición de dos ondas viajeras de igual amplitud y frecuencia viajando en sentidos opuestos: y(x,t) = 2A·sin(kx)·cos(ωt). Los puntos rojos son NODOS (amplitud cero permanente por interferencia destructiva sinodal, sin = 0). Las crestas intermedias son ANTINODOS de oscilación máxima (2A).`
      );
    } else if (topic === "energy") {
      setExplainerTitle("⚡ CONSERVACIÓN DE LA ENERGÍA EN M.A.S.");
      setExplainerBody(
        `En el oscilador sin fricción, la energía total Etot = 1/2 k A² permanece constante. En el centro (x=0), toda la energía es cinética (Ek = 1/2 m v²). En los extremos (x = ±A), la velocidad es cero y toda la energía es potencial elástica (Ep = 1/2 k x²).`
      );
    } else if (topic === "kirchhoff") {
      setExplainerTitle("🔋 LEYES DE KIRCHHOFF Y EFECTO JOULE");
      setExplainerBody(
        `1) Ley de Nodos (LKC): La corriente total It que sale de la fuente se bifurca en el nodo superior tal que It = I2 + I3. 2) Ley de Mallas (LKV): Las caídas de tensión igualan la fem. 3) Resplandor térmico: La potencia disipada en calor P = I²R genera radiación infrarroja/térmica visible.`
      );
    }
  };

  // Recalculate Waves
  const updateWaveCalculations = useCallback(() => {
    const ws = waveStateRef.current;
    if (ws.isStanding) {
      ws.lambda = (2 * ws.length) / ws.harmonic;
      ws.v = ws.lambda * ws.freq;
      ws.tension = ws.mu * (ws.v * ws.v);
    } else {
      ws.v = Math.sqrt(ws.tension / ws.mu);
      ws.lambda = ws.v / ws.freq;
    }
    ws.omega = 2 * Math.PI * ws.freq;
    ws.k = (2 * Math.PI) / ws.lambda;
    const vyMax = ws.omega * ws.amp;

    setWaveOut({
      omega: ws.omega,
      freq: ws.freq,
      speed: ws.v,
      lambda: ws.lambda,
      k: ws.k,
      vyMax,
    });

    if (audioEnabled) {
      playWaveTone(ws.freq * 110);
    }
  }, [audioEnabled, playWaveTone]);

  // Recalculate MAS
  const updateMASCalculations = useCallback(() => {
    const ms = masStateRef.current;
    const omega = Math.sqrt(ms.k / ms.mass);
    const period = (2 * Math.PI) / omega;
    const Ek = 0.5 * ms.mass * (ms.v * ms.v);
    const Ep = 0.5 * ms.k * (ms.x * ms.x);
    const Etot = Ek + Ep;
    const maxE = Math.max(0.01, 0.5 * ms.k * (ms.amp * ms.amp));

    setMasOut({
      x: ms.x,
      v: ms.v,
      omega,
      period,
      Ek,
      Ep,
      Etot,
      maxE,
    });
  }, []);

  // Recalculate Circuits
  const updateCircCalculations = useCallback(() => {
    const cs = circStateRef.current;
    const Rp = (cs.R2 * cs.R3) / (cs.R2 + cs.R3);
    const Req = cs.R1 + Rp;
    const It = cs.Vs / Req;
    const Vp = cs.Vs - It * cs.R1;
    const I2 = Vp / cs.R2;
    const I3 = Vp / cs.R3;
    const Ptot = cs.Vs * It;
    const P1 = It * It * cs.R1;
    const P2 = I2 * I2 * cs.R2;
    const P3 = I3 * I3 * cs.R3;

    setCircOut({
      Vs: cs.Vs,
      It,
      Req,
      Ptot,
      I1: It,
      I2,
      I3,
      Vp,
      P1,
      P2,
      P3,
    });
  }, []);

  // Handlers for Slider changes
  const handleWaveFreqChange = (val: number) => {
    setWaveFreq(val);
    waveStateRef.current.freq = val;
    updateWaveCalculations();
    setExplainerTitle(`🔄 RITMO MODIFICADO: Frecuencia f = ${val.toFixed(1)} Hz (ω = ${(2 * Math.PI * val).toFixed(2)} rad/s)`);
    setExplainerBody(
      `El rotor gira más rápido. Al mantener tensión T = ${waveStateRef.current.tension.toFixed(1)} N, la velocidad v = ${waveStateRef.current.v.toFixed(2)} m/s permanece fija y la longitud espacial se ajusta a λ = v/f = ${(waveStateRef.current.v / val).toFixed(2)} m.`
    );
  };

  const handleWaveTensionChange = (val: number) => {
    setWaveTension(val);
    waveStateRef.current.tension = val;
    updateWaveCalculations();
    setExplainerTitle(`🏹 TENSIÓN MODIFICADA: T = ${val.toFixed(1)} N → Rapidez v = ${waveStateRef.current.v.toFixed(2)} m/s`);
    setExplainerBody(
      `Al tensar más la cuerda, la onda viaja más rápido hacia adelante (v = √(T/μ)). Como el oscilador sigue a f = ${waveStateRef.current.freq.toFixed(1)} Hz, cada cresta avanza más metros por periodo, estirando la longitud de onda a λ = ${waveStateRef.current.lambda.toFixed(2)} m.`
    );
  };

  const handleWaveAmpChange = (val: number) => {
    setWaveAmp(val);
    waveStateRef.current.amp = val;
    updateWaveCalculations();
    setExplainerTitle(`📐 AMPLITUD MODIFICADA: A = ${val.toFixed(3)} m`);
    setExplainerBody(
      `Aumentaste la altura del pico. La onda no viaja más rápido longitudinalmente, pero la partícula verde debe recorrer más distancia transversal vertical, elevando su velocidad máxima vy,max = ωA = ${(waveStateRef.current.omega * val).toFixed(2)} m/s.`
    );
  };

  const handleWaveMuChange = (val: number) => {
    setWaveMu(val);
    waveStateRef.current.mu = val;
    updateWaveCalculations();
    setExplainerTitle(`🧵 DENSIDAD LINEAL MODIFICADA: μ = ${val.toFixed(3)} kg/m`);
    setExplainerBody(
      `Una cuerda más pesada posee mayor inercia por unidad de longitud, reduciendo la velocidad de propagación de la perturbación a v = √(T/μ) = ${waveStateRef.current.v.toFixed(2)} m/s.`
    );
  };

  const handleHarmonicChange = (val: number) => {
    setWaveHarmonic(val);
    waveStateRef.current.harmonic = val;
    updateWaveCalculations();
    setExplainerTitle(`🎸 MODO NORMAL n = ${val} (Armónico ${val})`);
    setExplainerBody(
      `Para una cuerda fija en ambos extremos de L = ${waveStateRef.current.length} m, la condición de contorno fija λ_${val} = 2L/${val} = ${( (2 * waveStateRef.current.length) / val ).toFixed(2)} m. Se forman exactamente ${val} vientres (antinodos) y ${val + 1} nodos fijos.`
    );
  };

  const handleToggleStanding = (checked: boolean) => {
    setWaveIsStanding(checked);
    waveStateRef.current.isStanding = checked;
    if (checked) {
      explainConcept("nodes");
    } else {
      explainConcept("transversal");
    }
    updateWaveCalculations();
  };

  const handleWavePause = () => {
    const nextPaused = !waveIsPaused;
    setWaveIsPaused(nextPaused);
    waveStateRef.current.isPaused = nextPaused;
  };

  const handleToggleSlowMo = () => {
    const nextSlow = !waveSlowMo;
    setWaveSlowMo(nextSlow);
    waveStateRef.current.speedMultiplier = nextSlow ? 0.25 : 1.0;
  };

  // MAS Handlers
  const handleMASMassChange = (val: number) => {
    setMasMass(val);
    masStateRef.current.mass = val;
    if (!masStateRef.current.isDragging) {
      masStateRef.current.x = masStateRef.current.amp;
      masStateRef.current.v = 0;
    }
    updateMASCalculations();
  };

  const handleMASKChange = (val: number) => {
    setMasK(val);
    masStateRef.current.k = val;
    if (!masStateRef.current.isDragging) {
      masStateRef.current.x = masStateRef.current.amp;
      masStateRef.current.v = 0;
    }
    updateMASCalculations();
  };

  const handleMASAmpChange = (val: number) => {
    setMasAmp(val);
    masStateRef.current.amp = val;
    masStateRef.current.x = val;
    masStateRef.current.v = 0;
    updateMASCalculations();
  };

  const resetMAS = () => {
    masStateRef.current.x = masStateRef.current.amp;
    masStateRef.current.v = 0;
    masStateRef.current.time = 0;
    updateMASCalculations();
  };

  // Circuits Handlers
  const handleCircVsChange = (val: number) => {
    setCircVs(val);
    circStateRef.current.Vs = val;
    updateCircCalculations();
  };

  const handleCircR1Change = (val: number) => {
    setCircR1(val);
    circStateRef.current.R1 = val;
    updateCircCalculations();
  };

  const handleCircR2Change = (val: number) => {
    setCircR2(val);
    circStateRef.current.R2 = val;
    updateCircCalculations();
  };

  const handleCircR3Change = (val: number) => {
    setCircR3(val);
    circStateRef.current.R3 = val;
    updateCircCalculations();
  };

  // Presets
  const loadWavePreset = (type: string) => {
    setWavePreset(type);
    if (type === "15.12") {
      setWaveIsStanding(false);
      waveStateRef.current.isStanding = false;
      handleWaveFreqChange(2.0);
      handleWaveTensionChange(25.6);
      handleWaveMuChange(0.01);
      const v = Math.sqrt(25.6 / 0.01);
      const l = v / 2.0;
      const a = Number((l / (2 * Math.PI)).toFixed(3));
      handleWaveAmpChange(a);
      explainConcept("transversal");
    } else if (type === "15.44") {
      setWaveIsStanding(true);
      waveStateRef.current.isStanding = true;
      handleHarmonicChange(3);
      handleWaveMuChange(0.012);
      explainConcept("nodes");
    } else if (type === "15.50") {
      setWaveIsStanding(false);
      waveStateRef.current.isStanding = false;
      handleWaveAmpChange(0.075);
      handleWaveFreqChange(1.91);
      handleWaveTensionChange(36.0);
      explainConcept("omega");
    } else if (type === "15.41") {
      setWaveIsStanding(false);
      waveStateRef.current.isStanding = false;
      handleWaveTensionChange(49.0);
      handleWaveMuChange(0.025);
      handleWaveFreqChange(3.0);
      explainConcept("freq_vs_speed");
    }
  };

  const loadMASPreset = (preset: string) => {
    setMasPreset(preset);
    if (preset === "p19") {
      handleMASMassChange(0.5);
      handleMASKChange(200);
      handleMASAmpChange(0.12);
    } else if (preset === "p20") {
      handleMASMassChange(1.2);
      handleMASKChange(350);
      handleMASAmpChange(0.15);
    } else if (preset === "p21") {
      handleMASMassChange(0.25);
      handleMASKChange(80);
      handleMASAmpChange(0.08);
    }
  };

  const loadCircuitPreset = (preset: string) => {
    setCircPreset(preset);
    if (preset === "ex01") {
      handleCircVsChange(24);
      handleCircR1Change(6);
      handleCircR2Change(12);
      handleCircR3Change(8);
    } else if (preset === "ex02") {
      handleCircVsChange(48);
      handleCircR1Change(10);
      handleCircR2Change(20);
      handleCircR3Change(30);
    } else if (preset === "ex03") {
      handleCircVsChange(36);
      handleCircR1Change(4);
      handleCircR2Change(8);
      handleCircR3Change(8);
    } else if (preset === "ex04") {
      handleCircVsChange(60);
      handleCircR1Change(15);
      handleCircR2Change(30);
      handleCircR3Change(10);
    }
  };

  // Canvas RENDER FUNCTIONS
  const drawWaveSim = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const ws = waveStateRef.current;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Left Section: PHASOR ROTATING CIRCLE (GENERADOR DE OMEGA w)
    const phasorCenterX = 85;
    const phasorCenterY = centerY;
    const phasorRadius = 45;

    // Phasor circle outline
    ctx.strokeStyle = "rgba(192, 132, 252, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(phasorCenterX, phasorCenterY, phasorRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Phasor cross axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(phasorCenterX - phasorRadius - 10, phasorCenterY);
    ctx.lineTo(phasorCenterX + phasorRadius + 10, phasorCenterY);
    ctx.moveTo(phasorCenterX, phasorCenterY - phasorRadius - 10);
    ctx.lineTo(phasorCenterX, phasorCenterY + phasorRadius + 10);
    ctx.stroke();

    // Current angle theta = omega * t
    const theta = (ws.omega * ws.time) % (2 * Math.PI);
    const phasorDotX = phasorCenterX + phasorRadius * Math.cos(theta);
    const phasorDotY = phasorCenterY - phasorRadius * Math.sin(theta);

    // Rotating vector arrow (Phasor)
    ctx.strokeStyle = "#c084fc";
    ctx.fillStyle = "#c084fc";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(phasorCenterX, phasorCenterY);
    ctx.lineTo(phasorDotX, phasorDotY);
    ctx.stroke();

    // Phasor glowing dot
    ctx.shadowColor = "#c084fc";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(phasorDotX, phasorDotY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label under phasor
    ctx.fillStyle = "#c084fc";
    ctx.font = "700 11px monospace";
    ctx.fillText(`Giro: ω = ${ws.omega.toFixed(1)} rad/s`, phasorCenterX - 55, phasorCenterY + phasorRadius + 24);

    // String coordinates
    const stringStartX = 180;
    const stringEndX = width - 40;
    const stringPixelLength = stringEndX - stringStartX;

    // Projection dashed line
    ctx.strokeStyle = "rgba(192, 132, 252, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(phasorDotX, phasorDotY);
    ctx.lineTo(stringStartX, phasorDotY);
    ctx.stroke();
    ctx.setLineDash([]);

    // String axis
    ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(stringStartX, centerY);
    ctx.lineTo(stringEndX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    const scaleX = stringPixelLength / ws.length;
    const scaleY = phasorRadius / ws.amp;
    const k = ws.k;
    const omega = ws.omega;
    const t = ws.time;

    // Draw Wave Curve on string
    ctx.beginPath();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#38bdf8";
    ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
    ctx.shadowBlur = 10;

    const numPoints = 240;
    const testPartX = 0.45 * ws.length;
    let testPartY = 0;
    let testPartVy = 0;

    for (let i = 0; i <= numPoints; i++) {
      const xMeters = (i / numPoints) * ws.length;
      let yMeters = 0;

      if (ws.isStanding) {
        yMeters = 2 * ws.amp * Math.sin(k * xMeters) * Math.cos(omega * t);
      } else {
        yMeters = ws.amp * Math.sin(k * xMeters - omega * t);
      }

      const px = stringStartX + xMeters * scaleX;
      const py = centerY - yMeters * scaleY;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);

      if (Math.abs(xMeters - testPartX) < ws.length / numPoints) {
        testPartY = yMeters;
        if (ws.isStanding) {
          testPartVy = -2 * ws.amp * omega * Math.sin(k * xMeters) * Math.sin(omega * t);
        } else {
          testPartVy = -ws.amp * omega * Math.cos(k * xMeters - omega * t);
        }
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Wavelength Dimension Indicator
    const lambdaPx = ws.lambda * scaleX;
    if (lambdaPx < stringPixelLength) {
      const dimY = 40;
      const dimStartX = stringStartX + 20;
      ctx.strokeStyle = "#fbbf24";
      ctx.fillStyle = "#fbbf24";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(dimStartX, dimY);
      ctx.lineTo(dimStartX + lambdaPx, dimY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(dimStartX, dimY - 6);
      ctx.lineTo(dimStartX, dimY + 6);
      ctx.moveTo(dimStartX + lambdaPx, dimY - 6);
      ctx.lineTo(dimStartX + lambdaPx, dimY + 6);
      ctx.stroke();

      ctx.font = "700 12px monospace";
      ctx.fillText(`Longitud de onda λ = ${ws.lambda.toFixed(2)} m`, dimStartX + 10, dimY - 8);
    }

    // Standing Wave Nodes
    if (ws.isStanding) {
      for (let n = 0; n <= ws.harmonic; n++) {
        const nodeX = stringStartX + n * (ws.length / ws.harmonic) * scaleX;
        ctx.fillStyle = "#f43f5e";
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(nodeX, centerY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#f43f5e";
        ctx.fillText(n === 0 || n === ws.harmonic ? "Fijo" : "Nodo", nodeX - 12, centerY + 22);
      }
    }

    // Test Particle (Green Dot)
    const partPx = stringStartX + testPartX * scaleX;
    const partPy = centerY - testPartY * scaleY;

    // Trajectory Rail
    ctx.strokeStyle = "rgba(52, 211, 153, 0.25)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(partPx, centerY - ws.amp * scaleY * (ws.isStanding ? 2 : 1));
    ctx.lineTo(partPx, centerY + ws.amp * scaleY * (ws.isStanding ? 2 : 1));
    ctx.stroke();
    ctx.setLineDash([]);

    // Particle
    ctx.shadowColor = "#34d399";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(partPx, partPy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity Vector Arrow vy (Transversal)
    const arrowLen = -testPartVy * 25;
    if (Math.abs(arrowLen) > 2) {
      ctx.strokeStyle = "#f43f5e";
      ctx.fillStyle = "#f43f5e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(partPx, partPy);
      ctx.lineTo(partPx, partPy + arrowLen);
      ctx.stroke();

      const headDir = arrowLen > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(partPx - 4, partPy + arrowLen - headDir * 6);
      ctx.lineTo(partPx, partPy + arrowLen);
      ctx.lineTo(partPx + 4, partPy + arrowLen - headDir * 6);
      ctx.fill();
    }

    // Wave Propagation Speed Vector Arrow v (Longitudinal)
    if (!ws.isStanding) {
      const arrowX = width - 180;
      const arrowY = 40;
      ctx.strokeStyle = "#38bdf8";
      ctx.fillStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX + 80, arrowY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(arrowX + 70, arrowY - 5);
      ctx.lineTo(arrowX + 80, arrowY);
      ctx.lineTo(arrowX + 70, arrowY + 5);
      ctx.fill();
      ctx.font = "700 12px sans-serif";
      ctx.fillText(`Rapidez v = ${ws.v.toFixed(2)} m/s →`, arrowX - 10, arrowY - 10);
    }

    if (!ws.isPaused) {
      ws.time += 0.016 * ws.speedMultiplier;
    }
  };

  const drawMASSim = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const ms = masStateRef.current;
    const centerY = height / 2;
    const centerX = width / 2;
    const scaleX = (width * 0.35) / 0.2;

    ctx.clearRect(0, 0, width, height);

    if (!ms.isDragging) {
      const dt = 0.016;
      const omegaSq = ms.k / ms.mass;
      const accel = -omegaSq * ms.x;
      ms.v += accel * dt;
      ms.x += ms.v * dt;
    }

    // Left wall
    const wallX = 60;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(wallX - 15, centerY - 90, 15, 180);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(wallX - 15, centerY - 90, 15, 180);

    // Floor track
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallX - 20, centerY + 50);
    ctx.lineTo(width - 40, centerY + 50);
    ctx.stroke();

    // Equilibrium line (x=0)
    ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 80);
    ctx.lineTo(centerX, centerY + 70);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#34d399";
    ctx.fillText("Equilibrio (x = 0)", centerX - 45, centerY - 90);

    const blockWidth = 70;
    const blockHeight = 60;
    const blockX = centerX + ms.x * scaleX - blockWidth / 2;
    const blockY = centerY + 50 - blockHeight;

    // Coiled spring
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallX, centerY + 20);

    const numCoils = 16;
    const springLength = blockX - wallX;
    for (let i = 0; i <= numCoils; i++) {
      const segX = wallX + (i / numCoils) * springLength;
      const segY = i === 0 || i === numCoils ? centerY + 20 : centerY + 20 + (i % 2 === 1 ? 1 : -1) * 18;
      ctx.lineTo(segX, segY);
    }
    ctx.stroke();

    // Mass Block
    ctx.fillStyle = ms.isDragging ? "#fbbf24" : "#0284c7";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.shadowColor = ms.isDragging ? "rgba(251, 191, 36, 0.5)" : "rgba(56, 189, 248, 0.4)";
    ctx.shadowBlur = 15;
    ctx.fillRect(blockX, blockY, blockWidth, blockHeight);
    ctx.strokeRect(blockX, blockY, blockWidth, blockHeight);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`m = ${ms.mass.toFixed(2)}kg`, blockX + 8, blockY + 35);
  };

  const drawCircuitSim = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cs = circStateRef.current;
    ctx.clearRect(0, 0, width, height);

    const xLeft = 120;
    const xMid = width / 2;
    const xRight = width - 140;
    const yTop = 80;
    const yBottom = height - 80;

    // Wires
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xLeft, yTop);
    ctx.lineTo(xLeft, yBottom);
    ctx.lineTo(xRight, yBottom);
    ctx.lineTo(xRight, yTop);
    ctx.lineTo(xLeft, yTop);
    ctx.moveTo(xMid, yTop);
    ctx.lineTo(xMid, yBottom);
    ctx.stroke();

    // Voltage source
    const srcY = (yTop + yBottom) / 2;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(xLeft - 25, srcY - 30, 50, 60);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(xLeft - 25, srcY - 30, 50, 60);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 14px monospace";
    ctx.fillText("+", xLeft - 6, srcY - 10);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("-", xLeft - 4, srcY + 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${cs.Vs}V`, xLeft - 55, srcY + 5);

    const drawResistor = (rx: number, ry: number, label: string, val: number, isVertical: boolean, current: number) => {
      const rw = isVertical ? 24 : 70;
      const rh = isVertical ? 70 : 24;
      const power = current * current * val;
      const glowIntensity = Math.min(25, power * 0.4);

      ctx.save();
      ctx.fillStyle = "#1e293b";
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = glowIntensity;
      ctx.fillRect(rx - rw / 2, ry - rh / 2, rw, rh);
      ctx.strokeStyle = glowIntensity > 10 ? "#f97316" : "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      if (isVertical) {
        ctx.fillText(`${label}: ${val}Ω`, rx + 20, ry + 4);
        ctx.fillStyle = "#34d399";
        ctx.fillText(`${current.toFixed(2)}A`, rx + 20, ry + 20);
      } else {
        ctx.fillText(`${label}: ${val}Ω`, rx - 25, ry - 18);
        ctx.fillStyle = "#34d399";
        ctx.fillText(`${current.toFixed(2)}A`, rx - 20, ry + 32);
      }
    };

    const Rp = (cs.R2 * cs.R3) / (cs.R2 + cs.R3);
    const Req = cs.R1 + Rp;
    const It = cs.Vs / Req;
    const Vp = cs.Vs - It * cs.R1;
    const I2 = Vp / cs.R2;
    const I3 = Vp / cs.R3;

    drawResistor((xLeft + xMid) / 2, yTop, "R1", cs.R1, false, It);
    drawResistor(xMid, srcY, "R2", cs.R2, true, I2);
    drawResistor(xRight, srcY, "R3", cs.R3, true, I3);

    cs.electronOffset = (cs.electronOffset + It * 0.8) % 40;
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 8;

    for (let x = xLeft; x < xMid; x += 40) {
      const px = x + cs.electronOffset;
      if (px < xMid) {
        ctx.beginPath();
        ctx.arc(px, yTop, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let x = xMid; x < xRight; x += 40) {
      const px = x + cs.electronOffset;
      if (px < xRight) {
        ctx.beginPath();
        ctx.arc(px, yTop, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let y = yTop; y < yBottom; y += 40) {
      const py = y + cs.electronOffset * (I2 / It);
      if (py < yBottom) {
        ctx.beginPath();
        ctx.arc(xMid, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let y = yTop; y < yBottom; y += 40) {
      const py = y + cs.electronOffset * (I3 / It);
      if (py < yBottom) {
        ctx.beginPath();
        ctx.arc(xRight, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let x = xRight; x > xLeft; x -= 40) {
      const px = x - cs.electronOffset;
      if (px > xLeft) {
        ctx.beginPath();
        ctx.arc(px, yBottom, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  };

  // Main 60 FPS Loop
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;

      if (activeTab === "waves" || activeTab === "standing") {
        const canvas = waveCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) drawWaveSim(ctx, canvas.width, canvas.height);
        }
      } else if (activeTab === "mas") {
        const canvas = masCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawMASSim(ctx, canvas.width, canvas.height);
            updateMASCalculations();
          }
        }
      } else if (activeTab === "circuits") {
        const canvas = circCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) drawCircuitSim(ctx, canvas.width, canvas.height);
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [activeTab, updateMASCalculations]);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      [waveCanvasRef, masCanvasRef, circCanvasRef].forEach((ref) => {
        if (ref.current && ref.current.parentElement) {
          ref.current.width = ref.current.parentElement.clientWidth;
          ref.current.height = ref.current.parentElement.clientHeight || 420;
        }
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // MAS Drag interaction listeners
  useEffect(() => {
    const canvas = masCanvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const w = canvas.width;
      const centerX = w / 2;
      const scaleX = (w * 0.35) / 0.2;
      const blockPx = centerX + masStateRef.current.x * scaleX;
      if (Math.abs(clickX - blockPx) < 50) {
        masStateRef.current.isDragging = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!masStateRef.current.isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const w = canvas.width;
      const centerX = w / 2;
      const scaleX = (w * 0.35) / 0.2;
      let newX = (mouseX - centerX) / scaleX;
      newX = Math.max(-0.2, Math.min(0.2, newX));
      masStateRef.current.x = newX;
      masStateRef.current.amp = Math.abs(newX);
      masStateRef.current.v = 0;
      setMasAmp(masStateRef.current.amp);
      updateMASCalculations();
    };

    const handleMouseUp = () => {
      masStateRef.current.isDragging = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateMASCalculations]);

  // Initial calculation trigger
  useEffect(() => {
    updateWaveCalculations();
    updateMASCalculations();
    updateCircCalculations();
  }, [updateWaveCalculations, updateMASCalculations, updateCircCalculations]);

  return (
    <div
      style={{
        backgroundColor: "#07090e",
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.08) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(192, 132, 252, 0.08) 0px, transparent 50%),
          radial-gradient(at 50% 50%, rgba(52, 211, 153, 0.04) 0px, transparent 70%)
        `,
        color: "#f8fafc",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: "100vh",
        paddingBottom: "40px",
      }}
      className="p-4 md:p-6 w-full max-w-7xl mx-auto"
    >
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-600 text-white font-extrabold text-sm tracking-wider shadow-lg shadow-cyan-500/20">
            ⚡ LAB PRO ENGINE
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Laboratorio Visual Interactivo — Física & Mecatrónica
            </h1>
            <p className="text-xs text-slate-400">Simulador 2D a 60 FPS con motor analítico de ecuaciones y mallas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              audioEnabled
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/20 animate-pulse"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
            title="Activar/Desactivar sintetizador sonoro Web Audio"
          >
            <span>{audioEnabled ? "🔊" : "🔇"}</span>
            <span>{audioEnabled ? "Audio Sintetizado Activo" : "Activar Audio"}</span>
          </button>
        </div>
      </header>

      {/* Main Tab Switcher */}
      <nav className="flex gap-2 p-1.5 mb-6 rounded-2xl bg-slate-900/60 border border-white/10 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("waves");
            handleToggleStanding(false);
          }}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === "waves"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <span>🌊</span> 1) Fasor y Ondas Transversales (ω)
        </button>

        <button
          onClick={() => {
            setActiveTab("standing");
            handleToggleStanding(true);
          }}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === "standing"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <span>🎸</span> 2) Ondas Estacionarias y Nodos (n=1..5)
        </button>

        <button
          onClick={() => {
            setActiveTab("mas");
            explainConcept("energy");
          }}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === "mas"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <span>⚡</span> 3) M.A.S. Masa-Resorte (Ek & Ep)
        </button>

        <button
          onClick={() => {
            setActiveTab("circuits");
            explainConcept("kirchhoff");
          }}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === "circuits"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <span>🔋</span> 4) Circuitos, Electrones & P=I²R
        </button>
      </nav>

      {/* Dynamic Concept Explanation Bar & Card */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950/95 border border-cyan-500/20 shadow-xl">
          <div className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <span>💡</span> Preguntas Clave:
          </div>
          <button
            onClick={() => explainConcept("omega")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "omega"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                : "bg-white/5 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300"
            }`}
          >
            <span>🔄</span> ¿Qué es ω?
          </button>
          <button
            onClick={() => explainConcept("transversal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "transversal"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                : "bg-white/5 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300"
            }`}
          >
            <span>↕️</span> ¿Por qué es "Transversal"?
          </button>
          <button
            onClick={() => explainConcept("freq_vs_speed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "freq_vs_speed"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                : "bg-white/5 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300"
            }`}
          >
            <span>⚡</span> Frecuencia (f) vs Rapidez (v)
          </button>
          <button
            onClick={() => explainConcept("why_more_waves")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "why_more_waves"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                : "bg-white/5 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300"
            }`}
          >
            <span>🌊</span> ¿Por qué al subir f se ven más ondas?
          </button>
          <button
            onClick={() => explainConcept("nodes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "nodes"
                ? "bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/30"
                : "bg-white/5 text-slate-300 hover:bg-purple-500/20 hover:text-purple-300"
            }`}
          >
            <span>🎸</span> Nodos y Antinodos
          </button>
          <button
            onClick={() => explainConcept("energy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "energy"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                : "bg-white/5 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
            }`}
          >
            <span>⚖️</span> Conservación Ek & Ep
          </button>
          <button
            onClick={() => explainConcept("kirchhoff")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeConcept === "kirchhoff"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30"
                : "bg-white/5 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300"
            }`}
          >
            <span>🔋</span> Mallas & P=I²R
          </button>
        </div>

        {/* System Explainer Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-950/95 border-l-4 border-cyan-400 border-y border-r border-cyan-500/20 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs md:text-sm font-extrabold text-cyan-400 tracking-wide">{explainerTitle}</span>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Sincronizado con controles en vivo</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{explainerBody}</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1 & 2: WAVES AND STANDING WAVES VIEW                                      */}
      {/* ========================================================================= */}
      {(activeTab === "waves" || activeTab === "standing") && (
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1">PRESETS DE ESTUDIO:</span>
            <button
              onClick={() => loadWavePreset("custom")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                wavePreset === "custom" ? "bg-cyan-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Personalizado
            </button>
            <button
              onClick={() => loadWavePreset("15.12")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                wavePreset === "15.12" ? "bg-cyan-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Prob 15.12 (Partícula vy vs Onda v)
            </button>
            <button
              onClick={() => loadWavePreset("15.44")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                wavePreset === "15.44" ? "bg-cyan-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Prob 15.44 (2do Sobretono n=3)
            </button>
            <button
              onClick={() => loadWavePreset("15.50")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                wavePreset === "15.50" ? "bg-cyan-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Prob 15.50 (Onda Viajera y = A·sin(kx - ωt))
            </button>
            <button
              onClick={() => loadWavePreset("15.41")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                wavePreset === "15.41" ? "bg-cyan-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Prob 15.41 (Tensión por Masa T = mg)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Canvas Card */}
            <div className="lg:col-span-8 flex flex-col rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/80 border-b border-white/10">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span>🌊</span>
                  <span>
                    {waveIsStanding ? "Onda Estacionaria con Nodos y Antinodos" : "Círculo Generador Fasorial (ω) + Cuerda Transversal"}
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    waveIsStanding
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {waveIsStanding ? `Onda Estacionaria (n = ${waveHarmonic})` : "Onda Viajera +x"}
                </span>
              </div>

              {/* Canvas Container */}
              <div className="relative w-full h-[420px] bg-[#080c14] cursor-crosshair">
                <canvas ref={waveCanvasRef} className="block w-full h-full" />

                {/* Overlaid Controls */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none gap-2">
                  <div className="pointer-events-auto px-3 py-1.5 rounded-full bg-slate-950/90 border border-white/10 backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-3">
                    <span>🔄 Giro ωt genera la fase</span>
                    <span className="hidden sm:inline">↕️ Partícula verde: oscila sólo vertical (vy)</span>
                  </div>
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={handleToggleSlowMo}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        waveSlowMo
                          ? "bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/20"
                          : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                      }`}
                    >
                      🐢 {waveSlowMo ? "0.25x Lenta" : "1.0x Normal"}
                    </button>
                    <button
                      onClick={handleWavePause}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-cyan-500 hover:text-slate-950 transition-all"
                    >
                      {waveIsPaused ? "▶️ Reanudar" : "⏸️ Pausar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Readouts Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-950/90 border-t border-white/10">
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-purple-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frecuencia Angular (ω)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {waveOut.omega.toFixed(2)} <span className="text-xs text-purple-400 font-sans">rad/s</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-emerald-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frecuencia (f)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {waveOut.freq.toFixed(2)} <span className="text-xs text-emerald-400 font-sans">Hz</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-amber-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rapidez Onda (v)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {waveOut.speed.toFixed(2)} <span className="text-xs text-amber-400 font-sans">m/s</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-cyan-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitud Onda (λ)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {waveOut.lambda.toFixed(2)} <span className="text-xs text-cyan-400 font-sans">m</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-rose-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vel. Máx Partícula (vy)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {waveOut.vyMax.toFixed(2)} <span className="text-xs text-rose-400 font-sans">m/s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">🎛️ Controles en Vivo</span>
                  <span className="text-[11px] text-cyan-400 font-mono">Tiempo Real 60 FPS</span>
                </div>

                {/* Standing wave toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/10">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Modo Onda Estacionaria</div>
                    <div className="text-[10px] text-slate-400">Extremos fijos y nodos</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waveIsStanding}
                      onChange={(e) => handleToggleStanding(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Harmonic Selector (When standing) */}
                {waveIsStanding && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">Número de Armónico (n)</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        n = {waveHarmonic}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={waveHarmonic}
                      onChange={(e) => handleHarmonicChange(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                    />
                    <div className="flex justify-between text-[10px] text-purple-400/80 font-mono">
                      <span>Fundamental (n=1)</span>
                      <span>n=2</span>
                      <span>n=3</span>
                      <span>n=4</span>
                      <span>n=5</span>
                    </div>
                  </div>
                )}

                {/* Frequency Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🔄 Frecuencia del Motor (f)</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {waveFreq.toFixed(2)} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="6.0"
                    step="0.1"
                    value={waveFreq}
                    onChange={(e) => handleWaveFreqChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="text-[11px] text-purple-300 font-mono">
                    → Frecuencia angular: ω = {(2 * Math.PI * waveFreq).toFixed(2)} rad/s
                  </div>
                </div>

                {/* Tension Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🏹 Tensión de la Cuerda (T)</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      {waveTension.toFixed(1)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="100"
                    step="1"
                    value={waveTension}
                    onChange={(e) => handleWaveTensionChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="text-[11px] text-amber-300 font-mono">
                    → Rapidez de onda: v = √(T/μ) = {Math.sqrt(waveTension / waveMu).toFixed(2)} m/s
                  </div>
                </div>

                {/* Amplitude Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">📐 Amplitud (A)</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {waveAmp.toFixed(3)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.12"
                    step="0.005"
                    value={waveAmp}
                    onChange={(e) => handleWaveAmpChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Linear Density Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🧵 Masa lineal (μ = m/L)</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {waveMu.toFixed(3)} kg/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.002"
                    max="0.040"
                    step="0.002"
                    value={waveMu}
                    onChange={(e) => handleWaveMuChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Live Formula Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">1. Frecuencia angular ω:</span>
                    <span className="font-mono font-bold text-emerald-400">ω = 2π·({waveFreq.toFixed(2)}) = {waveOut.omega.toFixed(2)} rad/s</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">2. Rapidez de propagación v:</span>
                    <span className="font-mono font-bold text-emerald-400">v = √({waveTension.toFixed(1)}/{waveMu.toFixed(3)}) = {waveOut.speed.toFixed(2)} m/s</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">3. Longitud de onda λ:</span>
                    <span className="font-mono font-bold text-emerald-400">λ = {waveOut.speed.toFixed(2)} / {waveFreq.toFixed(2)} = {waveOut.lambda.toFixed(2)} m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">4. Número de onda k:</span>
                    <span className="font-mono font-bold text-emerald-400">k = 2π / {waveOut.lambda.toFixed(2)} = {waveOut.k.toFixed(2)} rad/m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3: M.A.S. SIMPLE HARMONIC MOTION VIEW                                     */}
      {/* ========================================================================= */}
      {activeTab === "mas" && (
        <div className="space-y-4">
          {/* Presets MAS */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1">PRESETS M.A.S.:</span>
            <button
              onClick={() => loadMASPreset("custom")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                masPreset === "custom" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Personalizado
            </button>
            <button
              onClick={() => loadMASPreset("p19")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                masPreset === "p19" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Pág 19 (m = 0.5kg, k = 200N/m)
            </button>
            <button
              onClick={() => loadMASPreset("p20")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                masPreset === "p20" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Pág 20 (Energía Ek ↔ Ep)
            </button>
            <button
              onClick={() => loadMASPreset("p21")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                masPreset === "p21" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Pág 21 (Oscilador Leve m=0.25kg, k=80N/m)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Canvas MAS */}
            <div className="lg:col-span-8 flex flex-col rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/80 border-b border-white/10">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span>⚡</span>
                  <span>Oscilador Masa-Resorte Horizontal (M.A.S. Sin Fricción)</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Integración Newtoniana 60 FPS
                </span>
              </div>

              <div className="relative w-full h-[380px] bg-[#080c14] cursor-grab active:cursor-grabbing">
                <canvas ref={masCanvasRef} className="block w-full h-full" />

                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none gap-2">
                  <div className="pointer-events-auto px-3 py-1.5 rounded-full bg-slate-950/90 border border-white/10 backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-2">
                    <span>🖱️ <strong>Arrastra el bloque azul</strong> para cambiar la amplitud y soltarlo</span>
                  </div>
                  <button
                    onClick={resetMAS}
                    className="pointer-events-auto px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-emerald-500 hover:text-slate-950 transition-all"
                  >
                    🔄 Reiniciar M.A.S.
                  </button>
                </div>
              </div>

              {/* Dynamic Energy Bars */}
              <div className="p-4 bg-slate-950/95 border-t border-white/10 space-y-2.5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-28 font-semibold text-slate-400">Cinética (Ek):</span>
                  <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-75"
                      style={{ width: `${Math.min(100, (masOut.Ek / masOut.maxE) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono font-bold text-cyan-400">{masOut.Ek.toFixed(2)} J</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="w-28 font-semibold text-slate-400">Elástica (Ep):</span>
                  <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-600 transition-all duration-75"
                      style={{ width: `${Math.min(100, (masOut.Ep / masOut.maxE) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono font-bold text-amber-400">{masOut.Ep.toFixed(2)} J</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="w-28 font-semibold text-slate-400">Mecánica Total (E):</span>
                  <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-600 w-full" />
                  </div>
                  <span className="w-16 text-right font-mono font-bold text-emerald-400">{masOut.Etot.toFixed(2)} J</span>
                </div>
              </div>

              {/* Data Strip MAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/90 border-t border-white/10">
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-cyan-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posición x(t)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {masOut.x.toFixed(3)} <span className="text-xs text-cyan-400 font-sans">m</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-rose-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Velocidad v(t)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {masOut.v.toFixed(3)} <span className="text-xs text-rose-400 font-sans">m/s</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-purple-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frecuencia Angular (ω)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {masOut.omega.toFixed(2)} <span className="text-xs text-purple-400 font-sans">rad/s</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-amber-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periodo (T = 2π/ω)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {masOut.period.toFixed(3)} <span className="text-xs text-amber-400 font-sans">s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls MAS */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">🎛️ Parámetros del Oscilador</span>
                  <span className="text-[11px] text-emerald-400 font-mono">k / m</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">⚖️ Masa del Bloque (m)</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      {masMass.toFixed(2)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.5"
                    step="0.05"
                    value={masMass}
                    onChange={(e) => handleMASMassChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🌀 Constante Elástica (k)</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      {masK.toFixed(0)} N/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={masK}
                    onChange={(e) => handleMASKChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">📏 Amplitud Inicial (A)</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      {masAmp.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.20"
                    step="0.01"
                    value={masAmp}
                    onChange={(e) => handleMASAmpChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                {/* Math MAS */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Frecuencia angular ω:</span>
                    <span className="font-mono font-bold text-cyan-400">ω = √({masK}/{masMass}) = {masOut.omega.toFixed(2)} rad/s</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Periodo T:</span>
                    <span className="font-mono font-bold text-cyan-400">T = 2π / {masOut.omega.toFixed(2)} = {masOut.period.toFixed(3)} s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Energía total E:</span>
                    <span className="font-mono font-bold text-emerald-400">E = 1/2 k A² = {masOut.Etot.toFixed(2)} J</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4: CIRCUITS AND DC MESHES VIEW                                            */}
      {/* ========================================================================= */}
      {activeTab === "circuits" && (
        <div className="space-y-4">
          {/* Presets Circuits */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1">PRESETS CIRCUITOS:</span>
            <button
              onClick={() => loadCircuitPreset("ex01")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                circPreset === "ex01" ? "bg-amber-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Circuito 1 (Malla + Divisor)
            </button>
            <button
              onClick={() => loadCircuitPreset("ex02")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                circPreset === "ex02" ? "bg-amber-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Circuito 2 (Malla Doble / Kirchhoff)
            </button>
            <button
              onClick={() => loadCircuitPreset("ex03")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                circPreset === "ex03" ? "bg-amber-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Circuito 3 (Puente Balanceado)
            </button>
            <button
              onClick={() => loadCircuitPreset("ex04")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                circPreset === "ex04" ? "bg-amber-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Circuito 4 (Fuente de Alta Tensión 60V)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Canvas Circuits */}
            <div className="lg:col-span-8 flex flex-col rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/80 border-b border-white/10">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span>🔋</span>
                  <span>Esquemático con Flujo de Electrones en Vivo y Resplandor Térmico (P = I²R)</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  Leyes de Kirchhoff
                </span>
              </div>

              <div className="relative w-full h-[380px] bg-[#080c14]">
                <canvas ref={circCanvasRef} className="block w-full h-full" />

                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none gap-2">
                  <div className="pointer-events-auto px-3 py-1.5 rounded-full bg-slate-950/90 border border-white/10 backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-3">
                    <span>🟡 Puntos amarillos: deriva de carga eléctrica</span>
                    <span>💡 Resplandor naranja: calor Joule P = I²R</span>
                  </div>
                </div>
              </div>

              {/* Data Strip Circuits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/90 border-t border-white/10">
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-amber-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voltaje Fuente (Vs)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {circOut.Vs.toFixed(1)} <span className="text-xs text-amber-400 font-sans">V</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-cyan-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corriente Total (It)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {circOut.It.toFixed(2)} <span className="text-xs text-cyan-400 font-sans">A</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-emerald-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resistencia Eq (Req)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {circOut.Req.toFixed(2)} <span className="text-xs text-emerald-400 font-sans">Ω</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border-l-4 border-rose-400">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Potencia Total (Ptot)</div>
                  <div className="text-base font-extrabold font-mono text-white mt-1">
                    {circOut.Ptot.toFixed(1)} <span className="text-xs text-rose-400 font-sans">W</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Circuits */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">🎛️ Componentes de la Red</span>
                  <span className="text-[11px] text-amber-400 font-mono">Kirchhoff Mesh</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">⚡ Fuente de Voltaje (Vs)</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      {circVs} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="100"
                    step="1"
                    value={circVs}
                    onChange={(e) => handleCircVsChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🔲 Resistor Serie R1</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {circR1} Ω (P = {circOut.P1.toFixed(1)}W)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={circR1}
                    onChange={(e) => handleCircR1Change(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🔲 Resistor Paralelo R2</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {circR2} Ω (P = {circOut.P2.toFixed(1)}W)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={circR2}
                    onChange={(e) => handleCircR2Change(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">🔲 Resistor Paralelo R3</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {circR3} Ω (P = {circOut.P3.toFixed(1)}W)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={circR3}
                    onChange={(e) => handleCircR3Change(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Math Circuits */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">R2 || R3:</span>
                    <span className="font-mono font-bold text-amber-400">Rp = (R2·R3)/(R2+R3) = {((circR2 * circR3) / (circR2 + circR3)).toFixed(2)} Ω</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Req Total:</span>
                    <span className="font-mono font-bold text-amber-400">Req = R1 + Rp = {circOut.Req.toFixed(2)} Ω</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Corriente It:</span>
                    <span className="font-mono font-bold text-cyan-400">It = Vs / Req = {circOut.It.toFixed(2)} A</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Potencia Joule P:</span>
                    <span className="font-mono font-bold text-rose-400">P = Vs·It = {circOut.Ptot.toFixed(1)} W</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
