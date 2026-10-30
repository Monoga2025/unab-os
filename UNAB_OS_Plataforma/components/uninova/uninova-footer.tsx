"use client";

import React from "react";
import { UniNovaLogo } from "./uninova-brand";

export function UniNovaFooter() {
  return (
    <footer className="uninova-footer">
      <div className="uninova-footer-brand-col">
        <UniNovaLogo variant="full" size="sm" />
      </div>

      <div className="uninova-footer-links">
        <a href="#soporte" className="uninova-footer-link">Soporte</a>
        <span className="uninova-footer-pipe">|</span>
        <a href="#ayuda" className="uninova-footer-link">Centro de ayuda</a>
        <span className="uninova-footer-pipe">|</span>
        <a href="#terminos" className="uninova-footer-link">Términos de uso</a>
        <span className="uninova-footer-pipe">|</span>
        <a href="#privacidad" className="uninova-footer-link">Política de privacidad</a>
      </div>

      <div className="uninova-footer-copyright">
        <span>UniNova © 2026</span>
        <small>Construimos un mejor mañana.</small>
      </div>
    </footer>
  );
}
