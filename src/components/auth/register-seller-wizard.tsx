"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerSellerSchema,
  type RegisterSellerInput,
} from "@/validations/auth";
import { registerSeller } from "@/features/auth/actions";
import { cn } from "cn";

const STEPS = [
  {
    id: 1,
    title: "Account",
    fields: ["name", "email", "phone", "password", "confirmPassword"] as const,
  },
  {
    id: 2,
    title: "Store Information",
    fields: ["storeName", "storeDescription"] as const,
  },
  {
    id: 3,
    title: "Business Information",
    fields: [
      "businessName",
      "businessType",
      "taxId",
      "city",
      "country",
    ] as const,
  },
  { id: 4, title: "Review & Submit", fields: [] as const },
];

export function RegisterSellerWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterSellerInput>({
    resolver: zodResolver(registerSellerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      storeName: "",
      storeDescription: "",
      businessName: "",
      businessType: "",
      taxId: "",
      city: "",
      country: "Bangladesh",
    },
  });

  async function next() {
    const fields = STEPS[step - 1].fields;
    const valid =
      fields.length === 0 ||
      (await form.trigger([...fields] as (keyof RegisterSellerInput)[]));
    if (valid) setStep((s) => Math.min(STEPS.length, s + 1));
  }

  async function onSubmit(values: RegisterSellerInput) {
    setError(null);
    setIsSubmitting(true);
    const result = await registerSeller(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (success) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <p className="font-medium">Application submitted!</p>
          <p className="text-sm text-muted-foreground">
            Your seller application is under review. We&apos;ll email you once
            it&apos;s approved.
          </p>
        </CardContent>
      </Card>
    );
  }

  const values = form.getValues();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">Become a Seller</CardTitle>
        <CardDescription>
          Step {step} of {STEPS.length}: {STEPS[step - 1].title}
        </CardDescription>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                s.id <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Urban Fashion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 3 && (
              <>
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Retail, Manufacturer"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax/Business ID (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 4 && (
              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {values.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {values.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Store:</span>{" "}
                  {values.storeName}
                </p>
                <p>
                  <span className="text-muted-foreground">Business:</span>{" "}
                  {values.businessName}
                </p>
                <p>
                  <span className="text-muted-foreground">Location:</span>{" "}
                  {values.city}, {values.country}
                </p>
                <p className="pt-2 text-xs text-muted-foreground">
                  By submitting, your application will be reviewed by BazarX
                  admins before your store goes live.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              {step < STEPS.length ? (
                <Button type="button" onClick={next} className="flex-1">
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="animate-spin" />} Submit
                  Application
                </Button>
              )}
            </div>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
