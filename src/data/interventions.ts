import fs from "node:fs";
import yaml from "js-yaml";
import { prices } from "./prices";

export interface InterventionEntry {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  price_ref: string;
}

export interface Intervention extends InterventionEntry {
  id: string;
  rate: number;
}

function resolvePriceRef(ref: string): number {
  const value = ref
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], prices);
  if (typeof value !== "number") {
    throw new Error(`price_ref introuvable dans prices.yaml : "${ref}"`);
  }
  return value;
}

const raw = yaml.load(
  fs.readFileSync("./src/data/interventions.yaml", "utf8")
) as Record<string, InterventionEntry>;

export const interventions: Intervention[] = Object.entries(raw).map(([id, entry]) => ({
  id,
  ...entry,
  rate: resolvePriceRef(entry.price_ref),
}));
