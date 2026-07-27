export type StinkTier = {
  key: "pristine" | "fresh" | "whiffy" | "stinks" | "toxic";
  label: string;
  blurb: string;
  min: number;
  colour: string;
  tint: string;
};

/** Ordered high to low — first match wins. */
export const TIERS: StinkTier[] = [
  {
    key: "pristine",
    label: "Pristine",
    blurb: "Not a whiff of stink",
    min: 8.5,
    colour: "#6FD08C",
    tint: "rgba(111, 208, 140, 0.14)",
  },
  {
    key: "fresh",
    label: "Fresh",
    blurb: "Holds up nicely",
    min: 7,
    colour: "#A8CF52",
    tint: "rgba(168, 207, 82, 0.14)",
  },
  {
    key: "whiffy",
    label: "Whiffy",
    blurb: "Something's a bit off",
    min: 5,
    colour: "#E8C547",
    tint: "rgba(232, 197, 71, 0.14)",
  },
  {
    key: "stinks",
    label: "Stinks",
    blurb: "Open a window",
    min: 3,
    colour: "#D98A3F",
    tint: "rgba(217, 138, 63, 0.14)",
  },
  {
    key: "toxic",
    label: "Toxic",
    blurb: "Hold your nose",
    min: 0,
    colour: "#8FA05A",
    tint: "rgba(143, 160, 90, 0.18)",
  },
];

export function stinkTier(score: number): StinkTier {
  return TIERS.find((tier) => score >= tier.min) ?? TIERS[TIERS.length - 1];
}

/** The film's overall score: the mean of whichever ratings exist. */
export function stinkScore(a: number | null, b: number | null): number | null {
  const scores = [a, b].filter((v): v is number => v !== null);
  if (!scores.length) return null;
  return Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 10) / 10;
}
