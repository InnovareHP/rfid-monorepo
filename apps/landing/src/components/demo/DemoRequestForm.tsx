import { CalendarClock } from "lucide-react";
import { useState } from "react";
import type { DemoRequestPayload } from "./demo-api";
import {
  demoRequestSchema,
  firstErrors,
  type DemoFieldErrors,
  type DemoRequestValues,
} from "./demo-schema";

const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 aria-[invalid=true]:border-destructive";

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
  const [errors, setErrors] = useState<DemoFieldErrors>({});

  const set =
    (key: keyof typeof values) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
      // Clearing on change rather than re-validating: the message goes as soon
      // as they start fixing it.
      setErrors((current) =>
        current[key as keyof DemoRequestValues]
          ? { ...current, [key]: undefined }
          : current
      );
    };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = demoRequestSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error));
      return;
    }

    setErrors({});
    // Empty optionals are dropped so the API stores nothing rather than "".
    onSubmit(
      Object.fromEntries(
        Object.entries(parsed.data).filter(([, value]) => value !== "")
      ) as DemoRequestPayload
    );
  };

  const fieldError = (key: keyof DemoRequestValues) =>
    errors[key] ? (
      <span className="text-xs font-normal text-destructive">
        {errors[key]}
      </span>
    ) : null;

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
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
            className={FIELD}
            placeholder="Jordan Reyes"
            aria-invalid={Boolean(errors.name)}
            value={values.name}
            onChange={set("name")}
            autoComplete="name"
          />
          {fieldError("name")}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Work email</span>
          <input
            type="email"
            className={FIELD}
            placeholder="jordan@yourclinic.com"
            aria-invalid={Boolean(errors.email)}
            value={values.email}
            onChange={set("email")}
            autoComplete="email"
          />
          {fieldError("email")}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">
            Organization
            <span className="ml-1 font-normal text-muted-foreground">
              optional
            </span>
          </span>
          <input
            className={FIELD}
            placeholder="Reyes Care Group"
            aria-invalid={Boolean(errors.company)}
            value={values.company}
            onChange={set("company")}
            autoComplete="organization"
          />
          {fieldError("company")}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">
            Phone
            <span className="ml-1 font-normal text-muted-foreground">
              optional
            </span>
          </span>
          <input
            type="tel"
            className={FIELD}
            placeholder="(555) 012-3456"
            aria-invalid={Boolean(errors.phone)}
            value={values.phone}
            onChange={set("phone")}
            autoComplete="tel"
          />
          {fieldError("phone")}
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
            placeholder="We track referrals from twelve hospitals in a spreadsheet and lose the handoff between liaisons. Show us how that looks in one board."
            aria-invalid={Boolean(errors.notes)}
            value={values.notes}
            onChange={set("notes")}
          />
          {fieldError("notes")}
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
