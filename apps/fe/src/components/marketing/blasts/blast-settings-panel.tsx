import type { MarketingCampaign } from "@/services/marketing/campaign-service";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import type { UseFormReturn } from "react-hook-form";
import type { BlastFormValues } from "./blast-block-schema";
import { BlastGroupPicker } from "./blast-group-picker";

export const NO_CAMPAIGN = "none";

type BlastSettingsPanelProps = {
  form: UseFormReturn<BlastFormValues>;
  campaigns: MarketingCampaign[];
  disabled: boolean;
};

// Name, subject, campaign and audience. Shared by the drag and drop panel and
// the classic editor's first step so the two never drift.
export const BlastSettingsPanel = ({
  form,
  campaigns,
  disabled,
}: BlastSettingsPanelProps) => (
  <div className="space-y-4">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Name <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <Input
              placeholder="Internal name - recipients never see this."
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="subject"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Subject <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <Input placeholder="Email Subject" disabled={disabled} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="campaignId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Campaign</FormLabel>
          <Select
            disabled={disabled}
            value={field.value || NO_CAMPAIGN}
            onValueChange={field.onChange}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NO_CAMPAIGN}>None</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="groupIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Recipient Groups <span className="text-destructive">*</span>
          </FormLabel>
          <BlastGroupPicker
            value={field.value ?? []}
            disabled={disabled}
            onChange={field.onChange}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);
