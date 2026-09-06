import fs from "node:fs";
import yaml from "js-yaml";
import { prices } from "./prices";

export interface Artwork {
  slug: string;
  title: string;
  character: string;
  pinyin?: string;
  frenchMeaning: string;
  category: string;
  style?: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  description: string;
  extendedDescription?: string;
  price: string;
  availability: "Disponible" | "Vendue";
  technique: string;
  medium: string;
  artist: string;
}

interface ProductEntry {
  id: string;
  title: string;
  character: string;
  pinyin?: string;
  frenchMeaning: string;
  category: string;
  style?: string;
  photo: { src: string; width: number; height: number; alt: string };
  description: string;
  extendedDescription?: string;
  price_ref: string;
  availability: "Disponible" | "Vendue";
  technique: string;
  medium: string;
  artist: string;
}

function resolvePriceRef(ref: string): string {
  const value = ref
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], prices);
  if (typeof value !== "string") {
    throw new Error(`price_ref introuvable dans prices.yaml : "${ref}"`);
  }
  return value;
}

const products = yaml.load(
  fs.readFileSync("./src/data/products.yaml", "utf8")
) as ProductEntry[];

export const artworks: Artwork[] = products.map((p) => ({
  slug: p.id,
  title: p.title,
  character: p.character,
  pinyin: p.pinyin,
  frenchMeaning: p.frenchMeaning,
  category: p.category,
  style: p.style,
  src: p.photo.src,
  width: p.photo.width,
  height: p.photo.height,
  alt: p.photo.alt,
  description: p.description,
  extendedDescription: p.extendedDescription,
  price: resolvePriceRef(p.price_ref),
  availability: p.availability,
  technique: p.technique,
  medium: p.medium,
  artist: p.artist,
}));

export function getAllArtworks(): Artwork[] {
  return artworks;
}

export function getArtworkBySlug(slug: string): Artwork | undefined {
  return artworks.find((a) => a.slug === slug);
}
