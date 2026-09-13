import Link from "next/link";

export function CategoryNav({ categories }: { categories: { id: string; name: string; slug: string }[] }) {
  return (
    <nav className="flex items-center gap-6 overflow-x-auto text-sm">
      {categories.map((c) => (
        <Link key={c.id} href={`/category/${c.slug}`} className="whitespace-nowrap text-muted-foreground hover:text-primary">
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
