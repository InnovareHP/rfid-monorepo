import type { SenderIdentity } from "@/services/marketing/sender-service";
import { Button } from "@dashboard/ui/components/button";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DnsRecordsPanelProps = {
  sender: SenderIdentity;
  isVerifying?: boolean;
  onVerify: () => void;
};

function CopyCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
        {value}
      </code>
      <button
        type="button"
        aria-label="Copy value"
        className="shrink-0 text-muted-foreground hover:text-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Copied");
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? (
          <Check className="size-3.5 text-success" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}

export function DnsRecordsPanel({
  sender,
  isVerifying,
  onVerify,
}: DnsRecordsPanelProps) {
  const records = sender.dnsRecords ?? [];

  if (!sender.domain) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-info/30 bg-table-header p-4 text-sm text-foreground">
        Add these {records.length} CNAME records to the DNS for{" "}
        <strong className="font-semibold">{sender.domain}</strong>, then check
        verification. Nothing else is required. Propagation usually takes
        minutes but can take up to 72 hours.
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-table-header text-left text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => (
              <tr key={`${record.type}-${record.name}`} className="align-top">
                <td className="px-4 py-2 font-medium text-foreground">
                  {record.type}
                </td>
                <td className="max-w-[220px] px-4 py-2">
                  <CopyCell value={record.name} />
                </td>
                <td className="max-w-[260px] px-4 py-2">
                  <CopyCell value={record.value} />
                </td>
                <td className="px-4 py-2 text-muted-foreground">{record.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" disabled={isVerifying} onClick={onVerify}>
        {isVerifying && <Loader2 className="size-4 animate-spin" />}
        Check verification
      </Button>
    </div>
  );
}
