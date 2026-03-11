import { axiosClient } from "@/lib/axios-client";
import { Button } from "@dashboard/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@dashboard/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@dashboard/ui/components/popover";
import { MapPin } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Prediction = {
  description: string;
  place_id: string;
};

type LocationCellProps = {
  value?: string;
  onChange?: (value: string) => void;
};

const LocationCell: React.FC<LocationCellProps> = ({
  value = "",
  onChange,
}) => {
  const [address, setAddress] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmedRef = useRef(value || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(crypto.randomUUID());

  // Sync external value
  useEffect(() => {
    if (value !== undefined) {
      setAddress(value);
      confirmedRef.current = value;
    }
  }, [value]);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/api/places/autocomplete", {
        params: { input, sessionToken: sessionRef.current },
      });
      setPredictions(data);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (val === "" && confirmedRef.current) {
      setConfirmClear(true);
      return;
    }

    setAddress(val);
    setOpen(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    try {
      const { data } = await axiosClient.get("/api/places/details", {
        params: {
          placeId: prediction.place_id,
          sessionToken: sessionRef.current,
        },
      });
      const addr = data.formatted_address;
      setAddress(addr);
      confirmedRef.current = addr;
      setOpen(false);
      setPredictions([]);
      sessionRef.current = crypto.randomUUID();
      onChange?.(addr);
    } catch {
      toast.error("Failed to get address details.");
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <input
            type="text"
            value={address}
            onChange={handleInputChange}
            onFocus={() => {
              if (predictions.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setAddress(confirmedRef.current);
                setOpen(false);
              }
            }}
            placeholder="Search for an address..."
            className="w-96 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </PopoverAnchor>

        <PopoverContent
          className="w-96 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {loading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!loading && predictions.length === 0 && address.length >= 2 && (
                <CommandEmpty>No addresses found.</CommandEmpty>
              )}
              <CommandGroup>
                {predictions.map((p) => (
                  <CommandItem
                    key={p.place_id}
                    value={p.place_id}
                    onSelect={() => handleSelect(p)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete address?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this address? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setAddress("");
                confirmedRef.current = "";
                setConfirmClear(false);
                onChange?.("");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationCell;
