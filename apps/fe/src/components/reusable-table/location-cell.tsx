import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Autocomplete from "react-google-autocomplete";
import { toast } from "sonner";

type LocationCellProps = {
  value?: string;
  onChange?: (value: string) => void;
};

const LocationCell: React.FC<LocationCellProps> = ({
  value = "",
  onChange,
}) => {
  const [address, setAddress] = useState(value || "");
  const lastConfirmedValue = useRef(value || "");
  const [openConfirm, setOpenConfirm] = useState(false);
  const pendingClear = useRef(false);
  const isUpdating = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for Google Maps API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn(
      "Google Maps API key is missing. LocationCell will not function properly."
    );
  }

  // Sync external value changes only when not actively editing
  useEffect(() => {
    if (!isUpdating.current && value !== address) {
      const safeValue = value || "";
      setAddress(safeValue);
      lastConfirmedValue.current = safeValue;
    }
  }, [value]);

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // Mark as actively editing
      isUpdating.current = true;

      // Attempt to clear - only if there was a previous value
      if (newValue === "" && lastConfirmedValue.current) {
        pendingClear.current = true;
        setOpenConfirm(true);
        return;
      }

      setAddress(newValue);
    },
    []
  );

  const handlePlaceSelected = useCallback(
    (place: any) => {
      if (!place) {
        toast.error("Failed to select location. Please try again.");
        return;
      }

      if (!place.formatted_address) {
        toast.error(
          "Invalid location selected. Please choose a valid address."
        );
        return;
      }

      try {
        const finalAddress = place.formatted_address;
        setAddress(finalAddress);
        lastConfirmedValue.current = finalAddress;
        isUpdating.current = false;
        onChange?.(finalAddress);
      } catch (error) {
        console.error("Error handling place selection:", error);
        toast.error("Failed to update location.");
        // Revert to last confirmed value
        setAddress(lastConfirmedValue.current);
      }
    },
    [onChange]
  );

  const handleConfirmClear = useCallback(() => {
    setAddress("");
    lastConfirmedValue.current = "";
    pendingClear.current = false;
    isUpdating.current = false;
    setOpenConfirm(false);
    onChange?.("");
  }, [onChange]);

  const handleCancelClear = useCallback(() => {
    setAddress(lastConfirmedValue.current);
    pendingClear.current = false;
    isUpdating.current = false;
    setOpenConfirm(false);

    // Restore focus to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAddress(lastConfirmedValue.current);
        isUpdating.current = false;
        inputRef.current?.blur();
      }
    },
    []
  );

  // Handle API errors gracefully
  if (!apiKey) {
    return (
      <input
        type="text"
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          onChange?.(e.target.value);
        }}
        placeholder="Enter address (Maps API unavailable)"
        className="w-96 border px-3 py-2 rounded border-yellow-300 bg-yellow-50"
      />
    );
  }

  return (
    <>
      <Autocomplete
        ref={inputRef}
        apiKey={apiKey}
        placeholder="Search for an address..."
        defaultValue={address}
        options={{
          types: ["geocode"],
          componentRestrictions: { country: "us" },
        }}
        onChange={handleAddressChange}
        onPlaceSelected={handlePlaceSelected}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Reset editing flag when losing focus
          setTimeout(() => {
            isUpdating.current = false;
          }, 300);
        }}
        className="w-96 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* 🔔 CONFIRM DELETE DIALOG */}
      <Dialog
        open={openConfirm}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelClear();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete address?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this address? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelClear}>
              Cancel
            </Button>

            <Button variant="destructive" onClick={handleConfirmClear}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationCell;
