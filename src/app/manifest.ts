import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: "Studify", short_name: "Studify", description: "Seu ciclo de estudo, questões e revisão.", lang: "pt-BR", start_url: "/dashboard", scope: "/", display: "standalone", background_color: "#0B1220", theme_color: "#0B1220", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
