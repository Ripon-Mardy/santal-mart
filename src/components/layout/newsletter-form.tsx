"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { subscribeToNewsletter } from "@/features/newsletter/actions";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 flex max-w-xs gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await subscribeToNewsletter({ email });
          if (result.success) {
            toast.success("Subscribed! Watch your inbox for deals.");
            setEmail("");
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <Input
        type="email"
        required
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-9"
        aria-label="Email for newsletter"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "..." : "Subscribe"}
      </Button>
    </form>
  );
}
