import { TypingText } from "@/lib/typing-text-hook";
import {
  AI_WELCOME_MESSAGE,
  type AssistantFormPrefill,
  type ChatMessage,
} from "@dashboard/shared";
import { AssistanceForm } from "./AssistanceForm";
import { AssistantActions } from "./AssistantActions";
import { ChatPendingStep } from "./ChatPendingStep";

type ChatMessageListProps = {
  messages: ChatMessage[];
  onFormSuccess: (messageId: string) => void;
  onOpenForm: (messageId: string, prefill: AssistantFormPrefill) => void;
};

export const ChatMessageList = ({
  messages,
  onFormSuccess,
  onOpenForm,
}: ChatMessageListProps) => (
  <>
    <div className="rounded-xl bg-card p-4 border border-border shadow-sm max-w-[90%]">
      <div className="flex items-center gap-2 mb-1.5">
        <img
          src="/branding/Mascot/refidly-mascot.png"
          alt=""
          className="size-7 shrink-0 object-contain"
          aria-hidden
        />
        <p className="text-xs font-medium text-muted-foreground">
          AI Assistant
        </p>
      </div>
      <TypingText
        text={AI_WELCOME_MESSAGE}
        speed={12}
        className="text-sm leading-relaxed text-foreground"
      />
    </div>
    {messages.map((msg) =>
      msg.role === "user" ? (
        <div key={msg.id} className="flex justify-end">
          <div className="rounded-[1.25rem] bg-primary text-primary-foreground px-4 py-2.5 min-h-[34px] flex items-center max-w-[90%] w-fit shadow-sm">
            <p className="text-sm font-medium">{msg.content}</p>
          </div>
        </div>
      ) : (
        <div key={msg.id} className="flex justify-start">
          <div className="rounded-xl bg-card p-4 border border-border shadow-sm max-w-[90%] w-full">
            <div className="flex items-center gap-2 mb-1.5">
              <img
                src="/branding/Mascot/refidly-mascot.png"
                alt=""
                className="size-7 shrink-0 object-contain"
                aria-hidden
              />
              <p className="text-xs font-medium text-muted-foreground">
                AI Assistant
              </p>
            </div>
            {msg.pending ? (
              <ChatPendingStep step={msg.step} />
            ) : msg.formSubmitted ? (
              <p className="text-sm leading-relaxed text-success">
                Thank you! We've received your request and will get back to you
                shortly.
              </p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-foreground">
                  {msg.content}
                </p>
                {msg.showAssistanceForm ? (
                  <AssistanceForm
                    prefill={msg.prefill}
                    onSuccess={() => onFormSuccess(msg.id)}
                  />
                ) : (
                  !!msg.actions?.length && (
                    <AssistantActions
                      actions={msg.actions}
                      onOpenForm={(prefill) => onOpenForm(msg.id, prefill)}
                    />
                  )
                )}
              </>
            )}
          </div>
        </div>
      )
    )}
  </>
);
