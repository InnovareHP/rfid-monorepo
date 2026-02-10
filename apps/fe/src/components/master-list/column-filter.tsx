import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const ColumnFilter = ({
  tableColumns,
}: {
  tableColumns: ColumnDef<unknown> &
    {
      getCanHide: () => boolean;
      getIsVisible: () => boolean;
      toggleVisibility: (value: boolean) => void;
      label: string;
      accessorFn: string;
    }[];
}) => {
  const [handleDropdownChange, setHandleDropdownChange] =
    useState<boolean>(false);
  return (
    <DropdownMenu
      open={handleDropdownChange}
      onOpenChange={setHandleDropdownChange}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto rounded-md">
          Columns <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {tableColumns
          .filter((column) => column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.accessorFn}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnFilter;
