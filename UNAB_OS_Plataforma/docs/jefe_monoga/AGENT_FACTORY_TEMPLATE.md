# 🏭 FÁBRICA DE SUBAGENTES — Plantilla Universal de Instanciación
*Estructura obligatoria para invocar y parametrizar agentes de máxima eficiencia sin quemar tokens*

---

## 📋 Estructura de la Ficha Técnica de un Subagente

Cada vez que **JEFE MONOGA** o el desarrollador vaya a crear un subagente especializado vía `invoke_subagent` o `define_subagent`, debe cumplir obligatoriamente esta plantilla de 6 bloques:

```yaml
================================================================================
FICHA TÉCNICA DE SUBAGENTE ESPECIALIZADO
================================================================================

1. IDENTIFICACIÓN Y ROL:
   - Rol: [Título conciso de 2-4 palabras, ej: 'Database & Security Architect']
   - Tipo de Modelo: [inherit / flash / pro según complejidad de razonamiento]
   - Modo de Espacio: [inherit / branch si requiere aislamiento de git]

2. OBJETIVO ÚNICO Y ALCANCE (SCOPE):
   - Misión: [Una única meta concreta y no negociable]
   - Límites Estrictos: [Qué tiene PROHIBIDO tocar o modificar para evitar regresiones]

3. CONTEXTO MÍNIMO NECESARIO (Zero Bloat):
   - Archivos Clave a Consultar: [Rutas absolutas o relativas de types, schemas o configs]
   - Estado Actual: [Breve descripción de 2 líneas del estado del sistema]

4. HERRAMIENTAS ASIGNADAS (Tool Whitelist):
   - Lectura / Escritura de archivos
   - Terminal de comandos (Tests, Lints, Builds)
   - [Opcional] Orca Browser CLI para automatización visual

5. LOOP DE EJECUCIÓN CERRADO (Anthropic / Claude Standard):
   - [Paso 1 - Observe]: Leer los archivos asignados y verificar estado inicial.
   - [Paso 2 - Orient]: Analizar contratos de tipos e interfaces requeridas.
   - [Paso 3 - Plan]: Definir micro-secuencia de 1 a 3 cambios atómicos.
   - [Paso 4 - Act]: Escribir código limpio, modular y tipado (cero 'any').
   - [Paso 5 - Verify]: Ejecutar pruebas automatizadas locales. Si hay fallos, corregir inmediatamente en bucle.

6. CRITERIO BINARIO DE ACEPTACIÓN (DoD - Definition of Done):
   - [ ] 100% de tests asociados en verde.
   - [ ] Cero errores de compilación (`tsc --noEmit` o equivalente).
   - [ ] Resumen de entrega estructurado: Archivos tocados + Comandos ejecutados + Evidencia de éxito.
================================================================================
```

---

## 💻 Ejemplo de Invocación con `invoke_subagent`

```json
{
  "Subagents": [
    {
      "Role": "Supabase Security Specialist",
      "TypeName": "self",
      "Model": "inherit",
      "Prompt": "Tu única misión es auditar y reforzar las políticas de RLS en 'supabase/migrations/'. 1) Revisa que todas las tablas tengan RLS habilitado. 2) Agrega políticas para que los usuarios solo lean sus propios registros. 3) Ejecuta los tests de base de datos y confirma que no haya permisos públicos indebidos. Si encuentras errores, corrígelos. Devuelve la lista de migraciones actualizadas y evidencia de tests pasando."
    }
  ]
}
```
