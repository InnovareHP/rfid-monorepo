import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type TaskReminderEmailProps = {
  recipientName: string;
  dueLabel: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
  taskUrl: string;
};

export const TaskReminderEmail = ({
  recipientName,
  dueLabel,
  taskTitle,
  dueDate,
  priority,
  taskUrl,
}: TaskReminderEmailProps) => (
  <EmailLayout
    preview={`${taskTitle} is due ${dueLabel}`}
    badge="Task Reminder"
  >
    <Heading style={emailStyles.heading}>A task is due {dueLabel}</Heading>

    <Text style={emailStyles.paragraph}>
      Hi <strong>{recipientName}</strong>, this is a reminder that the task
      below is coming up on your list.
    </Text>

    <EmailDetailTable
      rows={[
        { label: "Task Title", value: taskTitle },
        { label: "Due Date", value: dueDate },
        { label: "Priority", value: priority },
      ]}
    />

    <EmailCta href={taskUrl} label="Open Task" />
  </EmailLayout>
);

export default TaskReminderEmail;
