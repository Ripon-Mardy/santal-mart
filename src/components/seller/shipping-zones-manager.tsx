"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createShippingZoneAction, deleteShippingZoneAction } from "@/features/seller/actions";

export type ShippingZoneRow = { id: string; name: string; division: string | null; city: string | null; flatRate: number };

export function ShippingZonesManager({ zones }: { zones: ShippingZoneRow[] }) {
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [city, setCity] = useState("");
  const [rate, setRate] = useState(60);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {zones.length === 0 && <p className="text-sm text-muted-foreground">No custom shipping zones — the platform default rate applies.</p>}
        {zones.map((zone) => (
          <div key={zone.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{zone.name}</p>
              <p className="text-muted-foreground">{[zone.division, zone.city].filter(Boolean).join(", ") || "All areas"} · ৳{zone.flatRate}</p>
            </div>
            <Button
              variant="ghost" size="icon" disabled={isPending}
              onClick={() => startTransition(async () => { await deleteShippingZoneAction(zone.id); })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div>
          <Label className="mb-1 text-xs">Zone Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inside Dhaka" />
        </div>
        <div>
          <Label className="mb-1 text-xs">Division</Label>
          <Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Dhaka" />
        </div>
        <div>
          <Label className="mb-1 text-xs">City (optional)</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 text-xs">Rate (৳)</Label>
          <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        <Button
          size="sm"
          className="col-span-2 sm:col-span-4"
          disabled={isPending || !name}
          onClick={() =>
            startTransition(async () => {
              const result = await createShippingZoneAction({ name, division: division || undefined, city: city || undefined, flatRate: rate });
              if (result.success) {
                toast.success("Shipping zone added");
                setName(""); setDivision(""); setCity("");
              } else {
                toast.error(result.message);
              }
            })
          }
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add Zone
        </Button>
      </div>
    </div>
  );
}
