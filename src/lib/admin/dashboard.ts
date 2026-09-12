import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";

export interface SummaryMetric {
  id: string;
  label: string;
  count: number;
  href: string;
  hint?: string;
  badge?: {
    text: string;
    variant?: "success" | "warning" | "info" | "muted";
  };
}

export interface PendingItem {
  id: string;
  title: string;
  count: number;
  description: string;
  href: string;
  severity: "warning" | "info" | "neutral";
  actionLabel: string;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  type: string;
  date: string;
  details?: string;
  href: string;
  status?: string;
  statusVariant?: "success" | "warning" | "muted" | "info";
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  isPrimary?: boolean;
}

export interface ContentSummaryBreakdown {
  label: string;
  count: number;
  badgeVariant?: "success" | "warning" | "muted" | "info";
}

export interface ContentSummaryRow {
  id: string;
  label: string;
  total: number;
  breakdown: ContentSummaryBreakdown[];
  href: string;
}

export interface SystemHealthItem {
  id: string;
  label: string;
  status: "ok" | "warning" | "info";
  value: string;
  href?: string;
  action?: string;
}

export interface DashboardData {
  summaryMetrics: SummaryMetric[];
  pendingItems: PendingItem[];
  recentActivity: RecentActivityItem[];
  quickActions: QuickAction[];
  contentSummary: ContentSummaryRow[];
  systemHealth: SystemHealthItem[];
  entitiesPresent: string[];
}

