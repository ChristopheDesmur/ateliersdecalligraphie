import fs from "node:fs";
import yaml from "js-yaml";

interface Contact {
  mobile: string;
  landline: string;
  email: string;
  coop_a_dom_agrement: string;
}

export const contact = yaml.load(
  fs.readFileSync("./src/data/contact.yaml", "utf8")
) as Contact;

export function telHref(displayNumber: string): string {
  return "+33" + displayNumber.replace(/\s+/g, "").slice(1);
}
