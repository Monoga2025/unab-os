"use client";

import React from "react";

export interface HeroAction {
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "outline" | "secondary";
  onClick?: () => void;
}

export function UniNovaHeroBanner({
  title = "Panel administrativo",
  subtitle = "Control central de la operación universitaria.",
  motto = "Hagamos de la educación un mundo con más oportunidades.",
  highlightTag = "Grandes historias comienzan aquí ッ",
  actions = [],
  className = "",
}: {
  title?: string;
  subtitle?: string;
  motto?: string;
  highlightTag?: string;
  actions?: HeroAction[];
  className?: string;
}) {
  return (
    <div className={`uninova-hero-section ${className}`}>
      <div className="uninova-hero-top-row">
        <div className="uninova-hero-titles">
          <h1 className="uninova-hero-main-title">{title}</h1>
          <p className="uninova-hero-subtitle">{subtitle}</p>
        </div>

        {actions.length > 0 && (
          <div className="uninova-hero-actions-group">
            {actions.map((act, index) => (
              <button
                key={index}
                type="button"
                className={`uninova-hero-btn uninova-hero-btn-${act.variant || "primary"}`}
                onClick={act.onClick}
              >
                {act.icon && <span className="uninova-hero-btn-icon">{act.icon}</span>}
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panoramic Institutional Banner */}
      <div className="uninova-panoramic-banner">
        <div className="uninova-banner-left">
          <div className="uninova-banner-icon-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="uninova-banner-motto">{motto}</p>
        </div>

        <div className="uninova-banner-campus-visual">
          <div className="uninova-banner-skyline" aria-hidden="true">
            {/* Modern Campus Architecture Skyline SVG Vector */}
            <svg viewBox="0 0 340 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="uninova-skyline-svg">
              <rect x="10" y="30" width="40" height="60" rx="3" fill="var(--color-primary-soft)" />
              <rect x="55" y="15" width="60" height="75" rx="4" fill="var(--color-info-soft)" />
              <rect x="120" y="25" width="85" height="65" rx="4" fill="var(--color-primary-subtle)" />
              <rect x="210" y="10" width="70" height="80" rx="5" fill="var(--color-primary-soft)" />
              <rect x="285" y="35" width="45" height="55" rx="3" fill="var(--color-info-soft)" />
              {/* Windows Matrix */}
              <circle cx="25" cy="45" r="2.5" fill="var(--color-primary)" opacity="0.6" />
              <circle cx="35" cy="45" r="2.5" fill="var(--color-primary)" opacity="0.6" />
              <circle cx="25" cy="60" r="2.5" fill="var(--color-primary)" opacity="0.6" />
              <circle cx="35" cy="60" r="2.5" fill="var(--color-primary)" opacity="0.6" />
              <rect x="68" y="25" width="34" height="6" rx="1.5" fill="var(--color-primary)" opacity="0.5" />
              <rect x="68" y="38" width="34" height="6" rx="1.5" fill="var(--color-primary)" opacity="0.5" />
              <rect x="68" y="51" width="34" height="6" rx="1.5" fill="var(--color-primary)" opacity="0.5" />
              <rect x="135" y="36" width="55" height="8" rx="2" fill="var(--color-info)" opacity="0.5" />
              <rect x="135" y="52" width="55" height="8" rx="2" fill="var(--color-info)" opacity="0.5" />
              <rect x="225" y="22" width="40" height="7" rx="2" fill="var(--color-primary-strong)" opacity="0.4" />
              <rect x="225" y="36" width="40" height="7" rx="2" fill="var(--color-primary-strong)" opacity="0.4" />
              <rect x="225" y="50" width="40" height="7" rx="2" fill="var(--color-primary-strong)" opacity="0.4" />
              {/* Campus Trees */}
              <circle cx="116" cy="75" r="8" fill="var(--color-success)" opacity="0.7" />
              <circle cx="206" cy="75" r="9" fill="var(--color-success)" opacity="0.8" />
              <circle cx="282" cy="76" r="7" fill="var(--color-success)" opacity="0.6" />
            </svg>
          </div>
          <div className="uninova-banner-tag-badge">
            <span className="uninova-banner-handwritten">{highlightTag}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
