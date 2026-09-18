# UX System Design — ateliersdecalligraphie.com

## 1. Purpose

This document defines a lightweight UX and interface system for **ateliersdecalligraphie.com**, a site presenting Christophe Desmur's Chinese calligraphy classes, workshops, interventions, and original works in Lyon.

The goal is to make the site easier to understand, easier to navigate, and easier to act on without changing its editorial identity.

The current homepage already exposes four major offers — collective workshops, individual lessons, interventions, and works for sale — plus explanatory content, FAQs, teacher information, and practical details. The main UX opportunity is to make these paths more explicit and reduce competition between them. 

## 2. Primary UX principle

**Every page should answer three questions quickly:**

1. What is this?
2. Is it for me?
3. What do I do next?

Avoid making visitors reconstruct the offer from several sections.

## 3. Primary audiences

### A. Individual beginner

Needs:
- understand what a first session is like
- know whether previous Chinese knowledge is required
- know where and when sessions happen
- know the price
- know what equipment is provided
- contact or book easily

Primary action:
**Essayer un atelier**

### B. Returning or experienced practitioner

Needs:
- schedule
- locations
- formats
- individual lessons
- practice-related content

Primary action:
**Voir les cours**

### C. Organisation / institution

Examples:
- schools
- companies
- associations
- retirement homes

Needs:
- suitable audience
- duration and format
- logistics
- equipment
- quote/contact process

Primary action:
**Organiser un atelier**

### D. Buyer of an original work

Needs:
- see the artwork clearly
- understand the character and meaning
- know availability
- understand acquisition / delivery
- contact the artist

Primary action:
**Voir les œuvres**

## 4. Information architecture

Keep the top-level navigation small:

- **Cours**
  - Ateliers collectifs
  - Cours individuels
  - Première séance
  - Tarifs
- **Interventions**
  - Vue d'ensemble
  - Écoles
  - Collèges
  - Lycées
  - Universités
  - CSE
  - Seniors / EHPAD
- **Œuvres**
- **Découvrir**
  - Débuter la calligraphie
  - La voie du pinceau
  - Calligraphie zen
  - FAQ
  - Cours de chinois
  - Traductions
- **À propos**
- **Contact**

Do not expose every subpage as an equal-weight navigation item.

## 5. Homepage structure

Recommended order:

### 5.1 Hero

Headline:

> **Découvrez la calligraphie chinoise à Lyon**

Supporting text:

> Apprenez le geste, le pinceau et les caractères chinois avec Christophe Desmur. Débutants bienvenus.

Primary CTA:
**Essayer un atelier**

Secondary CTA:
**Voir les cours**

Add a compact reassurance row:

`Débutants bienvenus · Enfants & adultes · Matériel fourni · Lyon 4e`

### 5.2 Next session / practical information

Put the most actionable information immediately after the hero:

- next available session
- location
- day
- time
- duration
- price
- availability if known

CTA:
**Réserver / demander une place**

If live availability cannot be provided, use:
**Demander une place**

### 5.3 Choose your path

Use four visually distinct cards:

1. **Ateliers collectifs**
   - Lyon 4e
   - regular practice
   - CTA: Voir les ateliers

2. **Cours individuels**
   - at home
   - personalised progression
   - CTA: Découvrir les cours

3. **Interventions**
   - schools / companies / institutions
   - on-site
   - CTA: Organiser un atelier

4. **Œuvres originales**
   - unique pieces
   - acquisition on request
   - CTA: Voir les œuvres

Keep each card short. Do not repeat long explanatory paragraphs.

### 5.4 What happens in an atelier?

Show the experience as a simple three-step sequence:

1. **Observer**
2. **Prendre le pinceau**
3. **Pratiquer**

Include one strong image of the actual teaching situation.

CTA:
**Découvrir une première séance**

### 5.5 Is it for me?

Use short reassurance statements:

- Aucun prérequis
- Pas besoin de parler chinois
- Débutants bienvenus
- Matériel fourni
- Enfants, adolescents, adultes et seniors

### 5.6 Where and when?

Create a compact location block:

**Dojo Zen de Lyon**
11 rue Dumenge — Lyon 4e
Lundi · 18h30–20h30

**Miroirs du Ciel**
9 rue de Belfort — Lyon 4e
Mercredi · 10h–12h

CTA:
**Voir les horaires et modalités**

Add a map link only where it helps orientation.

### 5.7 About Christophe

Use one portrait, a short biography, and one CTA:

**Découvrir Christophe**

Avoid placing biography before the visitor understands the offer.

### 5.8 Works

Show only a small selection on the homepage.

Each card should contain:
- artwork
- Chinese character
- short French meaning
- availability
- CTA

CTA:
**Voir toutes les œuvres**

