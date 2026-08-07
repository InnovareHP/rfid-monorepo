import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type TaskAssignedEmailProps = {
  recipientName: string;
  assignerName: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
  taskUrl: string;
};

export const TaskAssignedEmail = ({
  recipientName,
  assignerName,
  taskTitle,
  dueDate,
  priority,
  taskUrl,
}: TaskAssignedEmailProps) => (
  <EmailLayout
    preview={`${assignerName} assigned you a task: ${taskTitle}`}
    badge="New Task"
  >
    <Heading style={emailStyles.heading}>
      You&apos;ve been assigned a new task
    </Heading>

    <Text style={emailStyles.paragraph}>
      Hi <strong>{recipientName}</strong>, <strong>{assignerName}</strong> just
      assigned you a task in Refidly. Here are the details:
    </Text>

    <EmailDetailTable
      rows={[
        { label: "Task Title", value: taskTitle },
        { label: "Due Date", value: dueDate },
        { label: "Priority", value: priority },
      ]}
    />

    <EmailCta href={taskUrl} label="View Task" />
  </EmailLayout>
);

export default TaskAssignedEmail;
