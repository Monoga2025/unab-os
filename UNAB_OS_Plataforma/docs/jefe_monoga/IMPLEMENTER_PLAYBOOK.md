# 👑 JEFE MONOGA — Manual del Implementador de IA de Élite
*Estándar de Ingeniería Multiagente, Rentabilidad de Tokens y Cero Bucles Infinitos*

---

## 🎯 1. La Regla de Oro: El Filtro Anti-YOLO (Spec-Driven)

Todo proyecto o feature que ejecute **JEFE MONOGA** o cualquiera de sus agentes subordinados sigue una ley inquebrantable:

> **"Prohibido escribir una sola línea de código sin un Brief Arquitectónico y un Plan Atómico Validado."**

### El Ciclo de Vida de 4 Pasos:
1. **Briefing Socrático & Delimitación**:
   - Se definen restricciones de rendimiento, dependencias existentes y manejo de errores.
   - Cero preguntas obvias o bobas: El Tech Lead toma las decisiones de arquitectura estándar automáticamente.
2. **Especificación Atómica & Contratos**:
   - Cada tarea no debe exceder 1-3 archivos y debe tener una interfaz TypeScript/Python clara.
3. **Ejecución Aislada por Subagentes (Worker Pattern)**:
   - Los subagentes no deben comunicarse entre sí en desorden ("teléfono roto"). Cada uno reporta únicamente al Jefe.
   - Si un subagente falla o genera código con warnings, el Jefe envía una orden correctiva concisa (`send_message`).
4. **Verificación Intransigente (TDD / QA)**:
   - Evidencia antes que afirmaciones (`verification-before-completion`).
   - `npm test` o `pytest` deben ejecutarse y reportar 100% de tests en verde antes de dar una tarea por cerrada.

---

## 🧬 2. Matriz de Despacho de Agentes

| Complejidad | Estrategia de Ejecución | Herramientas Utilizadas |
| :--- | :--- | :--- |
| **Micro-Fix (1 archivo, bug evidente)** | **Mono-agente directo** en el hilo principal. Cero overhead. | `systematic-debugging` |
| **Feature Estándar (Frontend / API)** | **Plan atómico secuencial + TDD**. | `writing-plans` ➔ `test-driven-development` |
| **Sistema Complejo (Fullstack + DB + UI)** | **Orquestador + Subagentes especializados en paralelo**. | `skill-jefe-orquestador` + `invoke_subagent` |
| **Flujos Web Interactivos / Visuales** | **Automatización e Inspección con Orca CLI**. | `skill-orca-browser-automation` |

---

## ⏰ 3. Radar Diario Automatizado (Cron 9:00 AM)

- Configurado de forma persistente en el planificador de Antigravity (`task-14`).
- Se dispara automáticamente cada mañana a las **9:00 AM**.
- **Misión del Radar**:
  1. Escanear descubrimientos de Anthropic (Claude Code / Computer Use).
  2. Rastrear papers y benchmarks de Google DeepMind y OpenAI.
  3. Auditar técnicas de reducción de costos de tokens y SWE-bench.
  4. Auto-actualizar las habilidades del sistema y presentar un reporte ejecutivo accionable a Daniel Monoga.
