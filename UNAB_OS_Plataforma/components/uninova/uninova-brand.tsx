"use client";

import React from "react";
import Link from "next/link";

export function UniNovaLogo({
  variant = "full",
  size = "md",
  className = "",
}: {
  variant?: "full" | "mark" | "compact";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const markSize = size === "sm" ? 28 : size === "lg" ? 44 : 36;

  return (
    <div className={`uninova-brand-wrapper ${className}`}>
      <div
        className="uninova-brand-symbol"
        style={{ width: markSize, height: markSize }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="uninova-brand-svg"
        >
          <path
            d="M8 12C8 12 12 24 18 30C24 36 34 38 40 34C37 38 30 42 22 40C12 37 6 27 6 16C6 14.5 6.5 13 8 12Z"
            fill="var(--color-primary)"
          />
          <path
            d="M12 8C12 8 16 18 24 24C32 30 40 28 42 26C41 30 36 34 29 34C18 34 11 23 11 12C11 10.5 11.5 9 12 8Z"
            fill="var(--color-info)"
          />
          <path
            d="M16 6C20 6 26 10 30 16C34 22 38 23 42 21C42 25 38 29 32 29C23 29 15 20 15 10C15 8.5 15.5 7 16 6Z"
            fill="var(--color-primary-strong)"
          />
          <circle cx="24" cy="24" r="3" fill="var(--color-bg-surface)" opacity="0.9" />
        </svg>
      </div>

      {variant !== "mark" && (
        <div className="uninova-brand-text">
          <span className="uninova-brand-name">
            <strong>Uni</strong>Nova
          </span>
          {variant === "full" && (
            <span className="uninova-brand-slogan">Conocimiento que te impulsa</span>
          )}
        </div>
      )}
    </div>
  );
}

export function UniNovaBrandLink({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="uninova-brand-link" aria-label="UniNova Universidad OS, ir al inicio">
      <UniNovaLogo variant="full" size="md" />
    </Link>
  );
}