### 5.9 FAQ

Keep 4–5 high-intent questions on the homepage:

- Faut-il parler chinois ?
- Les débutants sont-ils acceptés ?
- Le matériel est-il fourni ?
- Où ont lieu les ateliers ?
- Comment réserver une première séance ?

CTA:
**Voir toutes les questions**

### 5.10 Final CTA

End with one clear conversion block:

> **Envie d'essayer la calligraphie chinoise ?**

> Écrivez à Christophe pour poser une question ou réserver une première séance.

Primary CTA:
**Contacter Christophe**

Secondary CTA:
**Voir les cours**

## 6. Conversion model

Avoid multiple competing CTAs with similar wording.

Use a small vocabulary:

| User intent | CTA |
|---|---|
| Beginner | Essayer un atelier |
| Regular student | Voir les cours |
| Organisation | Organiser un atelier |
| Buyer | Voir les œuvres |
| General question | Contacter Christophe |

Use the same CTA labels everywhere.

## 7. Page-level UX

Every commercial/service page should start with:

1. clear page title
2. one-sentence explanation
3. essential facts
4. primary CTA
5. detailed information
6. FAQ
7. related content
8. final CTA

Do not make visitors scroll through philosophy or background content before reaching practical information.

## 8. Course page

A course page should expose these facts above the fold:

- format
- location
- day
- time
- duration
- price
- level
- equipment
- first-session information
- contact / booking action

Recommended structure:

**Ateliers collectifs de calligraphie chinoise**

Short introduction.

**En pratique**
- Lyon 4e
- Monday / Wednesday
- 2 hours
- beginners welcome
- material provided

**Votre première séance**

Explain exactly what happens.

**Tarifs**

Show prices directly rather than requiring another page when possible.

**Questions fréquentes**

Then contact CTA.

## 9. Individual lessons

Make the proposition concrete:

- where
- duration
- price
- tax-credit information if applicable
- what is included
- who it suits
- how to request a lesson

Avoid vague wording such as “sur mesure” without immediately explaining what is actually different.

## 10. Interventions

This section should be designed around the organiser's questions.

Recommended structure:

### For whom?
Schools, companies, associations, institutions, seniors.

### What format?
Duration, group size, location, material.

### What happens?
Short example programme.

### What is included?
Material, preparation, teaching.

### Practical conditions
Location, scheduling, quotation.

### Request an intervention
Simple contact form or direct email CTA.

Use audience-specific landing pages only when their content is materially different.

## 11. Artwork pages

Treat each artwork as a product/editorial object.

Above the fold:

- large image
- title / character
- meaning
- dimensions
- medium
- availability
- price or “price on request”
- acquisition CTA

Below:

- interpretation
- artistic context
- technique
- delivery / collection information

Avoid forcing users to email just to discover basic product information.

## 12. Contact UX

The contact page should reduce friction.

Show:

- email
- phone
- location
- preferred reason for contact

If a form is used, keep it short:

- Name
- Email
- Subject / reason
- Message

Suggested subject options:

- Première séance
- Cours collectif
- Cours individuel
- Intervention
- Œuvre
- Autre question

Do not require account creation.

## 13. Mobile UX

Priorities:

- persistent but unobtrusive primary CTA
- large tap targets
- no dense navigation
- phone/email links
- practical information before long text
- artwork images optimized for mobile
- accordion FAQ
- avoid horizontal scrolling

On mobile, the first screen should communicate:

**Calligraphy + Lyon + beginner-friendly + next action.**

## 14. Visual hierarchy

The visual system should communicate:

- calm
- craft
- paper
- ink
- human teaching
- Chinese calligraphy

Avoid excessive decorative UI.

Use:
- generous whitespace
- strong typographic hierarchy
- restrained borders
- warm paper-like surfaces
- black/ink typography
- one restrained accent colour
- authentic photographs of the teacher, brush, ink and students

The calligraphy itself should remain the visual focus.

## 15. Images

Prioritize real images over decorative stock photography.

Recommended image set:

1. teacher demonstrating a stroke
2. close-up of brush and ink
3. student practising
4. workshop atmosphere
5. finished artwork
6. teacher portrait
7. each physical location

Every important image should have meaningful alt text.

Avoid repeating the same image for multiple sections.

## 16. Accessibility

Target WCAG 2.2 AA.

Requirements:

- keyboard navigation
- visible focus states
- sufficient text contrast
- semantic headings
- labelled form fields
- meaningful link text
- alt text for informative images
- no information conveyed by colour alone
- reduced-motion support
- accessible mobile navigation
- FAQ accordions usable with keyboard and screen readers

Do not use Chinese characters as the sole navigation label.

## 17. Content design

Use short, concrete sentences.

Prefer:

