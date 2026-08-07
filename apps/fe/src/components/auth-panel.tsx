import { cn } from "@dashboard/ui/lib/utils";

// Shared shell for the login and register screens. The two gradients below are
// the fixed brand marketing surface, not themed UI, so they stay literal.
export function AuthPanel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "[--panelw:clamp(26rem,30vw,34rem)] [--gapw:1rem] xl:[--gapw:1.5rem] [--framew:2rem] xl:[--framew:3rem] p-0 lg:p-4 xl:p-6",
        className
      )}
      {...props}
    >
      <div className="flex items-stretch justify-center w-full mx-auto max-w-[96rem] lg:gap-[var(--gapw)] lg:h-[min(calc(100svh-var(--framew)),calc((100vw-var(--panelw)-var(--gapw)-var(--framew))*1.183),64rem)]">
        <div className="hidden lg:block h-full aspect-[1300/1538] shrink-0 overflow-hidden rounded-3xl shadow-xl">
          <img
            src="/login-page/Inner.png"
            alt="See every referral. Track every opportunity."
            className="h-full w-full object-cover"
          />
        </div>

        <div className="w-full lg:w-[var(--panelw)] lg:shrink-0 min-h-svh lg:min-h-0 lg:h-full lg:overflow-y-auto rounded-none lg:rounded-3xl shadow-none lg:shadow-xl bg-gradient-to-b from-blue-900 via-blue-600 to-sky-300 lg:bg-gradient-to-br lg:from-sky-200 lg:via-blue-100 lg:to-blue-200 flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8 lg:gap-6 lg:p-6 xl:p-8">
          <img
            src="/login-page/Refidly%20[Full]%20-%20White%201.png"
            alt="Refidly — See it. Track it. Move it."
            className="w-36 sm:w-44 lg:hidden"
          />
          <div className="w-full max-w-md lg:max-w-none rounded-2xl bg-gradient-to-b from-white to-blue-50 shadow-lg p-6 sm:p-8 lg:p-7 xl:p-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
