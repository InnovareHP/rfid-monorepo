import { moduleOptionHref } from "@/lib/helper/module-route";
import { can } from "@/lib/permissions";
import { createFieldOption } from "@/services/options/options-service";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OptionFieldActionsProps = {
  fieldId: string;
  fieldLabel: string;
  // What the user typed, so the add button can offer it directly
  search: string;
  // Module key the field belongs to, used to resolve its options screen
  moduleKey?: string;
  team?: string;
  // Selects the option once it exists, so the picker does not have to be reopened
  onAdded: (value: string) => void;
  onClose: () => void;
};

// A picker whose options are configured elsewhere is a dead end when the value
// the user needs is missing, so it offers both adding it here and the screen
// where the whole set is managed.
export function OptionFieldActions({
  fieldId,
  fieldLabel,
  search,
  moduleKey,
  team,
  onAdded,
  onClose,
}: OptionFieldActionsProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const { memberData } = useRouteContext({ from: "/_team" }) as {
    memberData?: { role: string };
  };

  // Adding an option is field update, which every role holds; managing the set
  // is field configure, which is owners and admins only.
  const canConfigure = can(memberData?.role, { field: ["configure"] });

  const optionsHref =
    canConfigure && moduleKey && team
      ? moduleOptionHref(moduleKey, team, fieldId)
      : null;

  const addOption = useMutation({
    mutationFn: (name: string) => createFieldOption(fieldId, name),
    onSuccess: (_result, name) => {
      queryClient.invalidateQueries({
        queryKey: ["record-dropdown-options", fieldId],
      });
      queryClient.invalidateQueries({ queryKey: ["dropdown-options", fieldId] });
      queryClient.invalidateQueries({ queryKey: ["field-options", fieldId] });
      toast.success(`Added "${name}" to ${fieldLabel}.`);
      setAdding(false);
      setDraft("");
      onAdded(name);
      onClose();
    },
    onError: () => {
      toast.error(`Failed to add the ${fieldLabel.toLowerCase()} option.`);
    },
  });

  const submit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter an option name.");
      return;
    }

    addOption.mutate(trimmed);
  };

  // A search that already names the option skips the extra input
  const searched = search.trim();

  if (adding) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Input
          placeholder={`New ${fieldLabel.toLowerCase()}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") submit(draft);
            if (event.key === "Escape") setAdding(false);
          }}
          className="h-8 text-sm"
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => submit(draft)}
          disabled={addOption.isPending}
        >
          {addOption.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() => {
            setAdding(false);
            setDraft("");
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/10"
        onClick={() => (searched ? submit(searched) : setAdding(true))}
        disabled={addOption.isPending}
      >
        {addOption.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        {searched ? `Add "${searched}"` : `Add ${fieldLabel.toLowerCase()}`}
      </button>

      {optionsHref && (
        <a
          href={optionsHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          Manage {fieldLabel.toLowerCase()} options
        </a>
      )}
    </div>
  );
}
