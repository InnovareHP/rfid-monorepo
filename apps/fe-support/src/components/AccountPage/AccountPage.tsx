export function AccountPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 max-w-[1920px] w-full mx-auto">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Account
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
        <div className="rounded-lg border border-border bg-background p-6 min-h-[200px]">
          <p className="text-sm text-muted-foreground">
            Account content and settings will go here.
          </p>
        </div>
      </div>
    </div>
  );
}
