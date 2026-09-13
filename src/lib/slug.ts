import slugify from "slugify";

export function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

/**
 * Generates a unique slug by appending -2, -3, ... when the base slug is
 * already taken. `exists` should check uniqueness scoped to the right table
 * (and, for updates, exclude the current record's id).
 */
export async function generateUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = toSlug(base) || "item";
  let candidate = baseSlug;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
