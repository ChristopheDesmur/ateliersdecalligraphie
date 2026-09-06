import fs from "node:fs";
import yaml from "js-yaml";

export interface Venue {
  name: string;
  address: string;
  district?: string;
  day: string;
  time_start: string;
  time_end: string;
  map_query?: string;
  map_embed?: string;
}

export const venues = yaml.load(
  fs.readFileSync("./src/data/venues.yaml", "utf8")
) as Record<string, Venue>;

/** "18:30" -> "18h30" ; "10:00" -> "10h00". Forme compacte, sans espace. */
export function formatTimeCompact(time: string): string {
  return time.replace(":", "h");
}

/** "18:30" -> "18 h 30" ; "10:00" -> "10 h 00". Forme typographique (espaces insécables). */
export function formatTimeTypographic(time: string): string {
  const [h, m] = time.split(":");
  return `${h} h ${m}`;
}

/** "18:30" -> "18h30" ; "10:00" -> "10h" (minutes nulles omises, par ex. "de 10h a 12h"). */
export function formatTimeCompactShort(time: string): string {
  const [h, m] = time.split(":");
  return m === "00" ? `${h}h` : `${h}h${m}`;
}
