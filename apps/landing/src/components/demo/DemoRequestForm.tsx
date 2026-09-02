import { CalendarClock } from "lucide-react";
import { useState } from "react";
import type { DemoRequestPayload } from "./demo-api";

const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

// Step one exists on its own so an abandoned calendar still leaves a lead.
export function DemoRequestForm({
  isSubmitting,
  error,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (payload: DemoRequestPayload) => void;
}) {
  // One state object rather than a field each: the landing site carries no form
  // library, and this never leaves this component.
  const [values, setValues] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    teamSize: "",
    notes: "",
    website: "",
  });

  const set = (key: keyof typeof values) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">
          <CalendarClock className="size-3.5" />
          Step 1 of 2
        </p>
        <h2 className="text-lg font-semibold">Tell us who you are</h2>
        <p className="text-sm text-muted-foreground">
          Then pick a time from the calendar on the next step.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            required
            className={FIELD}
            value={values.name}
            onChange={set("name")}
            autoComplete="name"
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Work email</span>
          <input
            required
            type="email"
            className={FIELD}
            value={values.email}
            onChange={set("email")}
            autoComplete="email"
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Organization</span>
          <input
            className={FIELD}
            value={values.company}
            onChange={set("company")}
            autoComplete="organization"
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Phone</span>
          <input
            className={FIELD}
            value={values.phone}
            onChange={set("phone")}
            autoComplete="tel"
          />
        </label>

        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Team size</span>
          <select
            className={FIELD}
            value={values.teamSize}
            onChange={set("teamSize")}
          >
            <option value="">Prefer not to say</option>
            {TEAM_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} people
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">What would you like to see?</span>
          <textarea
            rows={4}
            className={FIELD}
            value={values.notes}
            onChange={set("notes")}
          />
        </label>
      </div>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={values.website}
        onChange={set("website")}
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
      >
        {isSubmitting ? "Checking availability..." : "Pick a time"}
      </button>

      <p className="text-xs text-muted-foreground">
        No patient information is collected on this form.
      </p>
    </form>
  );
}
