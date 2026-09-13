import type { Metadata } from "next";
import { Shapes } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { deleteCategoryAction } from "@/features/admin/actions";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    include: { parent: { select: { name: true } }, _count: { select: { products: true, children: true } } },
  });

  const parentOptions = categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        <CategoryFormDialog parentOptions={parentOptions} />
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={Shapes} title="No categories yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.parentId && "— "}{cat.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.parent?.name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{cat._count.products}</TableCell>
                  <TableCell>{cat.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CategoryFormDialog
                        category={{
                          id: cat.id, name: cat.name, parentId: cat.parentId ?? "", description: cat.description ?? "",
                          imageUrl: cat.imageUrl ?? "", seoTitle: cat.seoTitle ?? "", seoDescription: cat.seoDescription ?? "",
                          sortOrder: cat.sortOrder, isActive: cat.isActive,
                        }}
                        parentOptions={parentOptions}
                      />
                      <DeleteEntityButton onDelete={deleteCategoryAction.bind(null, cat.id)} entityLabel="category" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
