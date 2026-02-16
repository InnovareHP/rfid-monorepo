import {
  createDropdownOption,
  getDropdownOptions,
  updateLead,
} from "@/services/lead/lead-service";
import {
  createReferralDropdownOption,
  getReferralDropdownOptions,
  updateReferral,
} from "@/services/referral/referral-service";
import type { LeadRow, OptionsResponse } from "@dashboard/shared";
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
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, isValid, parseISO } from "date-fns";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MasterListView } from "../master-list/master-list-view";
import LocationCell from "./location-cell";
import { StatusSelect } from "./status-action";

type EditableCellProps = {
  id: string;
  fieldKey: string;
  fieldName: string;
  value: string;
  type: string; // Should match FieldType enum
  isReferral?: boolean;
};

// Helper functions for validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phone.length >= 10 && phoneRegex.test(phone);
};

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6
    )}`;
  }
  return phone;
};

const normalizeBoolean = (value: string): boolean => {
  const truthyValues = ["true", "1", "yes", "on"];
  return truthyValues.includes(value.toLowerCase());
};

export function EditableCell({
  id,
  fieldKey,
  fieldName,
  value,
  type,
  isReferral = false,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [validationError, setValidationError] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const isreferralKey = isReferral ? "referrals" : "leads";

  // Sync value when prop changes
  useEffect(() => {
    setVal(value);
  }, [value]);

  const updateLeadMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
      reason,
    }: {
      id: string;
      field: string;
      value: string;
      reason?: string;
    }) =>
      isReferral
        ? await updateReferral(id, field, value, reason)
        : await updateLead(id, field, value),
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: [isreferralKey] });
      const previousData = queryClient.getQueryData([isreferralKey]);
      queryClient.setQueryData([isreferralKey], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((r: LeadRow) =>
              r.id === id
                ? {
                    ...r,
                    [field]: value,
                  }
                : r
            ),
          })),
        };
      });
      return { previousData };
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData([isreferralKey], context.previousData);
      toast.error("Failed to update lead.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [isreferralKey] });
    },
  });

  const handleUpdate = async (
    newVal: string,
    location?: boolean,
    reason?: string
  ) => {
    // Don't update if value hasn't changed
    if (newVal === value) {
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
    setVal(newVal);
    setIsUpdating(true);

    try {
      if (isReferral) {
        updateLeadMutation.mutate({
          id,
          field: fieldKey,
          value: newVal,
          reason,
        });
      } else if (location) {
        updateLeadMutation.mutate({ id, field: fieldKey, value: newVal });
      } else {
        updateLeadMutation.mutate({ id, field: fieldKey, value: newVal });
      }
      // Only show success toast for significant changes, not for every edit
      // toast.success("Value updated successfully");
    } catch (error) {
      setVal(value); // Revert to original value
      toast.error("Failed to update value");
    } finally {
      setIsUpdating(false);
    }
  };

  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");

  const queryKey = ["dropdown-options", fieldKey];

  const {
    data: options = [],
    refetch,
    isLoading: isLoadingOptions,
  } = useQuery({
    queryKey,
    queryFn: () => getDropdownOptions(fieldKey),
    enabled: false,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
    gcTime: 1000 * 60 * 5,
  });

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
            ? getReferralDropdownOptions(fieldKey)
            : getDropdownOptions(fieldKey),
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
      handleUpdate(val);
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

  // ---- STATUS ----
  if (type === "STATUS") {
    return (
      <StatusSelect
        val={val}
        isReferral={isReferral}
        handleUpdate={(v, reason) => handleUpdate(v, undefined, reason)}
      />
    );
  }

  // ---- DATE ----
  if (type === "DATE") {
    // Parse date safely
    const parseDate = (dateString: string): Date | undefined => {
      if (!dateString) return undefined;
      try {
        const parsed = parseISO(dateString);
        return isValid(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    };

    const [date, setDate] = useState<Date | undefined>(parseDate(val));

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

  // ---- ANALYZE ----

  // ---- ASSIGNED TO ----
  const { data: assignedToOptionsData, isLoading: isLoadingAssignedTo } =
    useQuery({
      queryKey: ["assigned-to-users"],
      queryFn: () => getDropdownOptions("ASSIGNED_TO"),
      enabled: type === "ASSIGNED_TO" || fieldName === "account_manager",
    });

  if (type === "ASSIGNED_TO" || fieldName === "account_manager") {
    return (
      <Select
        defaultValue={val}
        onValueChange={(v) => handleUpdate(String(v))}
        disabled={isUpdating || isLoadingAssignedTo}
      >
        <SelectTrigger
          className={cn("w-auto text-sm", isUpdating && "opacity-50")}
        >
          {isLoadingAssignedTo ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          <SelectValue placeholder={val || "Select user"} />
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

  // ---- TIME ----
  if (type === "TIMELINE") {
    return <MasterListView isReferral={isReferral} leadId={id} />;
  }

  // ---- CHECKBOX ----
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

  // ---- DROPDOWN ----
  if (type === "DROPDOWN") {
    const [searchQuery, setSearchQuery] = useState("");
    const hasCurrentVal =
      !!val &&
      (!options ||
        options.length === 0 ||
        !options.some((opt: OptionsResponse) => opt.value === val));

    const filteredOptions =
      !!options &&
      options.length > 0 &&
      options.filter((opt: OptionsResponse) =>
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const goToCountyConfig = fieldName === "County" && isReferral;
    return (
      <Select
        defaultValue={val}
        onValueChange={(v) => handleUpdate(String(v))}
        disabled={isUpdating}
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
              <span className="text-sm text-gray-500">Loading options...</span>
            </div>
          ) : (
            <>
              {/* Search input for long lists */}
              {options.length > 5 && (
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Options list */}
              <div className="max-h-[200px] overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt: OptionsResponse) => (
                    <SelectItem key={opt.id} value={opt.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{opt.value}</span>
                        {opt.value === val && (
                          <Check className="h-3 w-3 ml-2 text-blue-600" />
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
                      <Check className="h-3 w-3 ml-2 text-blue-600" />
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
                {goToCountyConfig ? (
                  <Link
                    to={"/$team/county-config" as any}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer">
                      + County Config
                    </div>
                  </Link>
                ) : (
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
                          className="flex items-center gap-2 px-2 py-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdding(true);
                          }}
                        >
                          + Add more option
                        </div>

                        <Link
                          to={
                            `${
                              isReferral
                                ? "/$team/referral-list/option"
                                : "/$team/master-list/leads/option"
                            }/${fieldKey}` as any
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 px-2 py-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer">
                            Proceed to Option Configuration
                          </div>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SelectContent>
      </Select>
    );
  }

  if (type === "LOCATION") {
    return (
      <LocationCell
        value={String(value || "")}
        onChange={(newLocation) => handleUpdate(String(newLocation), true)}
      />
    );
  }

  if (type === "MULTISELECT") {
    const parseValue = (val: string): string[] => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed))
          return [...new Set(parsed.map((v) => String(v).trim()))];
      } catch {
        return [
          ...new Set(
            val
              .replace(/[\[\]\\"]/g, "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          ),
        ];
      }
      return [];
    };

    const [selectedValues, setSelectedValues] = useState<string[]>(
      parseValue(val)
    );
    const [initialValues] = useState<string[]>(parseValue(val));
    const [open, setOpen] = useState(false);

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
                    className="h-6 text-xs text-blue-600 hover:text-blue-700"
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
                    className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 rounded-md px-2 py-2 transition-colors"
                    onClick={() => toggleValue(opt.value)}
                  >
                    <Checkbox
                      checked={selectedValues.includes(opt.value)}
                      onCheckedChange={() => toggleValue(opt.value)}
                    />
                    <span className="text-sm flex-1">{opt.value}</span>
                    {selectedValues.includes(opt.value) && (
                      <Check className="h-3 w-3 text-blue-600" />
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
                className="w-full text-xs text-blue-600 hover:bg-blue-50"
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

  // ---- NUMBER ----
  if (type === "NUMBER") {
    return editing ? (
      <div className="relative">
        <Input
          type="number"
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
      <div className="flex items-center gap-2">
        <span
          onClick={() => setEditing(true)}
          className="cursor-pointer text-sm hover:underline"
        >
          {val || <span className="text-muted-foreground">—</span>}
        </span>
        {isUpdating && (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>
    );
  }

  // ---- EMAIL ----
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
      <div className="flex items-center gap-2">
        <span
          onClick={() => setEditing(true)}
          className="cursor-pointer text-sm hover:underline text-blue-500"
        >
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
    return editing ? (
      <div className="relative">
        <Input
          type="tel"
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
      <div className="flex items-center gap-2">
        <span
          onClick={() => setEditing(true)}
          className="cursor-pointer text-sm hover:underline"
        >
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
    <div className="flex items-center gap-2">
      <span
        onClick={() => fieldName !== "Facility" && setEditing(true)}
        className={cn(
          "text-sm flex items-center gap-1 w-auto",
          fieldName !== "Facility" && "cursor-pointer hover:underline"
        )}
      >
        {val || <span className="text-muted-foreground">—</span>}
      </span>
      {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
    </div>
  );
}
