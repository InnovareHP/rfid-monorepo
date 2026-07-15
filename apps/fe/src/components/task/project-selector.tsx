import type { TaskProjectDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Archive, FolderPlus } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "../confirmation-dialog";

type ProjectSelectorProps = {
  projects: TaskProjectDto[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
  onArchive: (projectId: string) => void;
  creating?: boolean;
};

export const ProjectSelector = ({
  projects,
  selectedProjectId,
  onSelect,
  onCreate,
  onArchive,
  creating,
}: ProjectSelectorProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
    setCreateOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedProjectId ?? undefined}
        onValueChange={(value) => onSelect(value)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: project.color ?? "#6b7280" }}
                />
                {project.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        aria-label="Create project"
      >
        <FolderPlus className="h-4 w-4" />
      </Button>

      {selectedProjectId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setArchiveOpen(true)}
          aria-label="Archive project"
        >
          <Archive className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreate();
            }}
          />
          <DialogFooter>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive project?"
        description="The project and its tasks will be hidden from the default view."
        confirmText="Archive"
        variant="destructive"
        onConfirm={() => {
          if (selectedProjectId) onArchive(selectedProjectId);
        }}
      />
    </div>
  );
};
