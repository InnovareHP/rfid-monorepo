import { RequiredMark } from "@/components/field-marks";
import { PageHeader } from "@/components/page-header";
import {
  SegmentedTabsList,
  SegmentedTabsTrigger,
} from "@/components/segmented-tabs";
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
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Spinner } from "@dashboard/ui/components/spinner";
import { Tabs, TabsContent } from "@dashboard/ui/components/tabs";
import { Textarea } from "@dashboard/ui/components/textarea";
import { cn } from "@dashboard/ui/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Archive, Copy, Trash2 } from "lucide-react";
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
import { PRIORITY_CONFIG } from "./task-priority";
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
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        Task not found
      </div>
    );
  }

  const statuses = statusesQuery.data ?? [];
  const ownMemberId =
    (sessionQuery.data as { member?: { id: string } } | null | undefined)
      ?.member?.id ?? null;
  const isCompleted = Boolean(task.completedAt);

  const goBack = () => navigate({ to: "/$team/tasks", params: { team } });

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
    <div className="page-style">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            className="mt-1 size-9"
            onClick={goBack}
            aria-label="Back to tasks"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <PageHeader className="flex-1" title={`Task #${task.taskNumber}`}>
            <Button
              variant="outline"
              onClick={() => duplicateTaskMutation.mutate(task.id)}
              disabled={duplicateTaskMutation.isPending}
            >
              <Copy className="size-4" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { isArchived: !task.isArchived },
                })
              }
            >
              <Archive className="size-4" />
              {task.isArchived ? "Unarchive" : "Archive"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </PageHeader>
        </div>

        <Card className="gap-0 overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b bg-table-header px-6 py-4">
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
            <Input
              key={`name-${task.updatedAt}`}
              defaultValue={task.name}
              className={cn(
                "border-transparent bg-transparent font-display text-base font-semibold shadow-none dark:bg-transparent",
                isCompleted && "text-muted-foreground line-through"
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

          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>
                  Status <RequiredMark />
                </Label>
                <Select
                  value={task.statusId}
                  onValueChange={(statusId) =>
                    updateTaskMutation.mutate({
                      id: task.id,
                      data: { statusId },
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-sm"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Priority <RequiredMark />
                </Label>
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
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TASK_PRIORITY).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2.5 rounded-sm",
                              PRIORITY_CONFIG[priority].dotClassName
                            )}
                          />
                          {PRIORITY_CONFIG[priority].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  key={`start-${task.updatedAt}`}
                  type="date"
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

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  key={`due-${task.updatedAt}`}
                  type="date"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Assignee/s <RequiredMark />
                </Label>
                <AssigneePicker
                  label="Assign"
                  selected={task.assignees}
                  onChange={(memberIds) =>
                    detailMutations.setAssigneesMutation.mutate(memberIds)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Label/s</Label>
                <LabelPicker
                  selected={task.labels}
                  onChange={(labelIds) =>
                    detailMutations.setLabelsMutation.mutate(labelIds)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                key={`description-${task.updatedAt}`}
                defaultValue={task.description ?? ""}
                rows={4}
                placeholder="Description"
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
          </div>
        </Card>

        <Card className="p-6">
          <Tabs defaultValue="details">
            <SegmentedTabsList>
              <SegmentedTabsTrigger value="details">Details</SegmentedTabsTrigger>
              <SegmentedTabsTrigger value="comments">
                Comments
              </SegmentedTabsTrigger>
              <SegmentedTabsTrigger value="activity">
                Activity
              </SegmentedTabsTrigger>
            </SegmentedTabsList>

            <TabsContent value="details" className="space-y-8 pt-4">
              {!task.parentTaskId && (
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

              <AttachmentsSection
                attachments={task.attachments}
                uploading={uploading}
                onUpload={handleUpload}
                onDelete={(attachmentId) =>
                  detailMutations.deleteAttachmentMutation.mutate(attachmentId)
                }
              />

              <TimeTrackingSection
                task={task}
                entries={timeEntriesQuery.data ?? []}
                runningTimer={runningTimerQuery.data}
                onStartTimer={() => detailMutations.startTimerMutation.mutate()}
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
                onAdd={(body) => detailMutations.addCommentMutation.mutate(body)}
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
