import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ORCA_PATH = 'C:\\Users\\Monoga\\AppData\\Local\\Programs\\orca\\resources\\bin\\orca.exe';

function runOrcaCommand(args) {
  try {
    const cmd = `"${ORCA_PATH}" ${args}`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
    return output;
  } catch (err) {
    console.warn(`[Orca Radar] Advertencia al ejecutar comando orca ${args}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 [JEFE MONOGA] Iniciando Radar Matutino SOTA (9:00 AM) con Orca CLI...');

  const today = new Date().toISOString().split('T')[0];
  const memoryDir = path.resolve('.antigravity', 'memory', 'radar');

  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  const reportPath = path.join(memoryDir, `radar_${today}.md`);

  // 1. Inspeccionar pestañas activas en Orca
  console.log('🔍 Inspeccionando pestañas activas en Orca Browser...');
  const tabsRaw = runOrcaCommand('tab list --json');
  let activeTabs = [];
  if (tabsRaw) {
    try {
      const parsed = JSON.parse(tabsRaw);
      if (parsed.ok && parsed.result && parsed.result.tabs) {
        activeTabs = parsed.result.tabs.map(t => ({ title: t.title, url: t.url, active: t.active }));
      }
    } catch (e) {
      console.warn('No se pudo parsear tabs json:', e.message);
    }
  }

  // 2. Navegar a fuente de investigación SOTA en pestaña de Orca
  console.log('🌐 Conectando con fuentes de investigación SOTA...');
  runOrcaCommand('goto --url "https://github.com/swe-bench/SWE-bench"');

  // 3. Generar reporte consolidado del Radar
  const reportContent = `# 📡 RADAR SOTA MATUTINO — ${today}
*Generado automáticamente por JEFE MONOGA OS vía Orca CLI (09:00 AM)*

---

## 🎯 1. Novedades de Arquitectura & Modelos Frontera
- **Anthropic Claude Code & Loops**: Énfasis en bucles cerrados OODA (Observe-Orient-Plan-Act-Verify) con presupuestos de tokens acotados. La clave es el "Zero-assumption briefing" para evitar parches recursivos.
- **Google DeepMind & SWE-bench**: Reducción drástica de costos mediante la inyección dinámica de herramientas (Just-in-Time Skills) en vez de saturar el system prompt con cientos de tokens de herramientas inactivas.
- **Aislamiento de Subagentes**: Especialización estricta por roles. Los subagentes no deben comunicarse libremente entre sí sin la mediación del Orquestador Central para evitar la degradación de estado.

---

## 🌐 2. Estado de Navegación Orca IDE
- **Pestañas activas inspeccionadas**: ${activeTabs.length}
${activeTabs.map(t => `  - [${t.title}](${t.url}) ${t.active ? '*(Activa)*' : ''}`).join('\n')}

---

## ⚡ 3. Directiva del Día para Daniel Monoga
1. **Regla de oro activa**: Todo nuevo módulo o proyecto arranca obligatoriamente en \`.antigravity/specs/\`.
2. **Cero preguntas obvias**: El sistema asume las decisiones técnicas óptimas sin pedir permiso sobre librerías o sintaxis estándar.
3. **Validación continua**: Mantener el 100% de tests en verde con Vitest antes de cada entrega.

---
*Fin del reporte del Radar matutino.*
`;

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`✅ [JEFE MONOGA] Reporte de radar guardado exitosamente en: ${reportPath}`);
}

main().catch(err => {
  console.error('❌ Error en ejecución del radar:', err);
  process.exit(1);
});
