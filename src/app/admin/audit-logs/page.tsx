import type { Metadata } from "next";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatDateTime, formatStatus } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminAuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params, 30);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip, take, include: { user: { select: { name: true, email: true } } } }),
    prisma.auditLog.count(),
  ]);
  const result = paginate(logs, total, page, take);

  if (result.items.length === 0) return <EmptyState icon={ScrollText} title="No audit log entries yet" />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Admin</TableHead><TableHead>IP</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {result.items.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{formatStatus(log.action)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}</TableCell>
                <TableCell className="text-sm">{log.user?.name ?? "System"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.ipAddress ?? "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/audit-logs" /></div>
    </div>
  );
}
