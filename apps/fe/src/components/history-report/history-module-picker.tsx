import { moduleIcon } from "@/lib/helper/module-icons";
import type { CrmModule } from "@/services/module/module-service";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";

type HistoryModulePickerProps = {
  modules: CrmModule[];
  value: string;
  onChange: (moduleKey: string) => void;
};

// An organization can hold fourteen modules, so this is a picker rather than a
// tab strip: tabs would wrap into three rows or scroll their later entries out
// of sight. The sidebar folders group it, so it reads the same way the nav does.
export function HistoryModulePicker({
  modules,
  value,
  onChange,
}: HistoryModulePickerProps) {
  const ungrouped = modules.filter((module) => !module.groupName);

  const folderOrder: string[] = [];
  const byFolder = new Map<string, CrmModule[]>();

  for (const module of modules) {
    if (!module.groupName) continue;

    const existing = byFolder.get(module.groupName);
    if (existing) {
      existing.push(module);
      continue;
    }

    folderOrder.push(module.groupName);
    byFolder.set(module.groupName, [module]);
  }

  const renderItem = (module: CrmModule) => {
    const Icon = moduleIcon(module.icon);

    return (
      <SelectItem key={module.key} value={module.key}>
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {module.label}
          {module.isArchived && (
            <span className="text-muted-foreground">(archived)</span>
          )}
        </span>
      </SelectItem>
    );
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-card sm:w-[260px]">
        <SelectValue placeholder="Select a module" />
      </SelectTrigger>
      <SelectContent>
        {ungrouped.map(renderItem)}
        {folderOrder.map((name) => (
          <SelectGroup key={name}>
            <SelectLabel>{name}</SelectLabel>
            {(byFolder.get(name) ?? []).map(renderItem)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
