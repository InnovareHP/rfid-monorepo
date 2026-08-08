import { Button } from "@dashboard/ui/components/button";

const SUPPORT_REQUEST_URL = `${import.meta.env.VITE_SUPPORT_URL}/en/request`;

export function HelpContactSupport() {
  return (
    <section className="rounded-xl bg-brand-surface px-6 py-10 text-center">
      <h2 className="font-display text-2xl font-semibold text-brand sm:text-3xl">
        Can't find what your looking for?
      </h2>
      <p className="mt-2 text-brand-ink">
        Our support team is here to help you.
      </p>
      <Button className="mt-6" asChild>
        <a href={SUPPORT_REQUEST_URL} target="_blank" rel="noreferrer">
          Contact Support
        </a>
      </Button>
    </section>
  );
}
