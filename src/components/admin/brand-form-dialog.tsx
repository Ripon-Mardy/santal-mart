"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUploader } from "@/components/shared/image-uploader";
import { brandSchema, type BrandFormInput } from "@/validations/product";
import { createBrandAction, updateBrandAction, uploadAdminImage } from "@/features/admin/actions";

export function BrandFormDialog({ brand }: { brand?: BrandFormInput & { id: string } }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!brand;

  const form = useForm<BrandFormInput>({
    resolver: zodResolver(brandSchema),
    defaultValues: brand ?? { name: "", description: "", logoUrl: "", isActive: true },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button> : <Button size="sm"><Plus /> Add Brand</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit(async (values) => {
              setIsSubmitting(true);
              const result = isEdit ? await updateBrandAction(brand.id, values) : await createBrandAction(values);
              setIsSubmitting(false);
              if (!result.success) return toast.error(result.message);
              toast.success(isEdit ? "Brand updated" : "Brand created");
              setOpen(false);
            })}
          >
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="logoUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Logo</FormLabel>
                <ImageUploader
                  images={field.value ? [{ url: field.value, isPrimary: true }] : []}
                  onChange={(images) => field.onChange(images[0]?.url ?? "")}
                  uploadAction={uploadAdminImage.bind(null, "brands")}
                  multiple={false}
                />
              </FormItem>
            )} />
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