> Débutants bienvenus. Le matériel est fourni.

Over:

> Notre approche est particulièrement adaptée aux personnes souhaitant découvrir cette discipline dans un cadre accessible et progressif.

Put facts before philosophy.

Use progressive disclosure for cultural or historical material.

## 18. Search and findability

The site contains a large amount of useful editorial material. Separate:

**Action-oriented content**
- courses
- workshops
- interventions
- prices
- contact
- artworks

from:

**Learning / cultural content**
- shodo
- zen
- Chinese characters
- translations
- guides

This prevents informational articles from competing with conversion pages.

## 19. Internal linking

Every informational page should lead to one relevant next step.

Examples:

- Guide débutant → Première séance
- Calligraphie zen → Ateliers
- Shodo → Cours
- FAQ → Contact
- Artwork → Contact
- Intervention article → Organiser un atelier

Avoid generic “En savoir plus” links when a more specific action is possible.

## 20. Trust signals

Make concrete evidence easy to find:

- teacher identity
- teaching experience / qualifications
- real locations
- real photographs
- testimonials if available and authentic
- practical details
- transparent pricing
- clear contact information

Do not add invented testimonials, ratings, credentials, or claims.

## 21. Performance

Keep the experience lightweight.

Priorities:

- responsive images
- modern image formats
- lazy-load below-the-fold images
- avoid unnecessary JavaScript
- minimize third-party scripts
- reserve image dimensions to avoid layout shift
- preload only genuinely critical assets

## 22. SEO and UX alignment

SEO pages should answer a clear user intent.

Examples:

- `/cours-calligraphie-chinoise-lyon`
- `/cours-individuels`
- `/interventions`
- `/oeuvres`
- `/guide-debuter-calligraphie`

Avoid creating many near-duplicate pages with minimal content differences.

Use descriptive titles and meta descriptions, but optimize primarily for human comprehension.

## 23. Analytics events

Measure meaningful actions rather than page views alone.

Recommended events:

- `click_try_workshop`
- `click_courses`
- `click_individual_lessons`
- `click_intervention`
- `click_artworks`
- `click_email`
- `click_phone`
- `click_first_session`
- `click_location`
- `submit_contact`

Track CTA performance by page and device.

## 24. UX priorities

### P0 — Clarify the primary journey

- Make “Essayer un atelier” the primary beginner action.
- Put practical course information earlier.
- Standardise CTA labels.
- Reduce competing calls to action.

### P1 — Improve information architecture

- Simplify top navigation.
- Separate courses, interventions, artworks and cultural content.
- Make important practical pages easier to reach.

### P1 — Improve course discovery

- Surface schedule, location, price and first-session information.
- Create a clear course landing page.
- Add explicit “what happens during the first session” content.

### P2 — Improve artwork experience

- Larger artwork imagery.
- Consistent metadata.
- Clear availability and acquisition process.

### P2 — Improve mobile conversion

- simplify navigation
- make phone/email actionable
- improve tap targets
- keep key information above long-form content

### P3 — Measurement

- add conversion events
- review analytics after implementation
- test CTA wording and placement using real behaviour

## 25. Acceptance criteria

The redesign is successful when a first-time visitor can answer all of these without searching extensively:

- What is offered?
- Is it suitable for a beginner?
- Where does it happen?
- When does it happen?
- How much does it cost?
- What do I need to bring?
- What happens during the first session?
- How do I contact or book?

A visitor interested in an intervention should likewise be able to determine:

- whether their organisation is eligible
- what type of workshop is available
- what is provided
- how to request a proposal

A visitor interested in an artwork should be able to determine:

- what the work represents
- whether it is available
- how to ask about acquisition
- how collection or delivery works

## 26. Implementation rule

Do not redesign everything at once.

Implement in this order:

1. information architecture
2. homepage hierarchy
3. course page
4. first-session flow
5. contact flow
6. intervention pages
7. artwork pages
8. mobile refinements
9. accessibility audit
10. analytics and iteration

Preserve existing content that is valuable. Change its hierarchy and presentation before rewriting it extensively.

---

## Current-site UX observations

The current homepage already contains substantial practical information: beginner accessibility, two Lyon 4e locations, schedules, FAQs, contact details, several course formats, interventions and artworks. citeturn0view0

The main structural issue is therefore not lack of content. It is **content hierarchy**: the homepage currently moves between courses, philosophy, a zafu cross-link, audiences, teacher biography, artworks, FAQ and practical information. A more task-oriented sequence can help visitors reach the appropriate next action faster. citeturn0view0

The current navigation also exposes many intervention subcategories and cultural resources. These are valuable, but they compete visually with the primary “try a course / see courses” journey. citeturn0view0

The redesign should therefore be evolutionary rather than a complete visual reset.
