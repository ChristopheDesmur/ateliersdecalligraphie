# Design direction — ateliersdecalligraphie.com

## Positioning

**Goal:** make the site feel like the website of a calligrapher and teacher, not a generic activity catalogue.

The current site already has strong content: Chinese calligraphy in Lyon, collective workshops, individual lessons, interventions, original works, and Christophe Desmur's profile. The redesign should make those offers easier to scan while giving the visual identity more space to breathe.

## Design concept

### "Ink, paper, gesture"

A restrained editorial design inspired by:

- black Chinese ink on warm paper
- white space and deliberate rhythm
- brush movement rather than decorative "Asian" motifs
- traditional craft without looking folkloric
- contemporary gallery/editorial typography
- photography of the actual practice, rather than stock imagery

Avoid:
- generic red/gold Chinese visual codes
- excessive zen imagery
- decorative kanji used as ornaments
- gradients
- card-heavy SaaS aesthetics
- excessive rounded corners
- visual noise

## Colour system

Use a very restrained palette:

- **Paper:** `#F7F4EC`
- **Ink:** `#171717`
- **Soft ink:** `#5E5A52`
- **Warm grey:** `#D8D3C8`
- **Accent vermilion:** `#9D2B20`

The vermilion should be used sparingly: active navigation, small markers, selected states, or one important CTA. It should never become the dominant colour.

## Typography

Keep the site's existing primary font choices unless the implementation already has a deliberate typographic system.

Create hierarchy mainly through:

- large editorial headings
- generous line-height
- short text blocks
- restrained uppercase metadata
- Chinese characters displayed large where they are meaningful

Do not use decorative Asian fonts.

## Homepage structure

### 1. Hero

Full-width editorial hero.

Left:
- small eyebrow: `CALLIGRAPHIE CHINOISE · LYON`
- H1: `Découvrez l’art de la calligraphie chinoise`
- short introduction
- primary CTA: `Découvrir les cours`
- secondary CTA: `Voir les œuvres`

Right:
- large authentic photograph of Christophe writing with brush and ink

Below the hero image/text, show a quiet metadata line:

`Débutants bienvenus · Enfants & adultes · Lyon`

The hero should immediately communicate:
**what / where / with whom / how to start.**

### 2. Four paths

Replace the current visually equal card treatment with a more editorial four-row layout.

Each row:

`01  ATELIERS COLLECTIFS`
`Lyon 4e`
short description
`Voir les ateliers →`

Then:

`02  COURS INDIVIDUELS`
`À domicile`
short description
`Découvrir →`

`03  INTERVENTIONS`
`Écoles · entreprises · institutions`
short description
`Organiser une intervention →`

`04  ŒUVRES ORIGINALES`
`Pièces uniques`
short description
`Voir les œuvres →`

Use typography and spacing to differentiate the rows, not four coloured cards.

### 3. The practice

Create a strong visual/editorial section around:

`Plus qu’une écriture, une pratique`

Use the three existing ideas:

- Le geste
- La concentration
- L’expression

Present them horizontally on desktop and vertically on mobile.

Each item should have a small numeric marker and one concise sentence.

Add a large brush/calligraphy detail photograph or artwork crop beside the text.

### 4. Accessibility

Keep this section extremely concise.

Heading:

`Une pratique accessible à tous`

Then:

`Pas besoin de parler chinois pour commencer.`

Four compact benefits:

- Débutants bienvenus
- Geste & attention
- Créativité & expression
- Découverte de la culture chinoise

Avoid turning these into large feature cards.

### 5. Christophe

Make Christophe's portrait and identity a major trust section.

Layout:

Large portrait / practice photograph on one side.

On the other:

`Avec Christophe Desmur`

A concise biography focused on:
- practice
- teaching
- transmission
- individual accompaniment

CTA:

`Découvrir Christophe →`

This section should feel personal and credible rather than corporate.

### 6. Original works

Treat the calligraphies as a small gallery/editorial catalogue.

Do not present them primarily as ecommerce cards.

Use large artwork images with:

