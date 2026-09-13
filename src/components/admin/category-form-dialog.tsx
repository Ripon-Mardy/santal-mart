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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { categorySchema, type CategoryFormInput } from "@/validations/product";
import { createCategoryAction, updateCategoryAction, uploadAdminImage } from "@/features/admin/actions";
import { ImageUploader } from "@/components/shared/image-uploader";

export function CategoryFormDialog({
  category,
  parentOptions,
}: {
  category?: CategoryFormInput & { id: string };
  parentOptions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!category;

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ?? { name: "", parentId: "", description: "", imageUrl: "", seoTitle: "", seoDescription: "", sortOrder: 0, isActive: true },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button> : <Button size="sm"><Plus /> Add Category</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit(async (values) => {
              setIsSubmitting(true);
              const result = isEdit ? await updateCategoryAction(category.id, values) : await createCategoryAction(values);
              setIsSubmitting(false);
              if (!result.success) return toast.error(result.message);
              toast.success(isEdit ? "Category updated" : "Category created");
              setOpen(false);
            })}
          >
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="parentId" render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Category (optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="None (top-level)" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {parentOptions.filter((p) => p.id !== category?.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <ImageUploader
                  images={field.value ? [{ url: field.value, isPrimary: true }] : []}
                  onChange={(images) => field.onChange(images[0]?.url ?? "")}
                  uploadAction={uploadAdminImage.bind(null, "categories")}
                  multiple={false}
                />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="sortOrder" render={({ field }) => (
                <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-end gap-2 pb-1.5">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
