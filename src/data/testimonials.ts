import fs from "node:fs";
import yaml from "js-yaml";

export interface TestimonialEntry {
  quote: string;
  author: string;
  role: string;
  source: string;
  href?: string;
  badge: string;
  linkText?: string;
}

export interface Testimonial extends TestimonialEntry {
  id: string;
}

const raw = yaml.load(
  fs.readFileSync("./src/data/testimonials.yaml", "utf8")
) as Record<string, TestimonialEntry>;

export const testimonials: Testimonial[] = Object.entries(raw).map(([id, t]) => ({ id, ...t }));
