import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://ateliersdecalligraphie.com",
  output: "static",
  adapter: vercel({
    // Les pages admin (prerender:false) lisent ces fichiers via fs au chargement
    // du module (src/data/*.ts, api/admin/events.ts). Le traçage de fichiers de
    // Vercel ne détecte pas fiablement un chemin littéral passé à
    // fs.readFileSync : sans includeFiles, ces .yaml ne sont simplement pas
    // copiés dans la fonction serverless, d'où un ENOENT à l'exécution alors
    // que le build local réussit (les fichiers existent sur le disque de build).
    includeFiles: [
      "./src/data/prices.yaml",
      "./src/data/products.yaml",
      "./src/data/contact.yaml",
      "./src/data/institutions.yaml",
      "./src/data/interventions.yaml",
      "./src/data/testimonials.yaml",
      "./src/data/venues.yaml",
      "./src/data/faq.yaml",
      "./src/content/ateliers.yaml",
    ],
  }),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/admin/"),
    }),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss()],
    // sharp (utilisé par /api/admin/upload-image) embarque des binaires
    // natifs par plateforme : si esbuild l'intègre au bundle de la fonction
    // serverless, la logique interne de sharp pour localiser son propre
    // binaire .node casse, et le module échoue dès son chargement — avant
    // même que le moindre gestionnaire de route ne s'exécute, donc avant
    // qu'un try/catch applicatif ne puisse l'intercepter. Le déclarer
    // externe laisse Node le résoudre normalement depuis node_modules à
    // l'exécution, ce que le traçage de fichiers de Vercel gère correctement.
    ssr: {
      external: ["sharp"],
    },
  },

  // Redirects
  redirects: {
    "/traductions/zeng-jixin/": "/zeng-jixin/",
    "/pricing": "/tarifs/",
  },
});
