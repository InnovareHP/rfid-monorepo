export const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-muted p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);
