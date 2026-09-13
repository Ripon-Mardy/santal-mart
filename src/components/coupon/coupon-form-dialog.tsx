"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { couponFormSchema, type CouponFormInput } from "@/validations/checkout";
import type { ActionResult } from "@/features/auth/actions";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function CouponFormDialog({
  coupon,
  onSubmit,
  scopeOptions,
}: {
  coupon?: CouponFormInput & { id: string };
  onSubmit: (values: CouponFormInput) => Promise<ActionResult>;
  scopeOptions?: { categories: { id: string; name: string }[]; sellers?: { id: string; name: string }[] };
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!coupon;

  const form = useForm<CouponFormInput>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: coupon ?? {
      code: "", description: "", discountType: "PERCENTAGE", value: 10,
      startsAt: new Date(), endsAt: new Date(Date.now() + 30 * 86_400_000), isActive: true,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- live-updates the value/label field as the type changes
  const discountType = form.watch("discountType");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
        ) : (
          <Button size="sm"><Plus /> Create Coupon</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit(async (values) => {
              setIsSubmitting(true);
              const result = await onSubmit(values);
              setIsSubmitting(false);
              if (!result.success) return toast.error(result.message);
              toast.success(isEdit ? "Coupon updated" : "Coupon created");
              setOpen(false);
            })}
          >
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem><FormLabel>Coupon Code</FormLabel><FormControl><Input placeholder="SAVE10" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="discountType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                      <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {discountType !== "FREE_SHIPPING" && (
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{discountType === "PERCENTAGE" ? "Percent Off" : "Amount Off"}</FormLabel>
                    <FormControl><Input type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="minOrderAmount" render={({ field }) => (
                <FormItem><FormLabel>Min Order Amount</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="maxDiscount" render={({ field }) => (
                <FormItem><FormLabel>Max Discount</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="usageLimit" render={({ field }) => (
                <FormItem><FormLabel>Total Usage Limit</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="perUserLimit" render={({ field }) => (
                <FormItem><FormLabel>Per-User Limit</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl></FormItem>
              )} />
            </div>
            {scopeOptions && (
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional — leave blank for all)</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="All categories" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {scopeOptions.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startsAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endsAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />} Save Coupon
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
