import fs from "node:fs";
import yaml from "js-yaml";

export interface HeroCTA {
  label: string;
  url: string;
}

export interface HeroImage {
  src: string;
  alt?: string;
  caption?: string;
  location?: string;
  width?: number;
  height?: number;
}

export interface HeroData {
  eyebrow: string;
  title: string;
  intro: string;
  primary_cta?: HeroCTA;
  secondary_cta?: HeroCTA;
  image?: HeroImage;
}

export const defaultHero: HeroData = {
  eyebrow: "Calligraphie chinoise · Lyon",
  title: "Découvrez l’art de la calligraphie chinoise",
  intro: "Christophe Desmur vous accompagne dans la découverte du pinceau, du geste et des caractères chinois, à travers des ateliers collectifs et des cours individuels.",
  primary_cta: {
    label: "Découvrir les cours",
    url: "/cours-collectifs",
  },
  secondary_cta: {
    label: "Voir les œuvres disponibles",
    url: "/galerie",
  },
  image: {
    src: "/assets/christophe-desmur-calligraphie-dedicace.webp",
    alt: "Christophe Desmur traçant une calligraphie chinoise au pinceau et à l’encre de Chine à Lyon",
    caption: "Le geste de l’encre & la tenue du pinceau",
    location: "Lyon Croix-Rousse",
    width: 1536,
    height: 1024,
  },
};

export const hero: HeroData = (() => {
  try {
    const raw = fs.readFileSync("./src/data/hero.yaml", "utf8");
    const loaded = yaml.load(raw) as Partial<HeroData> | null;
    if (!loaded || typeof loaded !== "object") return defaultHero;
    return {
      eyebrow: loaded.eyebrow || defaultHero.eyebrow,
      title: loaded.title || defaultHero.title,
      intro: loaded.intro || defaultHero.intro,
      primary_cta: loaded.primary_cta ? { ...defaultHero.primary_cta, ...loaded.primary_cta } : defaultHero.primary_cta,
      secondary_cta: loaded.secondary_cta ? { ...defaultHero.secondary_cta, ...loaded.secondary_cta } : defaultHero.secondary_cta,
      image: loaded.image !== undefined ? (loaded.image?.src ? { ...defaultHero.image, ...loaded.image } : undefined) : defaultHero.image,
    };
  } catch {
    return defaultHero;
  }
})();
