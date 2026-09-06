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
  },

  // Redirects
  redirects: {
    "/traductions/zeng-jixin/": "/zeng-jixin/",
    "/pricing": "/tarifs/",
  },
});
