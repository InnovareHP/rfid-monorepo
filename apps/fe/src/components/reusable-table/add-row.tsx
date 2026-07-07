import { Button } from "@dashboard/ui/components/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Plus } from "lucide-react";

const AddRow = ({ isReferral = false }: { isReferral?: boolean }) => {
  const navigate = useNavigate();
  const { team } = useParams({ strict: false }) as { team: string };

  if (isReferral) return null;

  return (
    <Button
      className="flex gap-2 bg-primary hover:bg-primary/90 text-white"
      onClick={() =>
        navigate({ to: "/$team/master-list/create", params: { team } })
      }
    >
      <Plus className="h-4 w-4" />
      Add New Facility
    </Button>
  );
};

export default AddRow;
