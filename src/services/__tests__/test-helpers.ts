import { prisma } from "@/lib/prisma";

let counter = 0;
/** Deterministic-ish unique suffix so parallel test files never collide on unique fields. */
export function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createTestCategory() {
  const slug = unique("cat");
  return prisma.category.create({ data: { name: slug, slug } });
}

export async function createTestSeller() {
  const slug = unique("seller");
  const user = await prisma.user.create({
    data: { name: slug, email: `${slug}@test.local`, password: "x", role: "SELLER" },
  });
  const seller = await prisma.seller.create({
    data: { userId: user.id, businessName: slug, phone: "0100000000", status: "APPROVED" },
  });
  const store = await prisma.store.create({ data: { sellerId: seller.id, name: slug, slug } });
  return { user, seller, store };
}

export async function createTestCustomer() {
  const slug = unique("customer");
  return prisma.user.create({ data: { name: slug, email: `${slug}@test.local`, password: "x", role: "CUSTOMER" } });
}

export async function createTestProduct(opts: { sellerId: string; storeId: string; categoryId: string; price?: number; stock?: number }) {
  const slug = unique("product");
  const product = await prisma.product.create({
    data: {
      sellerId: opts.sellerId,
      storeId: opts.storeId,
      categoryId: opts.categoryId,
      name: slug,
      slug,
      sku: slug,
      description: "Test product description used only in the automated test suite.",
      price: opts.price ?? 100,
      status: "APPROVED",
      isPublished: true,
    },
  });
  const inventory = await prisma.inventory.create({ data: { productId: product.id, stock: opts.stock ?? 10 } });
  return { product, inventory };
}

export async function createTestAddress(userId: string) {
  return prisma.address.create({
    data: { userId, fullName: "Test User", phone: "0100000000", line1: "123 Test St", city: "Dhaka", division: "Dhaka", isDefault: true },
  });
}
