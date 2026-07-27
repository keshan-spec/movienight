import { formatRating } from "@/lib/people";
import { stinkTier, type StinkTier } from "@/lib/stink";

function TierIcon({ tier }: { tier: StinkTier["key"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (tier === "pristine") {
    return (
      <svg {...common} className="stink-icon">
        <path d="M12 3.5l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" />
        <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" />
      </svg>
    );
  }

  if (tier === "fresh") {
    return (
      <svg {...common} className="stink-icon">
        <path d="M20 4c0 8.5-5 13-11.5 13H5C5 8.5 11 4 20 4z" fill="currentColor" opacity="0.35" />
        <path d="M20 4c0 8.5-5 13-11.5 13H5C5 8.5 11 4 20 4z" />
        <path d="M4 20c2.5-4.5 6-7.5 10.5-9.5" />
      </svg>
    );
  }

  // Whiffy, stinks and toxic: one wave per step down.
  const rows = tier === "whiffy" ? [12] : tier === "stinks" ? [8.5, 15.5] : [6, 12, 18];

  return (
    <svg {...common} className="stink-icon">
      {rows.map((y) => (
        <path key={y} d={`M3.5 ${y}q2.6-3.2 5.2 0t5.2 0 5.2 0`} />
      ))}
    </svg>
  );
}

export default function StinkBadge({
  score,
  size = "sm",
  showLabel = true,
}: {
  score: number;
  size?: "sm" | "lg";
  showLabel?: boolean;
}) {
  const tier = stinkTier(score);

  return (
    <span
      className="stink"
      data-size={size}
      style={{ color: tier.colour, background: tier.tint, borderColor: tier.colour }}
      title={`Stink meter — ${tier.label}: ${tier.blurb}`}
    >
      <TierIcon tier={tier.key} />
      <span className="stink-score">{formatRating(score)}</span>
      {showLabel ? <span className="stink-word">{tier.label}</span> : null}
    </span>
  );
}
