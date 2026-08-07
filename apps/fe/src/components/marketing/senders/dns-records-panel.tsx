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
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-gray-900">
        {value}
      </code>
      <button
        type="button"
        aria-label="Copy value"
        className="shrink-0 text-gray-400 hover:text-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Copied");
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}

// Managed domains sit in our own zone, so the records are an ops task rather
// than something the customer has to publish.
export function DnsRecordsPanel({
  sender,
  isVerifying,
  onVerify,
}: DnsRecordsPanelProps) {
  const records = sender.dnsRecords ?? [];
  const isManaged = sender.kind === "MANAGED_DOMAIN";

  if (!sender.domain) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-200 bg-[#F4F9FF] p-4 text-sm text-gray-700">
        {isManaged ? (
          <>
            <strong className="font-semibold">{sender.domain}</strong> is a
            subdomain we run. Support publishes these records in our zone — you
            do not need to change any DNS.
          </>
        ) : (
          <>
            Add these records to the DNS for{" "}
            <strong className="font-semibold">{sender.domain}</strong>, then
            check verification. Propagation usually takes minutes but can take
            up to 72 hours.
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-table-header text-left text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr key={`${record.type}-${record.name}`} className="align-top">
                <td className="px-4 py-2 font-medium text-gray-900">
                  {record.type}
                </td>
                <td className="max-w-[220px] px-4 py-2">
                  <CopyCell value={record.name} />
                </td>
                <td className="max-w-[260px] px-4 py-2">
                  <CopyCell value={record.value} />
                </td>
                <td className="px-4 py-2 text-gray-600">{record.purpose}</td>
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
