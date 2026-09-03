import {
  createDropdownOption,
  getDropdownOptions,
  getLeadRecords,
  updateLead,
} from "@/services/lead/lead-service";
import {
  createReferralDropdownOption,
  getReferralDropdownOptions,
  updateReferral,
} from "@/services/referral/referral-service";
import {
  getLinkCandidates,
  updateModuleRecord,
  type CrmModuleType,
} from "@/services/board/board-module-service";
import {
  formatPhoneNumber,
  type LeadRow,
  type OptionsResponse,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toFieldOptions } from "@/lib/helper/field-options";
import { getApiErrorMessage } from "@/lib/helper/helper";
import { cn } from "@dashboard/ui/lib/utils";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { LinkTargetEmpty } from "@/components/record-create/link-target-empty";
import { format, isValid, parseISO } from "date-fns";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { toast } from "sonner";
import { MasterListView } from "../master-list/master-list-view";
import { ContactTooltipForm } from "../master-list/person-cell";
import { AttachmentCell } from "./attachment-cell";
import LocationCell, { type AddressComponents } from "./location-cell";
import { StatusSelect } from "./status-action";

// Autocomplete carries the long lists, so a picker only needs a first page
const PICKER_LIMIT = 10;

// Columns an address selection fills in alongside the location itself
const ADDRESS_COLUMNS: Record<keyof AddressComponents, string> = {
  city: "City",
  state: "State",
  zipCode: "Zip Code",
  county: "County",
};

type EditableCellProps = {
  id: string;
  fieldKey: string;
  fieldName: string;
  value: string;
  type: string; // Should match FieldType enum
  isReferral?: boolean;
  moduleType?: CrmModuleType;
  linkTargetId?: string;
  // Sibling columns, so picking an address can fill city, state, zip, county
  columns?: { id: string; name: string; type: string }[];
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-+()]+$/;
  return phone.length >= 10 && phoneRegex.test(phone);
};

const normalizeBoolean = (value: string): boolean => {
  const truthyValues = ["true", "1", "yes", "on"];
  return truthyValues.includes(value.toLowerCase());
};

