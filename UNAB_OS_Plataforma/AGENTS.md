<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Universidad OS / UniNova — Guía del Proyecto & Arquitectura AI (Antigravity System)

Bienvenido al repositorio oficial de **Universidad OS (UniNova)**. Este archivo `AGENTS.md` contiene la directriz central y contexto persistente para Antigravity y todos los subagentes AI.

---

## 🏛️ 1. Resumen del Producto

**Universidad OS** es la plataforma de gestión académica, entrenamiento adaptativo y coordinación con IA diseñada para estudiantes de **Ingeniería Mecatrónica** y carreras científicas de la **Universidad Autónoma de Bucaramanga (UNAB)**.

### Módulos Principales:
1. **Centro de Control UniNova (`/dashboard`)**:
   - Dashboard panorámico con resumen KPI (materias, quices, archivos TEMA, horas de estudio).
   - Agenda diaria de evaluaciones y quices.
   - Acceso rápido a simuladores 2D, entrenador 1-Tap y tarjetas de algoritmos de estudio (ej. Bernoulli, Mecanismos).
   - Card de sincronización y vinculación con **Jarvis en Telegram**.

2. **Jarvis Telegram Assistant (`deployment/jarvis`)**:
   - Bot interactivo proactivo de Telegram desarrollado en Python (`python-telegram-bot`, `openai`, SQLite).
   - Comandos: `/link CÓDIGO`, `/plan`, `/tasks`, `/add`, `/done`, `/remind`, `/today`, `/coach`, `/estudiar`.
   - Puente Cloud a través de endpoints seguros en Next.js (`/api/jarvis/bridge/...` y `/api/telegram/pairing`).

3. **Espacio de Estudio y Práctica (`/study`)**:
   - Carga de PDFs, guías y diapositivas de clase.
   - Programación de sesiones de estudio de 45 minutos.
   - Generación y despacho de handoffs verificados a ChatGPT a través de Jarvis Telegram.

4. **Tutor IA (`/tutor`)**:
   - Asistente socrático que analiza documentos de clase y guía en la resolución de problemas paso a paso sin regalar las soluciones.

5. **Integración TEMA Moodle (`/tema`)**:
   - Sincronización de catálogo de materias, actividades, tareas y PDFs oficiales capturados de Moodle.

---

## 🛠️ 2. Stack Tecnológico

- **Frontend / Fullstack**: Next.js 16+ (App Router, Turbopack, React Server Components, Server Actions).
- **Base de Datos & Auth**: Supabase Postgres (Row Level Security RLS, Server Auth, Storage, Edge Functions).
- **Estilos & UI**: CSS Puro con Tokens de Variables CSS (`styles.css`), diseño ultra-luxury Pro Max, responsive, cero placeholders.
- **Bot Backend (Jarvis)**: Python 3.11+, `python-telegram-bot` v22+, `openai` Python SDK, SQLite (`jarvis.db`).
- **Gateway & Bridge IA**: Endpoint OpenAI-Compatible (`/api/jarvis/ai/chat/completions`) en Netlify AI Gateway y Next.js.
- **Testing & QA**: Vitest (`npm test`), con 46 suites de integración y más de 225 pruebas automatizadas.

---

## 📁 3. Estructura de Carpetas & Convenciones

```
UNAB_OS_Plataforma/
├── AGENTS.md                  # Reglas globales y contexto principal para Antigravity / Agent AI
├── CLAUDE.md                  # Redirección a AGENTS.md (@AGENTS.md)
├── .agents/                   # Customizaciones del agente (skills, reglas locales)
│   └── skills/                # Skills customizados (supabase, postgres-best-practices, etc.)
├── app/                       # Rutas de Next.js App Router
│   ├── (app)/                 # Rutas autenticadas (dashboard, study, tutor, progress, tema, etc.)
│   ├── api/                   # REST Endpoints (jarvis, telegram, tema, study, tutor)
│   └── actions/               # Server Actions (jarvis, academic-collaboration, tema)
├── components/                # Componentes React (uninova/*, jarvis-command, telegram-pairing-card)
├── deployment/jarvis/         # Servicio Python del bot de Telegram
│   ├── data/jarvis.db         # SQLite local de tareas, recordatorios y eventos de Jarvis
│   └── src/jarvis/            # Código fuente (bot.py, assistant.py, university_os_bridge.py, config.py)
├── lib/                       # Librerías del dominio, cliente de Supabase y puentes
└── tests/                     # Pruebas automatizadas de integración y dominio con Vitest
```

---

## ⚠️ 4. Protocolo de Calidad & Reglas de Desarrollo

1. **Intransigencia en Verificación (QA)**:
   - NUNCA declarar una tarea finalizada sin ejecutar `npm test` y verificar que las 46 suites de pruebas pasen en 100% verde.
2. **Preservar la Autenticidad de Datos**:
   - No usar mockups estáticos ni botones muertos. Todo botón en la interfaz debe ejecutar su Server Action o navegación correspondiente.
3. **Seguridad y Paridad de Modulos**:
   - Jarvis y Telegram deben permanecer plenamente funcionales y accesibles sin bloqueos ficticios de interfaz.
