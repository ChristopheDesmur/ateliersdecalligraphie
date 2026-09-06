import fs from "node:fs";
import yaml from "js-yaml";

interface Prices {
  cours_collectifs: {
    trimestre: number;
    seances: number;
  };
  cours_individuel_domicile: {
    ttc_heure: number;
    reduction_impot_pct: number;
  };
  interventions: {
    ht_heure_standard: number;
    ht_heure_entreprises: number;
  };
}

export const prices = yaml.load(
  fs.readFileSync("./src/data/prices.yaml", "utf8")
) as Prices;

export const netHeureDomicile = Math.round(
  prices.cours_individuel_domicile.ttc_heure *
    (1 - prices.cours_individuel_domicile.reduction_impot_pct / 100)
);
