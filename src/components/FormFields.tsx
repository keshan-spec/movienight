"use client";

import { PEOPLE, SCALE, formatRating } from "@/lib/people";

export function DateField({ value }: { value?: string | null }) {
  return (
    <label className="field">
      <span className="field-label">Watched on</span>
      <input
        className="input"
        type="date"
        name="watched_on"
        defaultValue={value ?? new Date().toISOString().slice(0, 10)}
      />
    </label>
  );
}

export function PickerField({ value }: { value?: "a" | "b" | null }) {
  return (
    <label className="field">
      <span className="field-label">Whose pick was it?</span>
      <select className="select" name="picked_by" defaultValue={value ?? ""}>
        <option value="">Not recorded</option>
        {PEOPLE.map((person) => (
          <option key={person.key} value={person.key}>
            {person.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RatingFields({
  ratingA,
  ratingB,
}: {
  ratingA?: number | null;
  ratingB?: number | null;
}) {
  const defaults = { a: ratingA, b: ratingB };

  return (
    <div className="field-row">
      {PEOPLE.map((person) => (
        <label className="field" key={person.key}>
          <span className="field-label" style={{ color: person.colour }}>
            {person.name}
          </span>
          <select
            className="select"
            name={`rating_${person.key}`}
            defaultValue={defaults[person.key] != null ? String(defaults[person.key]) : ""}
          >
            <option value="">Not yet</option>
            {SCALE.map((value) => (
              <option key={value} value={value}>
                {formatRating(value)}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export function NoteField({ value }: { value?: string | null }) {
  return (
    <label className="field">
      <span className="field-label">Note</span>
      <textarea
        className="input"
        name="note"
        rows={2}
        maxLength={300}
        defaultValue={value ?? ""}
        placeholder="One line you'll want to remember"
      />
    </label>
  );
}
