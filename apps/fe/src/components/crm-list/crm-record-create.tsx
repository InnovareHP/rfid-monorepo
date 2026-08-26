import { WriteGate } from "@/components/write-gate";
import RecordCreatePage, {
  type CreatedRecord,
  type RecordColumn,
} from "@/components/record-create/record-create-page";
import {
  createModuleRecords,
  findModuleDuplicates,
  getModuleColumns,
  getModuleDropdownOptions,
  type CrmModuleType,
  type DuplicateMatch,
} from "@/services/board/board-module-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { toast } from "sonner";

type CrmRecordCreateProps = {
  moduleType: CrmModuleType;
  title: string;
  description: string;
  entityLabel: string;
  entityLabelPlural: string;
  nameLabel: string;
  onBack: () => void;
};

export default function CrmRecordCreate({
  moduleType,
  title,
  description,
  entityLabel,
  entityLabelPlural,
  nameLabel,
  onBack,
}: CrmRecordCreateProps) {
  const queryClient = useQueryClient();
  const queryKey = boardQueryKey(moduleType);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [pendingRecords, setPendingRecords] = useState<CreatedRecord[] | null>(
    null
  );
  const [isChecking, setIsChecking] = useState(false);

  const { data: columnsData, isLoading: isLoadingColumns } = useQuery({
    queryKey: [...queryKey, "columns"],
    queryFn: () => getModuleColumns(moduleType),
  });

  const columns: RecordColumn[] = columnsData || [];

  const createMutation = useMutation({
    mutationFn: (records: CreatedRecord[]) => {
      const payload = records.map((record) => {
        const row: Record<string, string> = {
          referral_name: record.recordName,
        };
        columns.forEach((col) => {
          row[col.name] = record.values[col.id] ?? "";
        });
        return row;
      });
      return createModuleRecords(moduleType, payload);
    },
    onSuccess: () => {
      toast.success(`${entityLabel}(s) created successfully`);
      queryClient.invalidateQueries({ queryKey });
      onBack();
    },
    onError: () => {
      toast.error(`Failed to create ${entityLabel.toLowerCase()}(s)`);
    },
  });

  const handleSubmit = async (records: CreatedRecord[]) => {
    const emailColumn = columns.find((col) => col.type === "EMAIL");
    const phoneColumn = columns.find((col) => col.type === "PHONE");

    if (!emailColumn && !phoneColumn) {
      createMutation.mutate(records);
      return;
    }

    setIsChecking(true);
    try {
      const results = await Promise.all(
        records.map((record) => {
          const email = emailColumn
            ? record.values[emailColumn.id]?.trim()
            : undefined;
          const phone = phoneColumn
            ? record.values[phoneColumn.id]?.trim()
            : undefined;
          if (!email && !phone) {
            return Promise.resolve({ duplicates: [] as DuplicateMatch[] });
          }
          return findModuleDuplicates(moduleType, { email, phone });
        })
      );

      const found = results.flatMap((result) => result.duplicates);
      if (found.length > 0) {
        setDuplicates(found);
        setPendingRecords(records);
        return;
      }

      createMutation.mutate(records);
    } catch {
      // Dedupe is advisory only, never block the save on a failed check
      createMutation.mutate(records);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateAnyway = () => {
    if (pendingRecords) {
      createMutation.mutate(pendingRecords);
    }
    setDuplicates([]);
    setPendingRecords(null);
  };

  return (
    <>
      <WriteGate>
        <RecordCreatePage
          title={title}
          description={description}
          entityLabel={entityLabel}
          entityLabelPlural={entityLabelPlural}
          nameLabel={nameLabel}
          columns={columns}
          isLoadingColumns={isLoadingColumns}
          isSubmitting={createMutation.isPending || isChecking}
          fetchDropdownOptions={getModuleDropdownOptions}
          onSubmit={handleSubmit}
          onBack={onBack}
        />
      </WriteGate>

      <Dialog
        open={duplicates.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicates([]);
            setPendingRecords(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Possible duplicate {entityLabel.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              A record with the same email or phone already exists. You can
              still create it if this is intentional.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {duplicates.map((duplicate) => (
              <div
                key={`${duplicate.recordId}-${duplicate.matchedField}`}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                <p className="font-semibold text-gray-900">
                  {duplicate.recordName}
                </p>
                <p className="text-gray-600">
                  {duplicate.matchedField}: {duplicate.matchedValue}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDuplicates([]);
                setPendingRecords(null);
              }}
            >
              Go back and edit
            </Button>
            <Button onClick={handleCreateAnyway}>Create anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
