import { Button } from "@dashboard/ui/components/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Plus } from "lucide-react";

const AddRow = () => {
  const navigate = useNavigate();
  const { team } = useParams({ strict: false }) as { team: string };

  return (
    <Button
      className="flex gap-2 bg-brand hover:bg-brand/90 text-white"
      onClick={() =>
        navigate({ to: "/$team/master-list/create", params: { team } })
      }
    >
      <Plus className="h-4 w-4" />
      Add Facility
    </Button>
  );
};

export default AddRow;
