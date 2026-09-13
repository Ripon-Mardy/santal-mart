import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserActions } from "@/components/admin/user-actions";

export const metadata: Metadata = { title: "Users" };

const ROLE_TABS = ["", "CUSTOMER", "ADMIN", "SUPER_ADMIN"];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);
  const role = params.get("role");
  const q = params.get("q");

  const where = {
    role: role ? (role as never) : { in: ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] as never },
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { _count: { select: { orders: true } } } }),
    prisma.user.count({ where }),
  ]);
  const result = paginate(users, total, page, take);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {ROLE_TABS.map((r) => (
          <Link key={r} href={r ? `/admin/users?role=${r}` : "/admin/users"} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${role === r || (!role && !r) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            {r || "All"}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Orders</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {result.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></TableCell>
                  <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                  <TableCell className="text-sm">{user._count.orders}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>{user.status === "ACTIVE" ? <Badge>Active</Badge> : <Badge variant="destructive">Suspended</Badge>}</TableCell>
                  <TableCell><UserActions userId={user.id} status={user.status} role={user.role} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/users" /></div>
    </div>
  );
}
