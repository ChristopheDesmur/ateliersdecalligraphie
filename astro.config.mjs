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
  adapter: vercel(),
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
