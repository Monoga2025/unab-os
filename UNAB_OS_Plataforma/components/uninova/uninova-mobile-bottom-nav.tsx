"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function UniNovaMobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Inicio",
      href: "/dashboard",
      icon: "🏠",
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "Materias",
      href: "/materias",
      icon: "📚",
      active: pathname.startsWith("/materias") || pathname.startsWith("/course") || pathname.startsWith("/section"),
    },
    {
      label: "Estudio",
      href: "/study",
      icon: "⏱️",
      active: pathname.startsWith("/study"),
    },
    {
      label: "Entrenador",
      href: "/entrenador",
      icon: "🎯",
      active: pathname.startsWith("/entrenador"),
    },
    {
      label: "Tutor IA",
      href: "/tutor",
      icon: "🧠",
      active: pathname.startsWith("/tutor"),
    },
    {
      label: "Progreso",
      href: "/progress",
      icon: "📊",
      active: pathname.startsWith("/progress") || pathname.startsWith("/evaluaciones"),
    },
  ];

  return (
    <nav
      className="uninova-mobile-dock"
      aria-label="Navegación móvil principal"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        padding: "8px 16px max(12px, env(safe-area-inset-bottom))",
        backgroundColor: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.04)",
        display: "none", // Displayed via CSS media query @media (max-width: 768px)
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.active;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                textDecoration: "none",
                padding: "4px 8px",
                borderRadius: "10px",
                color: isActive ? "#0075de" : "#64748b",
                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: "1.25rem",
                  lineHeight: 1,
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: isActive ? 800 : 600,
                  letterSpacing: "-0.2px",
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#0075de",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
