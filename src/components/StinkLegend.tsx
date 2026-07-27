"use client";

import { useState } from "react";
import { TIERS } from "@/lib/stink";
import StinkBadge from "./StinkBadge";

const SAMPLE: Record<string, number> = {
  pristine: 9.5,
  fresh: 8,
  whiffy: 6,
  stinks: 4,
  toxic: 1.5,
};

export default function StinkLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="legend">
      <button
        className="legend-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Stink meter
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <ul className="legend-list">
          {TIERS.map((tier) => (
            <li key={tier.key}>
              <StinkBadge score={SAMPLE[tier.key]} showLabel={false} />
              <span className="legend-name" style={{ color: tier.colour }}>
                {tier.label}
              </span>
              <span className="legend-blurb">{tier.blurb}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
