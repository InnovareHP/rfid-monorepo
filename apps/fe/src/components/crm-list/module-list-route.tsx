import CrmListPage from "@/components/crm-list/crm-list-page";
import CrmRecordCreate from "@/components/crm-list/crm-record-create";
import { useModules } from "@/hooks/use-modules";
import { moduleKeyFromParam, moduleParam } from "@/lib/helper/module-route";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useNavigate, useParams } from "@tanstack/react-router";

// Both generic record routes need the same module lookup, so the fetch and the
// not-found branch live here rather than being written twice in routes/.
function useModule(moduleKeyParam: string) {
  const moduleKey = moduleKeyFromParam(moduleKeyParam);
  const { data: modules = [], isLoading } = useModules({
    includeArchived: true,
  });

  return { module: modules.find((m) => m.key === moduleKey), isLoading };
}

function ModuleMissing({ moduleKey }: { moduleKey: string }) {
  return (
    <div className="page-style">
      <p className="text-muted-foreground">
        No module named {moduleKey} exists in this organization.
      </p>
    </div>
  );
}

export function ModuleListRoute() {
  const { moduleKey } = useParams({ strict: false }) as { moduleKey: string };
  const { module, isLoading } = useModule(moduleKey);

  if (isLoading) return <Spinner />;
  if (!module) return <ModuleMissing moduleKey={moduleKey} />;

  return (
    <CrmListPage
      moduleType={module.key}
      title={module.label}
      description={`Manage your ${module.label.toLowerCase()}.`}
      nameLabel={`${module.labelSingular} Name`}
      addLabel={`Add ${module.labelSingular}`}
      createPath={`/$team/records/${module.key}/create`}
    />
  );
}

export function ModuleCreateRoute() {
  const { team, moduleKey } = useParams({ strict: false }) as {
    team: string;
    moduleKey: string;
  };
  const navigate = useNavigate();
  const { module, isLoading } = useModule(moduleKey);

  if (isLoading) return <Spinner />;
  if (!module) return <ModuleMissing moduleKey={moduleKey} />;

  return (
    <CrmRecordCreate
      moduleType={module.key}
      title={`Add ${module.labelSingular}`}
      description={`Add one or multiple ${module.label.toLowerCase()} to your list`}
      entityLabel={module.labelSingular}
      entityLabelPlural={module.label}
      nameLabel={`${module.labelSingular} Name`}
      onBack={() =>
        navigate({
          to: "/$team/records/$moduleKey",
          params: { team, moduleKey: moduleParam(module.key) },
        })
      }
    />
  );
}
