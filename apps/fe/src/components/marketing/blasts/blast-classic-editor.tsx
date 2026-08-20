import type { MarketingCampaign } from "@/services/marketing/campaign-service";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import type { UseFormReturn } from "react-hook-form";
import type { BlastFormValues } from "./blast-block-schema";
import { BlastSettingsPanel } from "./blast-settings-panel";
import { BlastStepSection } from "./blast-step-section";
import { RichTextEditor } from "./rich-text-editor";

type BlastClassicEditorProps = {
  form: UseFormReturn<BlastFormValues>;
  campaigns: MarketingCampaign[];
  disabled: boolean;
};

export const BlastClassicEditor = ({
  form,
  campaigns,
  disabled,
}: BlastClassicEditorProps) => (
  <>
    <BlastStepSection step={1} title="Blast Details">
      <BlastSettingsPanel
        form={form}
        campaigns={campaigns}
        disabled={disabled}
      />
    </BlastStepSection>

    <BlastStepSection step={2} title="Email Body">
      <FormField
        control={form.control}
        name="bodyHtml"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Body <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <RichTextEditor
                variant="full"
                disabled={disabled}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </BlastStepSection>
  </>
);
