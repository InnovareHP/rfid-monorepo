import { useSession } from "@/hooks/auth-query";
import {
  useRunningTimer,
  useTask,
  useTaskActivity,
  useTaskComments,
  useTaskDetailMutations,
  useTaskMutations,
  useTasks,
  useTaskStatuses,
  useTaskTimeEntries,
} from "@/hooks/use-tasks";
import { uploadImage } from "@/services/image/image-service";
import { TASK_PRIORITY } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Separator } from "@dashboard/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { Textarea } from "@dashboard/ui/components/textarea";
import { cn } from "@dashboard/ui/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Archive, Copy, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "../confirmation-dialog";
import { ActivityTab } from "./activity-tab";
import { AssigneePicker } from "./assignee-picker";
import { AttachmentsSection } from "./attachments-section";
import { ChecklistSection } from "./checklist-section";
import { CommentsSection } from "./comments-section";
import { DependenciesSection } from "./dependencies-section";
import { LabelPicker } from "./label-picker";
import { SubtaskList } from "./subtask-list";
import { TimeTrackingSection } from "./time-tracking-section";

const toDateInputValue = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

const TaskDetail = () => {
  const { team, task: taskId } = useParams({ strict: false }) as {
    team: string;
    task: string;
  };
  const navigate = useNavigate();

  const taskQuery = useTask(taskId);
  const statusesQuery = useTaskStatuses();
  const commentsQuery = useTaskComments(taskId);
  const activityQuery = useTaskActivity(taskId);
  const timeEntriesQuery = useTaskTimeEntries(taskId);
  const runningTimerQuery = useRunningTimer();
  const sessionQuery = useSession();

  const {
    createTaskMutation,
    updateTaskMutation,
    completeTaskMutation,
    deleteTaskMutation,
    duplicateTaskMutation,
  } = useTaskMutations();
  const detailMutations = useTaskDetailMutations(taskId);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const task = taskQuery.data;

  const candidateTasksQuery = useTasks({
    projectId: task?.projectId ?? "",
    page: 1,
    limit: 500,
  });

  if (taskQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-24 text-gray-500">Task not found</div>
    );
  }

  const statuses = statusesQuery.data ?? [];
  const ownMemberId =
    (sessionQuery.data as { member?: { id: string } } | null | undefined)
      ?.member?.id ?? null;
  const isCompleted = Boolean(task.completedAt);

  const goBack = () =>
    navigate({ to: "/$team/tasks", params: { team } });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const image = await uploadImage(file);
      if (!image?.url) throw new Error("Failed to upload attachment");
      await detailMutations.addAttachmentMutation.mutateAsync({
        url: image.url,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      toast.success("Attachment added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload attachment"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tasks
          </Button>
          <span className="text-sm font-mono text-gray-400">
            #{task.taskNumber}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateTaskMutation.mutate(task.id)}
            disabled={duplicateTaskMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-1" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateTaskMutation.mutate({
                id: task.id,
                data: { isArchived: !task.isArchived },
              })
            }
          >
            <Archive className="h-4 w-4 mr-1" />
            {task.isArchived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <Card className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="mt-2">
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() =>
                  completeTaskMutation.mutate({
                    id: task.id,
                    completed: isCompleted,
                  })
                }
                aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
              />
            </div>
            <Input
              key={`name-${task.updatedAt}`}
              defaultValue={task.name}
              className={cn(
                "text-lg font-semibold border-transparent hover:border-gray-200 focus:border-gray-300",
                isCompleted && "line-through text-gray-400"
              )}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value && value !== task.name) {
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { name: value },
                  });
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Status
              </p>
              <Select
                value={task.statusId}
                onValueChange={(statusId) =>
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { statusId },
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Priority
              </p>
              <Select
                value={task.priority}
                onValueChange={(priority) =>
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: {
                      priority: priority as keyof typeof TASK_PRIORITY,
                    },
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TASK_PRIORITY).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Start Date
              </p>
              <Input
                key={`start-${task.updatedAt}`}
                type="date"
                className="h-8"
                defaultValue={toDateInputValue(task.startDate)}
                onBlur={(event) =>
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: {
                      startDate: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Due Date
              </p>
              <Input
                key={`due-${task.updatedAt}`}
                type="date"
                className="h-8"
                defaultValue={toDateInputValue(task.dueDate)}
                onBlur={(event) =>
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: {
                      dueDate: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Assignees
              </p>
              <AssigneePicker
                label="Assign"
                selected={task.assignees}
                onChange={(memberIds) =>
                  detailMutations.setAssigneesMutation.mutate(memberIds)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Labels
              </p>
              <LabelPicker
                selected={task.labels}
                onChange={(labelIds) =>
                  detailMutations.setLabelsMutation.mutate(labelIds)
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Description
            </p>
            <Textarea
              key={`description-${task.updatedAt}`}
              defaultValue={task.description ?? ""}
              rows={3}
              placeholder="Add a description..."
              onBlur={(event) => {
                const value = event.target.value;
                if (value !== (task.description ?? "")) {
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { description: value || null },
                  });
                }
              }}
            />
          </div>
        </Card>

        <Card className="p-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 pt-4">
              {!task.parentTaskId && (
                <>
                  <SubtaskList
                    subtasks={task.subtasks}
                    disabled={createTaskMutation.isPending}
                    onAdd={(name) =>
                      createTaskMutation.mutate({
                        name,
                        projectId: task.projectId,
                        listId: task.listId,
                        parentTaskId: task.id,
                      })
                    }
                    onToggleComplete={(subtask) => {
                      if (subtask.id.startsWith("temp-")) return;
                      completeTaskMutation.mutate({
                        id: subtask.id,
                        completed: Boolean(subtask.completedAt),
                      });
                    }}
                    onOpen={(subtask) => {
                      if (subtask.id.startsWith("temp-")) return;
                      navigate({
                        to: "/$team/tasks/$task",
                        params: { team, task: subtask.id },
                      });
                    }}
                  />
                  <Separator />
                </>
              )}

              <ChecklistSection
                items={task.checklistItems}
                onAdd={(title) =>
                  detailMutations.addChecklistItemMutation.mutate(title)
                }
                onToggle={(itemId, isDone) =>
                  detailMutations.updateChecklistItemMutation.mutate({
                    itemId,
                    data: { isDone },
                  })
                }
                onDelete={(itemId) =>
                  detailMutations.deleteChecklistItemMutation.mutate(itemId)
                }
              />

              <Separator />

              <DependenciesSection
                task={task}
                candidateTasks={candidateTasksQuery.data?.data ?? []}
                onAdd={(blockerTaskId) =>
                  detailMutations.addDependencyMutation.mutate(blockerTaskId)
                }
                onRemove={(dependencyId) =>
                  detailMutations.removeDependencyMutation.mutate(dependencyId)
                }
              />

              <Separator />

              <AttachmentsSection
                attachments={task.attachments}
                uploading={uploading}
                onUpload={handleUpload}
                onDelete={(attachmentId) =>
                  detailMutations.deleteAttachmentMutation.mutate(attachmentId)
                }
              />

              <Separator />

              <TimeTrackingSection
                task={task}
                entries={timeEntriesQuery.data ?? []}
                runningTimer={runningTimerQuery.data}
                onStartTimer={() =>
                  detailMutations.startTimerMutation.mutate()
                }
                onStopTimer={() => detailMutations.stopTimerMutation.mutate()}
                onAddManual={(durationMinutes, note) =>
                  detailMutations.addTimeEntryMutation.mutate({
                    durationMinutes,
                    note,
                  })
                }
                onDeleteEntry={(entryId) =>
                  detailMutations.deleteTimeEntryMutation.mutate(entryId)
                }
              />
            </TabsContent>

            <TabsContent value="comments" className="pt-4">
              <CommentsSection
                comments={commentsQuery.data ?? []}
                ownMemberId={ownMemberId}
                isLoading={commentsQuery.isLoading}
                submitting={detailMutations.addCommentMutation.isPending}
                onAdd={(body) =>
                  detailMutations.addCommentMutation.mutate(body)
                }
                onEdit={(commentId, body) =>
                  detailMutations.updateCommentMutation.mutate({
                    commentId,
                    body,
                  })
                }
                onDelete={(commentId) =>
                  detailMutations.deleteCommentMutation.mutate(commentId)
                }
              />
            </TabsContent>

            <TabsContent value="activity" className="pt-4">
              <ActivityTab
                activities={activityQuery.data ?? []}
                isLoading={activityQuery.isLoading}
              />
            </TabsContent>
          </Tabs>
        </Card>

        <ConfirmationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete task?"
          description="The task and its subtasks will be removed. This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
          onConfirm={() => {
            deleteTaskMutation.mutate(task.id, { onSuccess: goBack });
          }}
        />
      </div>
    </div>
  );
};

export default TaskDetail;
