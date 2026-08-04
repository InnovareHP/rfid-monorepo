import { authClient } from "@/lib/auth-client";
import { applyBrandColor } from "@/lib/color-utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { useQueryClient } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

type BrandingCardProps = {
  organizationId?: string;
  metadata?: string | null;
};

export function BrandingCard({ organizationId, metadata }: BrandingCardProps) {
  const queryClient = useQueryClient();

  const currentMetadata = useMemo(() => {
    try {
      return metadata ? JSON.parse(metadata) : {};
    } catch {
      return {};
    }
  }, [metadata]);

  // Local edit wins while the user is picking, otherwise show the saved color
  const [editedColor, setEditedColor] = useState<string | null>(null);
  const brandColor = editedColor ?? currentMetadata.brandColor ?? "#3b82f6";

  const saveBrandColor = useCallback(
    debounce(async (color: string) => {
      try {
        await authClient.organization.update({
          organizationId,
          data: { metadata: { ...currentMetadata, brandColor: color } },
        });
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
      } catch {
        toast.error("Failed to save brand color");
      }
    }, 500),
    [organizationId, currentMetadata]
  );

  const handleBrandColorChange = (color: string) => {
    setEditedColor(color);
    applyBrandColor(color);
    saveBrandColor(color);
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-lg">Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Brand Color
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => handleBrandColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => handleBrandColorChange(e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Preview
            </Label>
            <div className="flex items-center gap-3">
              <div
                className="h-10 px-4 rounded-md text-white text-sm font-medium flex items-center"
                style={{ backgroundColor: brandColor }}
              >
                Primary Button
              </div>
              <div
                className="h-10 px-4 rounded-md border-2 text-sm font-medium flex items-center"
                style={{ borderColor: brandColor, color: brandColor }}
              >
                Outline Button
              </div>
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: brandColor }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