- Chinese character
- French meaning
- availability
- `Découvrir →`

Important:

The site does **not** need to imply an instant online purchase.

The acquisition path should remain:

`Voir une œuvre → demander les disponibilités → échanger avec Christophe`

Use a clear explanatory line:

`Chaque œuvre est une pièce unique. Les disponibilités et modalités d'acquisition sont communiquées directement par Christophe.`

CTA:

`Contacter Christophe`

### 7. Practical information

Use a compact two-column section.

Left:
`Questions fréquentes`

Show 3–4 key questions with expandable answers.

Right:
`Ateliers à Lyon`

Show the two current locations as simple editorial entries:

**Dojo Zen de Lyon**
11 rue Dumenge · Lyon 4e
Lundi · 18h30–20h30

**Miroirs du Ciel**
9 rue de Belfort · Lyon 4e
Mercredi · 10h–12h

CTA:
`Voir les horaires et modalités →`

### 8. Final CTA

A quiet full-width paper section.

Heading:

`Envie d’essayer la calligraphie chinoise ?`

Text:

`Écrivez à Christophe pour poser une question, réserver un premier atelier ou discuter d’une œuvre.`

Primary CTA:
`Contacter Christophe`

Secondary:
`Voir les cours`

## Navigation

Simplify the main navigation around user intent:

**Calligraphie**
- Ateliers
- Cours individuels
- Interventions
- Œuvres

**Découvrir**
- La pratique
- Guide pour débuter
- Christophe Desmur
- FAQ

**Contact**

Keep `Essayer un cours` as the persistent primary navigation CTA.

Avoid exposing every specialist audience and secondary content page in the primary navigation.

## Components

Prefer a small number of reusable visual patterns:

- editorial section
- numbered list
- image + text split
- artwork feature
- accordion FAQ
- practical-location block
- CTA

Avoid:
- nested cards
- excessive badges
- repeated "premium" labels
- decorative icon libraries

## Responsive behaviour

### Mobile

The mobile design should feel intentionally composed, not like a collapsed desktop layout.

- Single-column flow
- Hero image immediately visible
- Large readable headings
- No horizontal scrolling
- Four paths become numbered editorial rows
- Artwork images remain large enough to appreciate
- CTAs remain easy to tap
- Location information remains scannable

### Tablet

Use the same editorial system with more generous side margins.

### Desktop

Use a centred content grid with generous margins.

Suggested maximum content width:

`1200px`

Use asymmetry selectively: large image + narrower text column, rather than centred blocks everywhere.

## Motion

Keep animation subtle.

Recommended:
- image reveal on scroll
- slight opacity/translation for section entrances
- understated hover movement on links
- no parallax
- no automatic carousels
- respect `prefers-reduced-motion`

The brush gesture itself should provide the feeling of movement; the interface should remain calm.

## Image direction

Prioritize authentic photographs:

1. Christophe writing
2. close-up of brush, ink and paper
3. finished calligraphies
4. workshop context
5. portrait of Christophe

Use generous crops and natural light.

Avoid:
- stock photos
- stereotypical Chinese decorations
- excessive red
- artificial HDR
- heavy contrast
- over-saturated images

## UX principles

1. **One clear purpose per section.**
2. **Courses before secondary cultural content.**
3. **Christophe is the trust anchor.**
4. **Works are presented as original pieces, not an ecommerce catalogue.**
5. **Contact is the conversion mechanism.**
6. **The visual identity comes from ink, paper, gesture and whitespace.**
7. **Do not repeat the same proposition in multiple sections.**
8. **Prefer editorial hierarchy over cards and badges.**
9. **Keep paragraphs short and scannable.**
10. **Do not make "zen" the primary positioning of the site.**

## Overall visual impression

The finished site should feel:

**quiet · artisanal · precise · contemporary · human · cultured**

rather than:

**commercial · generic · decorative · "Asian-themed" · SaaS-like**

The key visual idea is simple:

> **A contemporary editorial gallery for the practice, teaching and original work of a Chinese calligrapher in Lyon.**