const parseDate = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const parseMultiselectValue = (val: string): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed))
      return [...new Set(parsed.map((v) => String(v).trim()))];
  } catch {
    return [
      ...new Set(
        val
          .replace(/[[\]\\"]/g, "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      ),
    ];
  }
  return [];
};

export function EditableCell({
  id,
  fieldKey,
  fieldName,
  value,
  type,
  isReferral = false,
  moduleType,
  linkTargetId,
  columns,
}: EditableCellProps) {
  const { team } = useParams({ strict: false });
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const [validationError, setValidationError] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const recordsKey = boardQueryKey(
    moduleType ?? (isReferral ? "REFERRAL" : "LEAD")
  );

  // Adopt a new server value during render, never over an in-progress edit
  if (!editing && value !== syncedValue) {
    setSyncedValue(value);
    setVal(value);
  }

  const updateLeadMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
      reason,
      previousValue,
    }: {
      id: string;
      field: string;
      fieldName: string;
      value: string;
      reason?: string;
      previousValue?: string;
      displayValue?: string;
    }) =>
      moduleType
        ? await updateModuleRecord(
            moduleType,
            id,
            field,
            value,
            previousValue,
            reason
          )
        : isReferral
          ? await updateReferral(id, field, value, reason, previousValue)
          : await updateLead(id, field, value, undefined, reason),
    onMutate: async ({ id, fieldName: patchKey, value, displayValue }) => {
      await queryClient.cancelQueries({ queryKey: recordsKey });
      const previous = queryClient.getQueriesData({ queryKey: recordsKey });
      queryClient.setQueriesData({ queryKey: recordsKey }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((r: LeadRow) =>
            r.id === id ? { ...r, [patchKey]: displayValue ?? value } : r
          ),
        };
      });
      return { previous };
    },
    onError: (err, _vars, context: any) => {
      context?.previous?.forEach(([key, data]: [unknown, unknown]) =>
        queryClient.setQueryData(key as any, data)
      );
      // The server explains a refused rename - a duplicate name, most often -
      // and a fixed string here threw that away.
      toast.error(getApiErrorMessage(err, "Failed to update."));
    },
    // No board-list invalidate: the optimistic write is authoritative locally
    // and the board socket reconciles other clients + server-derived fields.
    // Stat tiles are aggregates, so they still need a refetch.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
    },
  });



  const handleUpdate = async (
    newVal: string,
    _location?: boolean,
    reason?: string,
    previousValue?: string,
    displayValue?: string
  ) => {
    // Don't update if value hasn't changed
    if (newVal === value || (displayValue && displayValue === value)) {
      setEditing(false);
      return;
    }

    // Validate based on type
    if (type === "EMAIL" && newVal && !validateEmail(newVal)) {
      setValidationError("Please enter a valid email address");
      return;
    }
    if (type === "PHONE" && newVal && !validatePhone(newVal)) {
      setValidationError("Please enter a valid phone number");
      return;
    }
    if (type === "NUMBER" && newVal && isNaN(Number(newVal))) {
      setValidationError("Please enter a valid number");
      return;
    }

    setValidationError("");
    setVal(displayValue ?? newVal);
    setIsUpdating(true);

    try {
      updateLeadMutation.mutate({
        id,
        field: fieldKey,
        fieldName,
        value: newVal,
        reason,
        previousValue,
        displayValue,
      });
      // Only show success toast for significant changes, not for every edit
      // toast.success("Value updated successfully");
    } catch (error) {
      setVal(value); // Revert to original value
      toast.error(getApiErrorMessage(error, "Failed to update value"));
    } finally {
      setIsUpdating(false);
    }
  };

  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");

  // Shared by the option and link pickers below; the two branches are mutually
  // exclusive per `type`, so one slot is enough.
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [selectOpen, setSelectOpen] = useState(false);

  const queryKey = ["dropdown-options", fieldKey, debouncedSearch];

  const {
    data,
    refetch,
    isLoading: isLoadingOptions,
  } = useQuery({
    queryKey,
    queryFn: () =>
      isReferral
        ? getReferralDropdownOptions(fieldKey, 1, PICKER_LIMIT, debouncedSearch)
        : getDropdownOptions(fieldKey, 1, PICKER_LIMIT, debouncedSearch),
    enabled: selectOpen || debouncedSearch.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
  });

  const options = toFieldOptions(data);

  const { mutate: createDropdownOptionMutation, isPending: isCreatingOption } =
    useMutation({
      mutationFn: async (option: string) =>
        isReferral
          ? createReferralDropdownOption(fieldKey, option)
          : createDropdownOption(fieldKey, option),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        refetch();
        toast.success("Option added successfully");
        setAdding(false);
        setNewOption("");
      },
      onError: () => {
        toast.error("Failed to add option");
      },
    });

  const handleHover = async () => {
    const existing = queryClient.getQueryData(queryKey);

    if (!existing) {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () =>
          isReferral
            ? getReferralDropdownOptions(fieldKey, 1, PICKER_LIMIT)
            : getDropdownOptions(fieldKey, 1, PICKER_LIMIT),
      });
    }
  };

  const handleAddOption = () => {
    if (!newOption.trim()) {
      toast.error("Please enter an option name");
      return;
    }

    createDropdownOptionMutation(newOption.trim());
  };

  const handleBlur = () => {
    setEditing(false);
    if (val !== value) {
      handleUpdate(val, undefined, undefined, value);
    }
  };

  const handleCancel = () => {
    setVal(value); // Reset to original value
    setValidationError("");
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Every hook below must run on every render regardless of `type` -
  // conditional hooks after early returns violate rules-of-hooks even when
  // `type` never changes for a mounted cell. Each hook is gated by `enabled`
  // (queries) or is simply unused outside its relevant type branch (state).
  const [date, setDate] = useState<Date | undefined>(parseDate(val));

  const { data: assignedToOptionsData, isLoading: isLoadingAssignedTo } =
    useQuery({
      queryKey: ["assigned-to-users"],
      queryFn: () => getDropdownOptions("ASSIGNED_TO"),
      enabled: type === "ASSIGNED_TO" || fieldName === "account_manager",
      staleTime: 1000 * 60 * 30,
    });

  // The cell stores the user id; the options list is what turns it into a name.
  const assignedToName = assignedToOptionsData?.find(
    (option: OptionsResponse) => option.id === val
  )?.value;

  const isLinkType =
    type === "REFERRAL_LINK" ||
    type === "CONTACT_LINK" ||
    type === "COMPANY_LINK";

  const linkTargetModule =
    type === "CONTACT_LINK"
      ? "CONTACT"
      : type === "COMPANY_LINK"
        ? "COMPANY"
        : moduleType === "CONTACT" && fieldName === "Company"
          ? "COMPANY"
          : "LEAD";

  const { data: records, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["link-records", linkTargetModule, debouncedSearch],
    queryFn: () =>
      linkTargetModule === "LEAD"
        ? getLeadRecords(1, PICKER_LIMIT, debouncedSearch)
        : getLinkCandidates(linkTargetModule, 1, PICKER_LIMIT, debouncedSearch),
    enabled: isLinkType,
    placeholderData: keepPreviousData,
  });

  const [selectedValues, setSelectedValues] = useState<string[]>(
    parseMultiselectValue(val)
  );
  const [initialValues] = useState<string[]>(parseMultiselectValue(val));
  const [open, setOpen] = useState(false);

  // ---- STATUS ----
  if (type === "STATUS") {
    return (
      <StatusSelect
        val={val}
        fieldKey={fieldKey}
        isReferral={isReferral}
        handleUpdate={(v, reason) => handleUpdate(v, undefined, reason, value)}
      />
    );
  }

  if (type === "PERSON") {
    return (
      <ContactTooltipForm
        entityId={fieldKey}
        initialValue={val}
        fieldName={fieldName}
        onNameChange={(name) => handleUpdate(name, undefined, undefined, value)}
      />
    );
  }

  if (type === "DATE") {
    const handleClearDate = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDate(undefined);
      handleUpdate("");
    };

    const handleSelectToday = () => {
      const today = new Date();
      setDate(today);
      const iso = today.toISOString().split("T")[0];
      handleUpdate(iso);
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-8 text-sm relative",
              !date && "text-muted-foreground",
              isUpdating && "opacity-50"
            )}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date && isValid(date) ? (
                  <>
                    {format(date, "PPP")}
                    {date && (
                      <XCircle
                        className="ml-auto h-4 w-4 text-gray-400 hover:text-red-500 cursor-pointer"
                        onClick={handleClearDate}
                      />
                    )}
                  </>
                ) : (
                  <span>Pick a date</span>
                )}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              if (!selectedDate) return;
              setDate(selectedDate);
              const iso = selectedDate.toISOString().split("T")[0];
              handleUpdate(iso);
            }}
          />
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSelectToday}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (type === "ASSIGNED_TO" || fieldName === "account_manager") {
    return (
      <Select
        value={val ?? ""}
        onValueChange={(v) => handleUpdate(String(v))}
        disabled={isUpdating || isLoadingAssignedTo}
      >
        <SelectTrigger
          className={cn("w-auto text-sm", isUpdating && "opacity-50")}
        >
          {isLoadingAssignedTo || isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {/* Radix unmounts SelectContent when closed, so SelectValue has no
              item to read a label from and falls back to the placeholder. With
              the raw value as placeholder that rendered the user's id. The
              resolved name is passed as children instead, which Radix prefers
              over the selected item's label. */}
          <SelectValue placeholder="Select user">
            {assignedToName}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {isLoadingAssignedTo ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading users...</span>
            </div>
          ) : assignedToOptionsData && assignedToOptionsData.length > 0 ? (
            assignedToOptionsData.map((opt: OptionsResponse) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.value}
              </SelectItem>
            ))
          ) : (
            <div className="flex items-center justify-center p-4">
              <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">No users available</span>
            </div>
          )}
        </SelectContent>
      </Select>
    );
  }

  if (type === "TIMELINE") {
    return <MasterListView isReferral={isReferral} leadId={id} />;
  }

  if (type === "CHECKBOX") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={normalizeBoolean(val)}
          onCheckedChange={(checked) =>
            handleUpdate(checked ? "true" : "false")
          }
          disabled={isUpdating}
        />
        {isUpdating && (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>
    );
  }

  if (type === "DROPDOWN") {
    const hasCurrentVal =
      !!val &&
      (!options ||
        options.length === 0 ||
        !options.some((opt: OptionsResponse) => opt.value === val));

    const filteredOptions: OptionsResponse[] = options ?? [];

    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={val ?? ""}
          onValueChange={(v) => handleUpdate(String(v))}
          disabled={isUpdating}
          open={selectOpen}
          onOpenChange={(next) => {
            setSelectOpen(next);
            if (!next) setSearchQuery("");
          }}
        >
          <SelectTrigger
            className={cn("w-auto text-sm", isUpdating && "opacity-50")}
            onMouseEnter={handleHover} // prefetch before opening
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            <SelectValue placeholder={val || "Select an option"} />
          </SelectTrigger>

          <SelectContent>
            {isLoadingOptions ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">
                  Loading options...
                </span>
              </div>
            ) : (
              <>
                {/* Filters on the server, so the whole list stays reachable */}
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Options list */}
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt: OptionsResponse) => (
                      <SelectItem key={opt.id} value={opt.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{opt.value}</span>
                          {opt.value === val && (
                            <Check className="h-3 w-3 ml-2 text-primary" />
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : searchQuery ? (
                    <div className="flex items-center justify-center p-4">
                      <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        No matches found
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4">
                      <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        No options available
                      </span>
                    </div>
                  )}
                  {hasCurrentVal && !searchQuery && (
                    <SelectItem key="current-val" value={val}>
                      <div className="flex items-center justify-between w-full">
                        <span>{val}</span>
                        <Check className="h-3 w-3 ml-2 text-primary" />
                      </div>
                    </SelectItem>
                  )}
                </div>

                {/* Action buttons */}
                <div className="border-t mt-1">
                  {val && (
                    <div
                      className="flex items-center gap-2 px-2 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdate("");
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      Remove value
                    </div>
                  )}

                  <>
                    {adding ? (
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Input
                          placeholder="New option"
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();

                            if (e.key === "Enter") handleAddOption();
                            if (e.key === "Escape") setAdding(false);
                          }}
                          className="h-7 text-xs"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddOption();
                          }}
                          disabled={isCreatingOption}
                        >
                          {isCreatingOption ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Adding...
                            </>
                          ) : (
                            "Add"
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdding(false);
                            setNewOption("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="flex items-center gap-2 px-2 py-2 text-xs text-primary hover:bg-primary/10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdding(true);
                          }}
                        >
                          + Add more option
                        </div>

                        {team && (
                          <Link
                            to={
                              isReferral
                                ? "/$team/referral-list/option/$option"
                                : "/$team/master-list/leads/option/$option"
                            }
                            params={{ team, option: fieldKey }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 px-2 py-2 text-xs text-primary hover:bg-primary/10 cursor-pointer">
                              Proceed to Option Configuration
                            </div>
                          </Link>
                        )}
                      </div>
                    )}
                  </>
                </div>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isLinkType) {
    const hasCurrentVal =
      !!val &&
      (!records ||
        records.length === 0 ||
        !records.some((record: any) => record.value === val));

    const filteredRecords: { id: string; value: string }[] = records ?? [];

    const selectedId =
      (records ?? []).find((record: any) => record.value === val)?.id ?? "";

    const linkRoute =
      linkTargetModule === "CONTACT"
        ? "/$team/contacts"
        : linkTargetModule === "COMPANY"
          ? "/$team/companies"
          : "/$team/master-list";

    return (
      <div className="flex items-center gap-1 min-w-0">
        <Select
          value={selectedId || val || ""}
          onValueChange={(v) => {
            const record = (records ?? []).find((r: any) => r.id === v);
            handleUpdate(
              String(v),
              undefined,
              undefined,
              undefined,
              record?.value
            );
          }}
          disabled={isUpdating}
        >
          <SelectTrigger
            className={cn("w-auto text-sm", isUpdating && "opacity-50")}
            onMouseEnter={handleHover} // prefetch before opening
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>

          <SelectContent>
            {isLoadingRecords ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">
                  Loading options...
                </span>
              </div>
            ) : (
              <>
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="max-h-[200px] overflow-y-auto">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record: any) => (
                      <SelectItem key={record.id} value={record.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{record.value}</span>
                          {record.value === val && (
                            <Check className="h-3 w-3 ml-2 text-primary" />
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : searchQuery ? (
                    <LinkTargetEmpty
                      targetModule={linkTargetModule}
                      team={team as string}
                      search={searchQuery}
                      fieldLabel={fieldName ?? "record"}
                    />
                  ) : (
                    <LinkTargetEmpty
                      targetModule={linkTargetModule}
                      team={team as string}
                      search=""
                      fieldLabel={fieldName ?? "record"}
                    />
                  )}
                  {hasCurrentVal && !searchQuery && (
                    <SelectItem key="current-val" value={val}>
                      <div className="flex items-center justify-between w-full">
                        <span>{val}</span>
                        <Check className="h-3 w-3 ml-2 text-primary" />
                      </div>
                    </SelectItem>
                  )}
                </div>

                <div className="border-t mt-1">
                  {val && (
                    <div
                      className="flex items-center gap-2 px-2 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdate("", undefined, undefined, val);
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      Remove value
                    </div>
                  )}
                </div>
              </>
            )}
          </SelectContent>
        </Select>
        {!!val && !!linkTargetId && (
          <Link
            to={linkRoute as any}
            search={{ q: val } as any}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-gray-400 hover:text-primary"
            title={`Open ${val}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    );
  }

  if (type === "LOCATION") {
    // Each sibling goes through the same mutation as a manual edit, so the row
    // patches optimistically and the board socket reconciles other clients.
    const applyAddressComponents = (components: AddressComponents) => {
      if (!columns) return;

      (
        Object.entries(ADDRESS_COLUMNS) as [keyof AddressComponents, string][]
      ).forEach(([componentKey, columnName]) => {
        const target = columns.find((column) => column.name === columnName);
        const componentValue = components[componentKey];
        if (!target || !componentValue) return;

        updateLeadMutation.mutate({
          id,
          field: target.id,
          fieldName: target.name,
          value: componentValue,
        });
      });
    };

    return (
      <LocationCell
        value={String(value || "")}
        onChange={(newLocation) => handleUpdate(String(newLocation), true)}
        onSelectComponents={applyAddressComponents}
      />
    );
  }

  if (type === "ATTACHMENT") {
    return (
      <AttachmentCell
        recordId={id}
        fieldId={fieldKey}
        fieldName={fieldName}
        attachmentCount={Number(value) || 0}
        moduleType={moduleType ?? (isReferral ? "REFERRAL" : "LEAD")}
      />
    );
  }

  if (type === "MULTISELECT") {
    const toggleValue = (optionValue: string) => {
      setSelectedValues((prev) => {
        const isSelected = prev.includes(optionValue);
        return isSelected
          ? prev.filter((v) => v !== optionValue)
          : [...prev, optionValue];
      });
    };

    const handleClearAll = () => {
      setSelectedValues([]);
    };

    const handleSelectAll = () => {
      setSelectedValues(options.map((opt: OptionsResponse) => opt.value));
    };

    const handlePopoverChange = (nextOpen: boolean) => {
      if (!nextOpen) {
        // Only update if values have changed
        const currentStr = selectedValues.sort().join(",");
        const initialStr = initialValues.sort().join(",");
        if (currentStr !== initialStr) {
          handleUpdate(selectedValues.join(","));
        }
      }
      setOpen(nextOpen);
    };

    const displayText =
      selectedValues.length === 0
        ? "Select options"
        : selectedValues.length > 2
          ? `${selectedValues.slice(0, 2).join(", ")} +${
              selectedValues.length - 2
            } more`
          : selectedValues.join(", ");

    return (
      <Popover open={open} onOpenChange={handlePopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-auto justify-between text-left text-sm max-w-[250px]",
              isUpdating && "opacity-50"
            )}
            onMouseEnter={handleHover}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <span className="truncate">{displayText}</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[250px] p-0" align="start">
          {/* Header with clear all */}
          {selectedValues.length > 0 && (
            <div className="flex items-center justify-between p-2 border-b bg-gray-50">
              <span className="text-xs font-semibold text-gray-700">
                {selectedValues.length} selected
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-red-600 hover:text-red-700"
                  onClick={handleClearAll}
                >
                  Clear All
                </Button>
                {selectedValues.length < options.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary hover:text-primary"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Options list */}
          {isLoadingOptions ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading options...</span>
            </div>
          ) : (
            <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
              {options.length > 0 ? (
                options.map((opt: OptionsResponse) => (
                  <div
                    key={opt.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-primary/10 rounded-md px-2 py-2 transition-colors"
                    onClick={() => toggleValue(opt.value)}
                  >
                    <Checkbox
                      checked={selectedValues.includes(opt.value)}
                      onCheckedChange={() => toggleValue(opt.value)}
                    />
                    <span className="text-sm flex-1">{opt.value}</span>
                    {selectedValues.includes(opt.value) && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4">
                  <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500">
                    No options available
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Add option section */}
          <div className="border-t p-2">
            {adding ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New option"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") handleAddOption();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNewOption("");
                    }
                  }}
                  className="h-7 text-xs"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleAddOption}
                  disabled={isCreatingOption}
                >
                  {isCreatingOption ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Adding...
                    </>
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAdding(false);
                    setNewOption("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-primary hover:bg-primary/10"
                onClick={() => setAdding(true)}
              >
                + Add more option
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (type === "NUMBER") {
    return editing ? (
      <div className="relative">
        <Input
          type="text"
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setValidationError("");
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-8 text-sm pr-8",
            validationError && "border-red-500 focus-visible:ring-red-500"
          )}
          autoFocus
          disabled={isUpdating}
        />
        {isUpdating && (
          <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {validationError && (
          <p className="text-xs text-red-500 mt-1">{validationError}</p>
        )}
      </div>
    ) : (
      <div
        className="flex w-full cursor-pointer items-center gap-2"
        onClick={() => setEditing(true)}
      >
        <span className="text-sm hover:underline">
          {val || <span className="text-muted-foreground">—</span>}
        </span>
        {isUpdating && (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>
    );
  }

  if (type === "EMAIL") {
    return editing ? (
      <div className="relative">
        <Input
          type="email"
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setValidationError("");
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-8 text-sm pr-8",
            validationError && "border-red-500 focus-visible:ring-red-500"
          )}
          placeholder="example@email.com"
          autoFocus
          disabled={isUpdating}
        />
        {isUpdating && (
          <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {validationError && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </p>
        )}
      </div>
    ) : (
      <div
        className="flex w-full cursor-pointer items-center gap-2"
        onClick={() => setEditing(true)}
      >
        <span className="text-sm hover:underline text-primary">
          {val || <span className="text-muted-foreground">—</span>}
        </span>
        {isUpdating && (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>
    );
  }

  // ---- PHONE ----
  if (type === "PHONE") {
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      // Strip to digits only
      const digits = input.replace(/\D/g, "").slice(0, 10);
      // Auto-format as user types: (555) 123-4567
      let formatted = digits;
      if (digits.length > 6) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length > 3) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length > 0) {
        formatted = `(${digits}`;
      }
      setVal(formatted);
      setValidationError("");
    };

    return editing ? (
      <div className="relative w-40">
        <Input
          type="text"
          value={val}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-8 text-sm pr-8",
            validationError && "border-red-500 focus-visible:ring-red-500"
          )}
          placeholder="(555) 123-4567"
          autoFocus
          disabled={isUpdating}
        />
        {isUpdating && (
          <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {validationError && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </p>
        )}
      </div>
    ) : (
      <div
        className="flex w-full cursor-pointer items-center gap-2"
        onClick={() => setEditing(true)}
      >
        <span className="text-sm hover:underline">
          {val ? (
            formatPhoneNumber(val)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        {isUpdating && (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>
    );
  }

  // ---- TEXT (default) ----
  return editing && fieldName !== "Facility" ? (
    <div className="relative">
      <Input
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          setValidationError("");
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-8 text-sm w-auto pr-8",
          validationError && "border-red-500 focus-visible:ring-red-500"
        )}
        autoFocus
        disabled={isUpdating}
        maxLength={500}
      />
      {isUpdating && (
        <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
      )}
      {validationError && (
        <p className="text-xs text-red-500 mt-1">{validationError}</p>
      )}
    </div>
  ) : (
    <div
      className={cn(
        "flex w-full items-center gap-2",
        fieldName !== "Facility" && "cursor-pointer"
      )}
      onClick={() => fieldName !== "Facility" && setEditing(true)}
    >
      <span
        className={cn(
          "text-sm flex items-center gap-1 w-auto",
          fieldName !== "Facility" && "hover:underline"
        )}
      >
        {val || <span className="text-muted-foreground">—</span>}
      </span>
      {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
    </div>
  );
}
