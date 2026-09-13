"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateProfileSchema } from "@/validations/account";
import { updateProfile, uploadAvatar } from "@/features/account/actions";
import { z } from "zod";

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; avatarUrl: string | null } }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Change avatar"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("file", file);
              startUpload(async () => {
                const result = await uploadAvatar(fd);
                if (result.success) toast.success("Avatar updated");
                else toast.error(result.message);
              });
            }}
          />
        </div>
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {isUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
        </div>
      </div>

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setIsSubmitting(true);
            const result = await updateProfile(values);
            setIsSubmitting(false);
            if (result.success) toast.success("Profile updated");
            else toast.error(result.message);
          })}
        >
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormItem>
            <FormLabel>Email</FormLabel>
            <Input value={user.email} disabled />
          </FormItem>
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />} Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
