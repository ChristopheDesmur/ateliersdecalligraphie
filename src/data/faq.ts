import fs from "node:fs";
import yaml from "js-yaml";
import { prices, netHeureDomicile } from "./prices";
import { contact } from "./contact";
import { venues, formatTimeCompact, formatTimeCompactShort } from "./venues";

export interface FaqEntry {
  category: string;
  question: string;
  answer: string;
  order?: number;
  show_on_home?: boolean;
  home_question?: string;
  home_answer?: string;
}

export interface FaqItem extends FaqEntry {
  id: string;
}

export interface FaqCategoryGroup {
  category: string;
  items: FaqItem[];
}

export function resolveFaqPlaceholders(text: string): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    switch (key) {
      case "prices.cours_collectifs.trimestre":
        return String(prices.cours_collectifs.trimestre);
      case "prices.cours_collectifs.seances":
        return String(prices.cours_collectifs.seances);
      case "prices.cours_individuel_domicile.ttc_heure":
        return String(prices.cours_individuel_domicile.ttc_heure);
      case "prices.cours_individuel_domicile.reduction_impot_pct":
        return String(prices.cours_individuel_domicile.reduction_impot_pct);
      case "prices.cours_individuel_domicile.net_heure":
        return String(netHeureDomicile);
      case "prices.interventions.ht_heure_standard":
        return String(prices.interventions.ht_heure_standard);
      case "prices.interventions.ht_heure_entreprises":
        return String(prices.interventions.ht_heure_entreprises);
      case "contact.coop_a_dom_agrement":
        return String(contact.coop_a_dom_agrement);
      case "contact.mobile":
        return String(contact.mobile);
      case "contact.landline":
        return String(contact.landline);
      case "contact.email":
        return String(contact.email);
      case "venues.dojo.name":
      case "venues.dojo-zen-de-lyon.name":
        return venues["dojo-zen-de-lyon"]?.name || "";
      case "venues.dojo.time_start":
      case "venues.dojo-zen-de-lyon.time_start":
        return venues["dojo-zen-de-lyon"] ? formatTimeCompact(venues["dojo-zen-de-lyon"].time_start) : "";
      case "venues.dojo.time_end":
      case "venues.dojo-zen-de-lyon.time_end":
        return venues["dojo-zen-de-lyon"] ? formatTimeCompact(venues["dojo-zen-de-lyon"].time_end) : "";
      case "venues.miroirs.name":
      case "venues.miroirs-du-ciel.name":
        return venues["miroirs-du-ciel"]?.name || "";
      case "venues.miroirs.time_start":
      case "venues.miroirs-du-ciel.time_start":
        return venues["miroirs-du-ciel"] ? formatTimeCompactShort(venues["miroirs-du-ciel"].time_start) : "";
      case "venues.miroirs.time_end":
      case "venues.miroirs-du-ciel.time_end":
        return venues["miroirs-du-ciel"] ? formatTimeCompactShort(venues["miroirs-du-ciel"].time_end) : "";
      default:
        return match;
    }
  });
}

const raw = yaml.load(
  fs.readFileSync("./src/data/faq.yaml", "utf8")
) as Record<string, FaqEntry>;

export const rawFaqs: Record<string, FaqEntry> = raw || {};

export const faqs: FaqItem[] = Object.entries(rawFaqs).map(([id, item]) => ({
  id,
  ...item,
  question: resolveFaqPlaceholders(item.question),
  answer: resolveFaqPlaceholders(item.answer),
  home_question: item.home_question ? resolveFaqPlaceholders(item.home_question) : undefined,
  home_answer: item.home_answer ? resolveFaqPlaceholders(item.home_answer) : undefined,
}));

export function getFaqCategories(items: FaqItem[] = faqs): FaqCategoryGroup[] {
  const groups: Record<string, FaqItem[]> = {};
  const categoryOrder: string[] = [];

  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = [];
      categoryOrder.push(item.category);
    }
    groups[item.category].push(item);
  }

  for (const cat of categoryOrder) {
    groups[cat].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  return categoryOrder.map((cat) => ({
    category: cat,
    items: groups[cat],
  }));
}

export const faqCategories = getFaqCategories();
export const allQuestions = faqCategories.flatMap((cat) => cat.items);

export const homeFaqs = faqs
  .filter((f) => f.show_on_home)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .map((f) => ({
    question: f.home_question || f.question,
    answer: f.home_answer || f.answer,
  }));

export function createFaqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

export const faqSchema = createFaqSchema(allQuestions);
export const homeFaqSchema = createFaqSchema(homeFaqs);