function resolveFilePath(candidates: string[]): string | null {
  for (const c of candidates) {
    const full = path.join(process.cwd(), c);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function parseYamlFile(filePath: string): any {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return parseDocument(raw).toJS();
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return dateStr;
  const [, year, month, day] = match;
  const months = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc."
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthLabel = months[mIndex] || month;
  return `${parseInt(day, 10)} ${monthLabel} ${year}`;
}

export function getDashboardData(): DashboardData {
  const summaryMetrics: SummaryMetric[] = [];
  const pendingItems: PendingItem[] = [];
  const recentActivity: RecentActivityItem[] = [];
  const quickActions: QuickAction[] = [];
  const contentSummary: ContentSummaryRow[] = [];
  const systemHealth: SystemHealthItem[] = [];
  const entitiesPresent: string[] = [];

  const now = Date.now();

  // 1. Events entity inspection
  const eventsFile = resolveFilePath([
    "src/content/ateliers.yaml",
    "src/content/events.yaml",
    "src/data/events.yaml",
    "src/data/ateliers.yaml",
  ]);

  if (eventsFile) {
    entitiesPresent.push("events");
    const data = parseYamlFile(eventsFile);
    if (data && typeof data === "object") {
      let total = 0;
      let upcoming = 0;
      let past = 0;
      let missingDetails = 0;
      const parsedEvents: Array<{
        titre: string;
        from: string;
        to: string;
        lieu: string;
        details?: string;
        timestamp: number;
        isUpcoming: boolean;
      }> = [];

      for (const [yearStr, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
          for (const ev of items) {
            if (!ev || typeof ev !== "object") continue;
            total++;
            const toTime = new Date(String(ev.to || "").replace(" ", "T")).getTime();
            const fromTime = new Date(String(ev.from || "").replace(" ", "T")).getTime();
            const isUpcoming = !Number.isNaN(toTime)
              ? toTime >= now
              : parseInt(yearStr, 10) >= new Date().getFullYear();

            if (isUpcoming) upcoming++;
            else past++;

            if (!ev.details || !String(ev.details).trim()) {
              missingDetails++;
            }

            parsedEvents.push({
              titre: String(ev.titre || "Sans titre"),
              from: String(ev.from || ""),
              to: String(ev.to || ""),
              lieu: String(ev.lieu || "").replace(/^@institution:/, "").replace(/-/g, " "),
              details: ev.details ? String(ev.details) : undefined,
              timestamp: Number.isNaN(fromTime) ? 0 : fromTime,
              isUpcoming,
            });
          }
        }
      }

      summaryMetrics.push({
        id: "events",
        label: "Cours",
        count: total,
        href: "/admin/events",
        hint: upcoming > 0 ? `${upcoming} à venir` : `${total} enregistrés`,
        badge: upcoming > 0 ? { text: `${upcoming} à venir`, variant: "success" } : undefined,
      });

      contentSummary.push({
        id: "events",
        label: "Cours",
        total,
        breakdown: [
          { label: "À venir", count: upcoming, badgeVariant: "success" },
          { label: "Passés", count: past, badgeVariant: "muted" },
        ],
        href: "/admin/events",
      });

      if (upcoming > 0) {
        pendingItems.push({
          id: "events-upcoming",
          title: "Cours programmés",
          count: upcoming,
          description: `${upcoming} séance${upcoming > 1 ? "s" : ""} ou atelier${upcoming > 1 ? "s" : ""} planifié${upcoming > 1 ? "s" : ""} dans l'agenda.`,
          href: "/admin/events",
          severity: "info",
          actionLabel: "Voir le calendrier",
        });
      }

      if (missingDetails > 0) {
        pendingItems.push({
          id: "events-details",
          title: "Cours sans descriptif",
          count: missingDetails,
          description: `${missingDetails} cours sans détails complémentaires.`,
          href: "/admin/events",
          severity: "neutral",
          actionLabel: "Compléter",
        });
      }

      // Add to recent activity: upcoming events first, then latest past events
      const upcomingList = parsedEvents.filter((e) => e.isUpcoming).sort((a, b) => a.timestamp - b.timestamp);
      const pastList = parsedEvents.filter((e) => !e.isUpcoming).sort((a, b) => b.timestamp - a.timestamp);
      const topEvents = [...upcomingList, ...pastList].slice(0, 5);

      for (const ev of topEvents) {
        recentActivity.push({
          id: `ev-${ev.timestamp}-${ev.titre}`,
          title: ev.titre,
          type: "Cours",
          date: formatDate(ev.from),
          details: ev.lieu ? (ev.lieu.length > 50 ? ev.lieu.slice(0, 47) + "…" : ev.lieu) : undefined,
          href: "/admin/events",
          status: ev.isUpcoming ? "À venir" : "Passé",
          statusVariant: ev.isUpcoming ? "success" : "muted",
        });
      }

      quickActions.push({
        id: "add-event",
        label: "+ Ajouter un événement",
        description: "Planifier une nouvelle séance, stage ou atelier",
        href: "/admin/events",
        isPrimary: true,
      });
    }
  }

  // 2. Products / Galerie inspection
  const productsFile = resolveFilePath([
    "src/data/products.yaml",
    "src/data/shop.yaml",
    "src/content/products.yaml",
  ]);

  if (productsFile) {
    entitiesPresent.push("products");
    const data = parseYamlFile(productsFile);
    if (Array.isArray(data)) {
      const total = data.length;
      let available = 0;
      let sold = 0;
      const categories = new Set<string>();

      for (const p of data) {
        if (!p) continue;
        if (p.availability === "Disponible") available++;
        else if (p.availability === "Vendue") sold++;
        if (p.category) categories.add(String(p.category));
      }

      summaryMetrics.push({
        id: "products",
        label: "Galerie",
        count: total,
        href: "/admin/products",
        hint: `${available} disponibles`,
        badge: sold > 0 ? { text: `${sold} vendue${sold > 1 ? "s" : ""}`, variant: "warning" } : undefined,
      });

      contentSummary.push({
        id: "products",
        label: "Galerie & Calligraphies",
        total,
        breakdown: [
          { label: "Disponibles", count: available, badgeVariant: "success" },
          { label: "Vendues", count: sold, badgeVariant: "warning" },
        ],
        href: "/admin/products",
      });

      if (sold > 0) {
        pendingItems.push({
          id: "products-sold",
          title: "Œuvres vendues",
          count: sold,
          description: `${sold} calligraphie${sold > 1 ? "s" : ""} marquée${sold > 1 ? "s" : ""} comme vendue${sold > 1 ? "s" : ""} dans la galerie publique.`,
          href: "/admin/products",
          severity: "warning",
          actionLabel: "Gérer les pièces",
        });
      }

      quickActions.push({
        id: "add-product",
        label: "+ Ajouter une œuvre",
        description: "Mettre en ligne une calligraphie originale",
        href: "/admin/products",
      });
    }
  }

  // 3. Organismes inspection
  const institutionsFile = resolveFilePath([
    "src/data/institutions.yaml",
    "src/content/institutions.yaml",
  ]);

  if (institutionsFile) {
    entitiesPresent.push("institutions");
    const data = parseYamlFile(institutionsFile);
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      const total = keys.length;
      let withDocs = 0;
      for (const k of keys) {
        if (data[k]?.documents && Object.keys(data[k].documents).length > 0) {
          withDocs++;
        }
      }

      summaryMetrics.push({
        id: "institutions",
        label: "Organismes",
        count: total,
        href: "/admin/institutions",
        hint: `${withDocs} avec document`,
      });

      contentSummary.push({
        id: "institutions",
        label: "Organismes partenaires",
        total,
        breakdown: [
          { label: "Partenaires référencés", count: total, badgeVariant: "info" },
          { label: "Avec documents liés", count: withDocs, badgeVariant: "muted" },
        ],
        href: "/admin/institutions",
      });

      quickActions.push({
        id: "add-institution",
        label: "+ Ajouter une institution",
        description: "Référencer un organisme ou établissement partenaire",
        href: "/admin/institutions",
      });
    }
  }

  // 4. FAQ inspection
  const faqFile = resolveFilePath([
    "src/data/faq.yaml",
    "src/content/faq.yaml",
  ]);

  if (faqFile) {
    entitiesPresent.push("faq");
    const data = parseYamlFile(faqFile);
    if (data && typeof data === "object") {
      const items = Object.values(data) as any[];
      const total = items.length;
      const homeCount = items.filter((q) => Boolean(q?.show_on_home)).length;
      const categories = new Set(items.map((q) => q?.category).filter(Boolean));

      summaryMetrics.push({
        id: "faq",
        label: "FAQ",
        count: total,
        href: "/admin/faq",
        hint: `${homeCount} en accueil`,
        badge: { text: `${homeCount} accueil`, variant: "info" },
      });

      contentSummary.push({
        id: "faq",
        label: "Questions fréquentes",
        total,
        breakdown: [
          { label: "Accueil", count: homeCount, badgeVariant: "info" },
          { label: "Rubrique FAQ", count: total - homeCount, badgeVariant: "muted" },
        ],
        href: "/admin/faq",
      });

      quickActions.push({
        id: "add-faq",
        label: "+ Ajouter une question FAQ",
        description: "Rédiger une nouvelle question-réponse",
        href: "/admin/faq",
      });
    }
  }

  // 5. Venues inspection
  const venuesFile = resolveFilePath([
    "src/data/venues.yaml",
    "src/content/venues.yaml",
  ]);

  if (venuesFile) {
    entitiesPresent.push("venues");
    const data = parseYamlFile(venuesFile);
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      const total = keys.length;

      summaryMetrics.push({
        id: "venues",
        label: "Lieux de cours",
        count: total,
        href: "/admin/venues",
        hint: `${total} adresses actives`,
      });

      contentSummary.push({
        id: "venues",
        label: "Lieux hebdomadaires",
        total,
        breakdown: keys.map((k) => ({
          label: String(data[k]?.name || k),
          count: 1,
          badgeVariant: "info",
        })),
        href: "/admin/venues",
      });
    }
  }

  // 6. Testimonials inspection
  const testimonialsFile = resolveFilePath([
    "src/data/testimonials.yaml",
    "src/content/testimonials.yaml",
  ]);

  if (testimonialsFile) {
    entitiesPresent.push("testimonials");
    const data = parseYamlFile(testimonialsFile);
    if (data && typeof data === "object") {
      const entries = Object.entries(data) as Array<[string, any]>;
      const total = entries.length;

      summaryMetrics.push({
        id: "testimonials",
        label: "Témoignages",
        count: total,
        href: "/admin/testimonials",
        hint: `${total} avis & références`,
      });

      contentSummary.push({
        id: "testimonials",
        label: "Témoignages & Presse",
        total,
        breakdown: [
          { label: "Retours d'expérience", count: total, badgeVariant: "info" },
        ],
        href: "/admin/testimonials",
      });

      for (const [id, t] of entries.slice(0, 3)) {
        if (!t) continue;
        recentActivity.push({
          id: `testim-${id}`,
          title: String(t.author || id),
          type: "Témoignage",
          date: t.date ? formatDate(String(t.date)) : (t.badge ? String(t.badge) : "Témoignage"),
          details: t.role ? String(t.role) : (t.source ? String(t.source) : undefined),
          href: "/admin/testimonials",
          status: "Publié",
          statusVariant: "info",
        });
      }
    }
  }

  // 7. Formats inspection
  const interventionsFile = resolveFilePath([
    "src/data/interventions.yaml",
    "src/content/interventions.yaml",
  ]);

  if (interventionsFile) {
    entitiesPresent.push("interventions");
    const data = parseYamlFile(interventionsFile);
    if (data && typeof data === "object") {
      const total = Object.keys(data).length;
      contentSummary.push({
        id: "interventions",
        label: "Formats",
        total,
        breakdown: [
          { label: "Publics ciblés", count: total, badgeVariant: "info" },
        ],
        href: "/admin/interventions",
      });
    }
  }

  // 8. Prices inspection
  const pricesFile = resolveFilePath([
    "src/data/prices.yaml",
  ]);

  if (pricesFile) {
    entitiesPresent.push("prices");
    quickActions.push({
      id: "edit-prices",
      label: "Modifier les tarifs",
      description: "Ajuster la grille des cours collectifs et interventions",
      href: "/admin/prices",
    });
  }

  // 9. En-tête inspection
  const heroFile = resolveFilePath([
    "src/data/hero.yaml",
  ]);

  if (heroFile) {
    entitiesPresent.push("hero");
    quickActions.push({
      id: "edit-hero",
      label: "Modifier l'En-tête d'accueil",
      description: "Titre principal, accroche et visuel en page d'accueil",
      href: "/admin/hero",
    });
  }

  // 10. Contact inspection
  const contactFile = resolveFilePath([
    "src/data/contact.yaml",
  ]);

  if (contactFile) {
    entitiesPresent.push("contact");
    const data = parseYamlFile(contactFile);
    const required = ["mobile", "landline", "email", "coop_a_dom_agrement"];
    const isComplete = Boolean(data) && required.every((k) => Boolean(data[k]));

    systemHealth.push({
      id: "contact",
      label: "Coordonnées de contact",
      status: isComplete ? "ok" : "warning",
      value: isComplete
        ? "Téléphones, courriel et agrément renseignés"
        : "Certaines coordonnées sont incomplètes",
      href: "/admin/contact",
      action: isComplete ? undefined : "Compléter",
    });
  }

  // 11. System Health / Environment checks
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const hasGitHubToken = Boolean(process.env.GITHUB_TOKEN?.trim());

  systemHealth.push({
    id: "analytics",
    label: "Vercel Web Analytics",
    status: "ok",
    value: "Audience & trafic en direct",
    href: "/admin/analytics",
    action: "Ouvrir",
  });

  systemHealth.push({
    id: "storage",
    label: "Stockage des données",
    status: "ok",
    value: hasGitHubToken
      ? "Versionné Git (Publication GitHub)"
      : (isServerless ? "Astro SSR / Vercel" : "Fichiers YAML locaux (Git)"),
    href: "/admin",
  });

  systemHealth.push({
    id: "engine",
    label: "Moteur d'exécution",
    status: "ok",
    value: isServerless ? "Astro 5 SSR (Vercel Serverless)" : "Astro 5 SSR (Local Node)",
    href: "/admin",
  });

  return {
    summaryMetrics,
    pendingItems,
    recentActivity,
    quickActions: quickActions.slice(0, 6),
    contentSummary,
    systemHealth,
    entitiesPresent,
  };
}
