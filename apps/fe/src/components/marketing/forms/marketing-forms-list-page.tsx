import { getBoardFieldsByModule } from "@/services/marketing/blast-service";
import {
  createForm,
  deleteForm,
  getForms,
  publishForm,
  type MarketingForm,
} from "@/services/marketing/form-service";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormListTable } from "./form-list-table";

const MODULE_TYPES = ["LEAD", "REFERRAL", "CONTACT", "COMPANY"] as const;

export const MarketingFormsListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [moduleType, setModuleType] =
    useState<(typeof MODULE_TYPES)[number]>("LEAD");
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["marketing-forms"],
    queryFn: getForms,
  });

  const { data: boardFields = [] } = useQuery({
    queryKey: ["board-fields-by-module", moduleType],
    queryFn: () => getBoardFieldsByModule(moduleType),
    enabled: createOpen,
  });

  const resetCreateState = () => {
    setName("");
    setModuleType("LEAD");
    setSelectedFieldIds([]);
  };

  const handleModuleTypeChange = (value: (typeof MODULE_TYPES)[number]) => {
    setModuleType(value);
    setSelectedFieldIds([]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createForm({
        name: name.trim(),
        moduleType,
        fieldMappings: selectedFieldIds.map((fieldId) => ({
          fieldId,
          label:
            boardFields.find((field) => field.id === fieldId)?.name ?? "",
          required: false,
        })),
      }),
    onSuccess: (created: MarketingForm) => {
      toast.success("Form created");
      queryClient.invalidateQueries({ queryKey: ["marketing-forms"] });
      setCreateOpen(false);
      resetCreateState();
      navigate({
        to: "/$team/marketing/forms/$formId",
        params: { team, formId: created.id },
      });
    },
    onError: () => toast.error("Failed to create form"),
  });

  const publishMutation = useMutation({
    mutationFn: (form: MarketingForm) => publishForm(form.id),
    onSuccess: () => {
      toast.success("Form published");
      queryClient.invalidateQueries({ queryKey: ["marketing-forms"] });
    },
    onError: () => toast.error("Failed to publish form"),
  });

  const deleteMutation = useMutation({
    mutationFn: (form: MarketingForm) => deleteForm(form.id),
    onSuccess: () => {
      toast.success("Form deleted");
      queryClient.invalidateQueries({ queryKey: ["marketing-forms"] });
    },
    onError: () => toast.error("Failed to delete form"),
  });

  const toggleField = (fieldId: string) => {
    setSelectedFieldIds((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Forms
            </h1>
            <p className="text-sm text-gray-500">
              Capture leads with public forms.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Form
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <FormListTable
            forms={forms}
            onEdit={(form) =>
              navigate({
                to: "/$team/marketing/forms/$formId",
                params: { team, formId: form.id },
              })
            }
            onPublish={(form) => publishMutation.mutate(form)}
            onDelete={(form) => deleteMutation.mutate(form)}
          />
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Form</DialogTitle>
            <DialogDescription>
              Name your form, pick which board it submits to, and select at
              least one field to capture.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Board</Label>
              <Select value={moduleType} onValueChange={handleModuleTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fields</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-gray-200 p-2">
                {boardFields.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 text-sm px-1 py-1"
                  >
                    <Checkbox
                      checked={selectedFieldIds.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    {field.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !name.trim() ||
                selectedFieldIds.length === 0 ||
                createMutation.isPending
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
