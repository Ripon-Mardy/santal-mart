import type { Metadata } from "next";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { FeatureFlagToggle } from "@/components/admin/feature-flag-toggle";
import { SettingInput } from "@/components/admin/setting-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Settings" };

const GENERAL_SETTINGS = [
  { key: "general.supportEmail", label: "Support Email", group: "general", defaultValue: "support@bazarx.demo" },
  { key: "shipping.defaultRate", label: "Default Shipping Rate (৳)", group: "shipping", defaultValue: "60" },
];

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [flags, settings] = await Promise.all([
    prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
    prisma.setting.findMany({ where: { key: { in: GENERAL_SETTINGS.map((s) => s.key) } } }),
  ]);

  const settingMap = new Map(settings.map((s) => [s.key, s.value]));

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {GENERAL_SETTINGS.map((s) => (
            <div key={s.key}>
              <Label className="mb-1.5">{s.label}</Label>
              <SettingInput settingKey={s.key} initialValue={settingMap.get(s.key) ?? s.defaultValue} group={s.group} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Feature Flags</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{flag.label}</p>
                {flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}
              </div>
              <FeatureFlagToggle flagKey={flag.key} initialEnabled={flag.isEnabled} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
