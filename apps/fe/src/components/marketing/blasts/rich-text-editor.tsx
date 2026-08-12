import { BLAST_MERGE_VARIABLES, sanitizeRichText } from "@dashboard/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { cn } from "@dashboard/ui/lib/utils";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { FONT_FAMILIES } from "./blast-block-style";
import { RichTextToolbarGroup } from "./rich-text-toolbar-group";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  // Compact is the block panels: inline marks and alignment only, because font,
  // size and color are separate block props there.
  variant?: "compact" | "full";
  disabled?: boolean;
  className?: string;
};

const MARKS = [
  { command: "bold", icon: Bold, label: "Bold" },
  { command: "italic", icon: Italic, label: "Italic" },
  { command: "underline", icon: Underline, label: "Underline" },
] as const;

const ALIGNMENTS = [
  { command: "justifyLeft", icon: AlignLeft, label: "Align left" },
  { command: "justifyCenter", icon: AlignCenter, label: "Align center" },
  { command: "justifyRight", icon: AlignRight, label: "Align right" },
  { command: "justifyFull", icon: AlignJustify, label: "Justify" },
] as const;

const LISTS = [
  { command: "insertUnorderedList", icon: List, label: "Bulleted list" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
] as const;

const HISTORY = [
  { command: "undo", icon: Undo2, label: "Undo" },
  { command: "redo", icon: Redo2, label: "Redo" },
] as const;

export const RichTextEditor = ({
  value,
  onChange,
  variant = "compact",
  disabled = false,
  className,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // contentEditable owns its own DOM, so the value is pushed in only when it
  // diverges — writing on every render would reset the caret mid-typing.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = sanitizeRichText(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [value]);

  const run = (command: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    emit();
  };

  const emit = () => {
    const editor = editorRef.current;
    if (editor) onChange(sanitizeRichText(editor.innerHTML));
  };

  const isFull = variant === "full";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-background",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        {isFull && (
          <Select onValueChange={(font) => run("fontName", font)}>
            <SelectTrigger className="h-8 w-[122px]">
              <SelectValue placeholder="Arial" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <RichTextToolbarGroup commands={MARKS} disabled={disabled} onRun={run} />
        <RichTextToolbarGroup commands={ALIGNMENTS} disabled={disabled} onRun={run} />

        {isFull && (
          <>
            <Select onValueChange={(token) => run("insertText", token)}>
              <SelectTrigger className="h-8 w-[182px]">
                <SelectValue placeholder="Substitute Variables" />
              </SelectTrigger>
              <SelectContent>
                {BLAST_MERGE_VARIABLES.map((variable) => (
                  <SelectItem key={variable.token} value={variable.token}>
                    {variable.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <RichTextToolbarGroup commands={LISTS} disabled={disabled} onRun={run} />

            <input
              type="color"
              aria-label="Text color"
              className="size-8 cursor-pointer rounded-md border border-border bg-background"
              onChange={(event) => run("foreColor", event.target.value)}
            />

            <RichTextToolbarGroup commands={HISTORY} disabled={disabled} onRun={run} />
          </>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        onInput={emit}
        onBlur={emit}
        className={cn(
          "min-h-24 px-3 py-2 text-sm text-foreground outline-none",
          isFull && "min-h-64",
          disabled && "opacity-60"
        )}
      />
    </div>
  );
};
