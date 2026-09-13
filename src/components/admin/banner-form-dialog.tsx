"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/shared/image-uploader";
import { createBannerAction, updateBannerAction, uploadAdminImage } from "@/features/admin/actions";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaText: string | null;
  ctaUrl: string | null;
  type: "HERO" | "PROMOTIONAL" | "CATEGORY";
  isActive: boolean;
  sortOrder: number;
};

export function BannerFormDialog({ banner }: { banner?: BannerRow }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!banner;

  const [form, setForm] = useState({
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    imageUrl: banner?.imageUrl ?? "",
    ctaText: banner?.ctaText ?? "",
    ctaUrl: banner?.ctaUrl ?? "",
    type: banner?.type ?? "HERO",
    isActive: banner?.isActive ?? true,
    sortOrder: banner?.sortOrder ?? 0,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button> : <Button size="sm"><Plus /> Add Banner</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5">Image</Label>
            <ImageUploader
              images={form.imageUrl ? [{ url: form.imageUrl, isPrimary: true }] : []}
              onChange={(images) => setForm((f) => ({ ...f, imageUrl: images[0]?.url ?? "" }))}
              uploadAction={uploadAdminImage.bind(null, "banners")}
              multiple={false}
            />
          </div>
          <div>
            <Label className="mb-1.5">Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5">Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">CTA Text</Label>
              <Input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} placeholder="Shop Now" />
            </div>
            <div>
              <Label className="mb-1.5">CTA URL</Label>
              <Input value={form.ctaUrl} onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} placeholder="/search" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as BannerRow["type"] }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HERO">Hero</SelectItem>
                  <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                  <SelectItem value="CATEGORY">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Sort Order</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: !!v }))} /> Active
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={isSubmitting || !form.title || !form.imageUrl}
            onClick={async () => {
              setIsSubmitting(true);
              const result = isEdit ? await updateBannerAction(banner.id, form) : await createBannerAction(form);
              setIsSubmitting(false);
              if (!result.success) return toast.error(result.message);
              toast.success(isEdit ? "Banner updated" : "Banner created");
              setOpen(false);
            }}
          >
            {isSubmitting && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
