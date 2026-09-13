"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Store as StoreIcon, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateStoreProfile, uploadStoreImage } from "@/features/seller/actions";

type Store = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
};

export function StoreProfileForm({ store }: { store: Store }) {
  const [form, setForm] = useState({
    name: store.name,
    description: store.description ?? "",
    city: store.city ?? "",
    country: store.country ?? "",
    phone: store.phone ?? "",
    email: store.email ?? "",
  });
  const [logoUrl, setLogoUrl] = useState(store.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(store.bannerUrl);
  const [isSaving, startSaving] = useTransition();
  const [isUploadingLogo, startLogoUpload] = useTransition();
  const [isUploadingBanner, startBannerUpload] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function upload(kind: "logo" | "banner", file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const transition = kind === "logo" ? startLogoUpload : startBannerUpload;
    transition(async () => {
      const result = await uploadStoreImage(kind, fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (kind === "logo") setLogoUrl(result.url ?? null);
      else setBannerUrl(result.url ?? null);
      toast.success(`${kind === "logo" ? "Logo" : "Banner"} updated`);
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Label className="mb-2">Store Banner</Label>
        <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {bannerUrl && <Image src={bannerUrl} alt="Banner" fill className="object-cover" sizes="600px" />}
          <Button type="button" variant="secondary" size="sm" className="relative z-10" disabled={isUploadingBanner} onClick={() => bannerInputRef.current?.click()}>
            {isUploadingBanner ? <Loader2 className="animate-spin" /> : <Upload />} Upload Banner
          </Button>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("banner", e.target.files[0])} />
        </div>
      </div>

      <div>
        <Label className="mb-2">Store Logo</Label>
        <div className="flex items-center gap-4">
          <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-cover" sizes="64px" /> : <StoreIcon className="size-6 text-muted-foreground" />}
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isUploadingLogo} onClick={() => logoInputRef.current?.click()}>
            {isUploadingLogo ? <Loader2 className="animate-spin" /> : <Upload />} Upload Logo
          </Button>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="store-name" className="mb-1.5">Store Name</Label>
          <Input id="store-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="store-desc" className="mb-1.5">Description</Label>
          <Textarea id="store-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="store-city" className="mb-1.5">City</Label>
            <Input id="store-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="store-country" className="mb-1.5">Country</Label>
            <Input id="store-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="store-phone" className="mb-1.5">Phone</Label>
            <Input id="store-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="store-email" className="mb-1.5">Contact Email</Label>
            <Input id="store-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>
        <Button
          disabled={isSaving}
          onClick={() =>
            startSaving(async () => {
              const result = await updateStoreProfile(form);
              if (result.success) toast.success("Store profile updated");
              else toast.error(result.message);
            })
          }
        >
          {isSaving && <Loader2 className="animate-spin" />} Save Changes
        </Button>
      </div>
    </div>
  );
}
