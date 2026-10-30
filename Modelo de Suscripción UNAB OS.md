# 🎓 PLAN DE NEGOCIO & ESTRATEGIA COMERCIAL — UNAB OS SAAS
> **Propietario:** Daniel Monoga | **Institución:** Universidad Autónoma de Bucaramanga (UNAB)  
> **Modelo:** Micro-SaaS B2C por Suscripción para Estudiantes Universitarios

---

## 🎯 1. Visión y Propuesta de Valor

**UNAB OS** es la suite operativa definitiva para los estudiantes de la UNAB. Elimina el estrés de revisar múltiples plataformas desactualizadas, olvidar fechas de parciales o perder talleres.

### 🔥 ¿Qué resuelve para el estudiante?
1. **Sincronización Total con TEMA UNAB:** Horarios, notas, cortes y talleres centralizados en un único panel limpio, rápido y moderno.
2. **Alertas Inteligentes en Telegram:** Notificaciones directas al celular antes de clases, vencimientos de quizes y recordatorios de entregas.
3. **Study Trainer Adaptativo:** Banco de ejercicios, quizes paso a paso con pistas progresivas y simuladores para materias filtro (Física, Ondas, Circuitos, Mecánica).
4. **Calculadora de Notas & Objetivos:** Conoce exactamente qué nota necesitas en el 3er corte para pasar la materia.

---

## 💳 2. Estructura de Precios & Planes (Suscripción)

| Plan | Tarifa (COP) | Período de Acceso | Equivalencia / Gancho Mental |
| :--- | :---: | :---: | :--- |
| **Plan Estudiante Mensual** | **$14.900 COP** | 30 días | *Menos de lo que cuesta un almuerzo corriente en la cafetería* |
| **Plan Semestre Pro (Recomendado)** | **$39.900 COP** | 5 meses (Corte completo) | *Solo $7.980 COP/mes • Ahorro del 47%* |
| **Pase Parciales (Semana Crítica)** | **$9.900 COP** | 7 días intensivos | *Acceso urgente al Study Trainer para salvar el parcial* |

---

## 📲 3. Pasarela de Pagos & Cobro Inmediato (Cero Fricción)

Para estudiantes universitarios en Colombia, la fricción de pago debe ser mínima:
1. **Nequi & Daviplata Directo:**
   - Transferencia con comprobante automatizado o validación por bot.
   - Teléfono oficial: `<phone>`.
2. **Pasarela Wompi Bancolombia:**
   - Pago con tarjeta débito, crédito, PSE y Nequi en 1 click integrado en la landing del panel.

---

## 🚀 4. Estrategia de Adquisición de Estudiantes (Go-To-Market UNAB)

### Canal #1: Grupos de WhatsApp de Carreras UNAB
- Grupos de Mecatrónica, Sistemas, Industrial, Civil, Biomédica y Medicina.
- Publicación estratégica en **semanas de parciales (Corte 1, 2 y 3)**.

#### 💬 Script para Grupos de WhatsApp:
```text
¡Hola muchachos! 👋 ¿A cuántos no les ha pasado que TEMA se cae justo cuando toca subir el taller o que se les pasa la fecha de un quiz?

Con unos compañeros de ingeniería desarrollamos *UNAB OS* 🧠:
✅ Sincroniza tus materias, horarios y notas en un solo panel rápido desde el cel o pc.
✅ Te avisa por Telegram antes de las clases y parciales para que nunca te coja la tarde.
✅ Trae un simulador con ejercicios resueltos de Circuitos, Ondas y Mecánica para preparar los quizes.

Lo estamos liberando para este semestre con cupos de prueba. Si quieren ver cómo funciona o probarlo, échenle un ojo aquí: [Link de Acceso] o escríbanme al privado 🚀
```

### Canal #2: Boca a Boca & Gamificación
- **Programa "Invita a tu combo":** Si un estudiante refiere a 3 amigos que se suscriban al semestre, su semestre es **100% GRATIS**.
- **Pizarras y Salas de Cómputo:** Código QR adhesivo en mesas de estudio de biblioteca y pasillos con el titular: *"¿Parciales de Física/Circuitos esta semana? Estudia con UNAB OS"*.

---

## 📊 5. Proyecciones Financieras para 1 Semestre

- **100 Estudiantes activos (Semestre Pro @ $39.900 COP):**  
  **$3.990.000 COP** en ingresos recurrentes directos.
- **300 Estudiantes activos:**  
  **$11.970.000 COP** por semestre (~$2.4M COP/mes libres).
- **Costo del Servidor (Railway + Supabase Free/Pro Tier):**  
  ~$5 - $25 USD/mes (~$25.000 - $100.000 COP/mes).  
  **Margen de beneficio neto: > 95%.**

---

## 🛠️ 6. Componentes del Producto en Monoga OS

- **Panel Web Full-stack:** `04_UNAB_MECATRONICA/02_SaaS_UNAB_OS/UNAB_OS_Plataforma/` (Next.js 16, Supabase SSR, sync TEMA).
- **Study Trainer Adaptativo:** `04_UNAB_MECATRONICA/03_Study_Trainer/study-platform/` (Vite, React, interactivo).
- **Bot de Notificaciones:** Integrado con el motor Jarvis en `01_JARVIS_ENGINE` y `@Unab_iabot`.
