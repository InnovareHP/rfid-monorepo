import { authClient } from "@/lib/auth-client";
import { deleteImage, uploadImage } from "@/services/image/image-service";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "date-fns";
import { Building2, Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type OrganizationCardProps = {
  organizationId?: string;
  name?: string;
  logo?: string | null;
  createdAt?: string | Date | null;
  canEdit: boolean;
};

export function OrganizationCard({
  organizationId,
  name,
  logo,
  createdAt,
  canEdit,
}: OrganizationCardProps) {
  const queryClient = useQueryClient();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoClick = () => {
    if (canEdit) logoInputRef.current?.click();
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);

    const data = await uploadImage(file, "public");
    if (!data?.url) throw new Error("Failed to upload image");

    try {
      await authClient.organization.update(
        {
          organizationId,
          data: { logo: data.url },
        },
        {
          onSuccess: () => {
            toast.success("Team logo uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["organizationData"] });
          },
          onError: async () => {
            await deleteImage(data.public_id);
            toast.error("Failed to upload team logo");
          },
        }
      );
    } catch (error) {
      toast.error("Failed to upload team logo");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6 sm:flex-nowrap">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                onClick={handleLogoClick}
                className={cn(
                  "relative flex size-16 items-center justify-center overflow-hidden rounded-xl border-2 border-primary/40 bg-white",
                  canEdit &&
                    "cursor-pointer transition-all hover:border-primary"
                )}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name?.replaceAll("-", " ")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="size-8 text-primary" />
                )}
                {canEdit && !logo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-all sm:bg-black/0 sm:group-hover:bg-black/40">
                    <Camera className="hover-reveal size-6 text-white" />
                  </div>
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {name?.replaceAll("-", " ")}
              </h2>
              {canEdit && (
                <p className="text-sm text-gray-500">
                  Click the icon to change/upload a logo - PNG or SVG, up to 2MB
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              Founded
            </p>
            <p className="page-title text-2xl font-bold">
              {createdAt ? formatDate(new Date(createdAt), "MMMM d, yyyy") : "-"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
