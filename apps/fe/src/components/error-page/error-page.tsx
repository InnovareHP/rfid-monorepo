import type { ReactNode } from "react";

type ErrorPageProps = {
  code: string;
  title: string;
  description: string;
  artSrc: string;
  artAlt: string;
  action: ReactNode;
  supportPrefix: string;
  supportSuffix: string;
};

// Shared shell for the 404 and 500 screens. The mascot art ships with the
// brand panel baked into the PNG, so this surface uses the theme-independent
// brand tokens rather than themed UI, like auth-panel.tsx.
export const ErrorPage = ({
  code,
  title,
  description,
  artSrc,
  artAlt,
  action,
  supportPrefix,
  supportSuffix,
}: ErrorPageProps) => (
  <div className="flex min-h-svh flex-col items-center justify-center bg-brand-surface px-6 py-10 sm:px-10">
    <div className="flex w-full max-w-[1250px] flex-col items-center gap-8 lg:flex-row lg:gap-10">
      <div className="order-2 w-full min-w-0 lg:order-1 lg:flex-1">
        {/* The wordmark asset is a square canvas; this box crops it to the
            designed 247x67 band, and the percentages scale with the box. */}
        <div className="relative aspect-[247/67] w-[180px] overflow-hidden sm:w-[247px]">
          <img
            src="/branding/Full/Refidly%20[Full]%20-%20Colored%201.png"
            alt="Refidly — See it. Track it. Move it."
            className="absolute left-0 top-[-134.86%] h-[367.89%] w-full max-w-none"
          />
        </div>

        <p className="mt-6 font-display text-[clamp(5.5rem,15vw,200px)] font-bold leading-[1.05] text-brand">
          {code}
        </p>

        <h1 className="font-display text-[clamp(1.75rem,5vw,48px)] font-medium uppercase leading-[1.05] text-brand">
          {title}
        </h1>

        <p className="mt-5 max-w-[558px] text-base leading-[30px] text-brand-ink sm:text-xl">
          {description}
        </p>

        <div className="mt-6">{action}</div>

        <p className="mt-8 text-sm text-brand-ink sm:text-base">
          {supportPrefix}{" "}
          <a
            href="mailto:support@refidly.com"
            className="font-semibold text-brand underline-offset-4 hover:underline"
          >
            Contact support
          </a>{" "}
          {supportSuffix}
        </p>
      </div>

      <div className="order-1 w-full max-w-[420px] lg:order-2 lg:max-w-[560px]">
        <img src={artSrc} alt={artAlt} className="h-auto w-full" />
      </div>
    </div>
  </div>
);
