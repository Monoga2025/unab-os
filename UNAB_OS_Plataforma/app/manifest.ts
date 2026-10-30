import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Universidad OS · UniNova UNAB",
    short_name: "UniNova",
    description: "Plataforma de gestión académica, entrenamiento adaptativo y coordinación con IA para Ingeniería UNAB.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f5f4",
    theme_color: "#0075de",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
