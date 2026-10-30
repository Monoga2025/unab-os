import { describe, expect, it } from "vitest";
import { classifyTemaActivity, parseTemaAvailability } from "@/lib/tema/dates";

describe("TEMA Moodle date parsing", () => {
  it("parses accented Spanish month and weekday names in America/Bogota", () => {
    const result = parseTemaAvailability(
      "Apertura: sábado, 15 de agosto de 2026, 14:22 Cierre: jueves, 20 de agosto de 2026, 08:05",
    );

    expect(result).toEqual({
      opensAt: { iso: "2026-08-15T19:22:00.000Z", timestamp: Date.parse("2026-08-15T19:22:00.000Z") },
      closesAt: { iso: "2026-08-20T13:05:00.000Z", timestamp: Date.parse("2026-08-20T13:05:00.000Z") },
      timeZone: "America/Bogota",
    });
  });

  it("supports Spanish 12-hour and 24-hour clocks deterministically", () => {
    expect(parseTemaAvailability(
      "Apertura: viernes, 14 de agosto de 2026, 7:10 p. m. Cierre: viernes, 14 de agosto de 2026, 11:45 p. m.",
    )).toMatchObject({
      opensAt: { iso: "2026-08-15T00:10:00.000Z" },
      closesAt: { iso: "2026-08-15T04:45:00.000Z" },
    });
    expect(parseTemaAvailability(
      "Apertura: martes, 11 de agosto de 2026, 00:00 Cierre: martes, 11 de agosto de 2026, 12:00",
    )).toMatchObject({
      opensAt: { iso: "2026-08-11T05:00:00.000Z" },
      closesAt: { iso: "2026-08-11T17:00:00.000Z" },
    });
  });

  it("returns null fields for missing or malformed dates instead of guessing", () => {
    expect(parseTemaAvailability("Intentos permitidos: 1")).toEqual({
      opensAt: null,
      closesAt: null,
      timeZone: "America/Bogota",
    });
    expect(parseTemaAvailability("Apertura: lunes, 40 de foo de 2026, 29:99")).toEqual({
      opensAt: null,
      closesAt: null,
      timeZone: "America/Bogota",
    });
  });
});

describe("TEMA captured activity classification", () => {
  it("does not infer a status that the captured text cannot support", () => {
    expect(classifyTemaActivity(["Entrega de la Actividad"], Date.parse("2026-08-13T15:00:00Z")))
      .toEqual({ status: "unknown", deadlineWindow: null, closesAt: null });
  });

  it("prioritizes explicit graded and submitted evidence", () => {
    expect(classifyTemaActivity([
      "Estado de la entrega Enviado para calificar Estado de la calificación Calificado",
    ], Date.parse("2026-08-13T15:00:00Z")).status).toBe("graded");
    expect(classifyTemaActivity([
      "Estado de la entrega Enviado para calificar Estado de la calificación Sin calificar",
    ], Date.parse("2026-08-13T15:00:00Z")).status).toBe("submitted");
  });

  it("classifies explicit overdue evidence and future dated work", () => {
    expect(classifyTemaActivity([
      "Estado de la entrega Todavía no se han realizado envíos La Tarea está retrasada por: 5 días",
    ], Date.parse("2026-08-13T15:00:00Z")).status).toBe("overdue");

    const future = classifyTemaActivity([
      "Apertura: jueves, 13 de agosto de 2026, 00:00 Cierre: viernes, 14 de agosto de 2026, 23:59",
      "Todavía no se han realizado envíos",
    ], Date.parse("2026-08-13T15:00:00Z"));
    expect(future.status).toBe("upcoming");
    expect(future.deadlineWindow).toBe("tomorrow");
  });

  it("uses Bogota calendar boundaries for tomorrow and the current week", () => {
    const now = Date.parse("2026-08-13T15:00:00Z"); // Thursday 10:00 in Bogota
    expect(classifyTemaActivity([
      "Cierre: viernes, 14 de agosto de 2026, 00:00",
    ], now).deadlineWindow).toBe("tomorrow");
    expect(classifyTemaActivity([
      "Cierre: domingo, 16 de agosto de 2026, 23:59",
    ], now).deadlineWindow).toBe("this_week");
    expect(classifyTemaActivity([
      "Cierre: lunes, 17 de agosto de 2026, 00:00",
    ], now).deadlineWindow).toBe("later");
  });
});
