import { getApiErrorMessage } from "@/lib/helper/helper";
import { WriteGate } from "@/components/write-gate";
import { DuplicateWarningDialog } from "@/components/record-create/duplicate-warning-dialog";
import { useDuplicateCheck } from "@/hooks/use-duplicate-check";
import RecordCreatePage, {
  type CreatedRecord,
  type RecordColumn,
} from "@/components/record-create/record-create-page";
import {
  createModuleRecords,
  getModuleColumns,
  getModuleDropdownOptions,
  type CrmModuleType,
} from "@/services/board/board-module-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          `Failed to create ${entityLabel.toLowerCase()}(s)`
        )
      );
    },
  });

  const duplicateCheck = useDuplicateCheck({
    moduleType,
    columns,
    onCreate: (records) => createMutation.mutate(records),
  });

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
          isSubmitting={createMutation.isPending || duplicateCheck.isChecking}
          fetchDropdownOptions={(fieldId, search, limit) =>
            getModuleDropdownOptions(fieldId, search, limit)
          }
          onSubmit={duplicateCheck.submit}
          onBack={onBack}
          optionModule={moduleType}
        />
      </WriteGate>

      <DuplicateWarningDialog
        findings={duplicateCheck.findings}
        entityLabel={entityLabel}
        onCancel={duplicateCheck.dismiss}
        onCreateAnyway={duplicateCheck.createAnyway}
      />
    </>
  );
}
