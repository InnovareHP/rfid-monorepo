import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";

type FormSettingsPanelProps = {
  submitButtonText: string;
  redirectUrl: string;
  onSubmitButtonTextChange: (value: string) => void;
  onRedirectUrlChange: (value: string) => void;
};

export const FormSettingsPanel = ({
  submitButtonText,
  redirectUrl,
  onSubmitButtonTextChange,
  onRedirectUrlChange,
}: FormSettingsPanelProps) => {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">Settings</h3>
      <div className="space-y-1.5">
        <Label htmlFor="submit-button-text">Submit button text</Label>
        <Input
          id="submit-button-text"
          value={submitButtonText}
          onChange={(event) => onSubmitButtonTextChange(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="redirect-url">Redirect URL (optional)</Label>
        <Input
          id="redirect-url"
          value={redirectUrl}
          onChange={(event) => onRedirectUrlChange(event.target.value)}
          placeholder="https://example.com/thank-you"
        />
      </div>
    </div>
  );
};
