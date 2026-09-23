# Ateliers de Calligraphie Chinoise — Lyon

Site officiel et espace de présentation des cours, ateliers, interventions et œuvres de **Christophe Desmur**, calligraphe et enseignant à Lyon.

- Site public : [https://ateliersdecalligraphie.com](https://ateliersdecalligraphie.com)

---

## Présentation

- **Enseignement & Pratique** : Cours collectifs réguliers (Dojo Zen de Lyon, Miroirs du Ciel), cours individuels à domicile (service à la personne agréé), stages et ateliers d'initiation.
- **Interventions pédagogiques & culturelles** : Modules adaptés aux écoles primaires, collèges, lycées, universités, grandes écoles, comités d'entreprise et résidences seniors (EHPAD).
- **Galerie en ligne** : Exposition et vente d'œuvres calligraphiques originales montées sur soie ou encadrées.
- **Ressources & Traductions** : Guides techniques (matériel, tracé fondamental *Yong*), histoire de la voie du pinceau (*Shodo*), traductions d'œuvres littéraires chinoises (Lu Yin, Zeng Jixin).

---

## Stack technique

- **Framework** : [Astro 5](https://astro.build/) (mode hybride / SSR avec adaptateur `@astrojs/vercel`)
- **Styles** : [Tailwind CSS v4](https://tailwindcss.com/) avec plugin `@tailwindcss/typography` et polices éditoriales (Cormorant Garamond)
- **Gestion des contenus** : Collections Astro (blog) et sources de données YAML (`src/data/*.yaml`)
- **Espace d'administration** : Interface de gestion intégrée (`/admin/`) pour les tarifs, institutions, interventions, avis et pages
- **Optimisations** : `@astrojs/sitemap`, `@astrojs/mdx`, `@vercel/analytics`, `@vercel/speed-insights`, optimisation d'images avec `sharp`

---

## Commandes

### Installation des dépendances

```bash
pnpm install
# ou
npm install
```

### Développement local

```bash
pnpm dev
# ou
npm run dev
```

Le serveur de développement est accessible sur `http://localhost:4321`.

### Build de production

```bash
pnpm build
# ou
npm run build
```

Compile les pages statiques dans `dist/client/` et génère les fonctions serverless Vercel dans `.vercel/output/`.

### Prévisualisation du build

```bash
pnpm preview
# ou
npm run preview
```

---

## Structure du projet

```text
/
├── public/                 # Médias statiques (œuvres, photographies, favicons, robots.txt)
├── src/
│   ├── components/         # Composants Astro réutilisables (navigation, pied de page, sections éditoriales)
│   │   ├── admin/          # Composants de l'interface d'administration
│   │   ├── editorial/      # Blocs éditoriaux et cartouches d'information
│   │   ├── gallery/        # Composants de la galerie d'œuvres
│   │   ├── home/           # Sections spécifiques à la page d'accueil
│   │   └── navbar/         # Navigation principale accessible et responsive
│   ├── content/            # Collections de contenu Astro (blog, ateliers)
│   ├── data/               # Données structurées YAML et accesseurs TypeScript
│   ├── layouts/            # Gabarit principal (Layout.astro) et métadonnées SEO
│   ├── lib/                # Logique métier et authentification
│   ├── pages/              # Routes publiques et API serverless (/api/admin)
│   └── styles/             # Styles globaux (global.css)
└── package.json
```
