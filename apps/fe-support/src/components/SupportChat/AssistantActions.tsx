import {
  ASSISTANT_DESTINATIONS,
  type AssistantAction,
  type AssistantFormPrefill,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { useNavigate, useParams } from "@tanstack/react-router";

type AssistantActionsProps = {
  actions: AssistantAction[];
  onOpenForm: (prefill: AssistantFormPrefill) => void;
};

export const AssistantActions = ({
  actions,
  onOpenForm,
}: AssistantActionsProps) => {
  const navigate = useNavigate();
  const { lang } = useParams({ from: "/_lang/$lang/" });

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action) =>
        action.kind === "open_form" ? (
          <Button
            key={`form-${action.label}`}
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-lg text-xs"
            onClick={() => onOpenForm(action.prefill)}
          >
            {action.label}
          </Button>
        ) : (
          <Button
            key={`nav-${action.destination}`}
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-lg text-xs"
            onClick={() =>
              navigate({
                to: `/${lang}${ASSISTANT_DESTINATIONS[action.destination]}`,
              })
            }
          >
            {action.label}
          </Button>
        )
      )}
    </div>
  );
};
