/**
 * BazarX demo/dev seed script.
 *
 * Reuses the real business-logic services (order.service, order-status
 * service, review/return/payout services) wherever practical so seeded
 * orders go through the exact same inventory-reservation, commission, and
 * wallet-crediting code paths a real checkout does — this is not a
 * separate "fake data" pipeline. Bulk catalog/user creation uses direct
 * Prisma writes since there's no user-facing business rule to exercise
 * there.
 *
 * Run with: npx prisma db seed  (wired up via prisma.config.ts)
 */
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

import { prisma } from "../src/lib/prisma";
import { toSlug } from "../src/lib/slug";
import { createOrder } from "../src/services/order.service";
import { updateSellerOrderStatus } from "../src/services/order-status.service";
import { createReview, moderateReview } from "../src/services/review.service";
import { requestReturn, respondToReturn, completeReturnRefund } from "../src/services/return.service";
import { requestPayout, approvePayout, markPayoutPaid, rejectPayout } from "../src/services/payout.service";
import { setGlobalCommissionRate } from "../src/services/commission.service";
import { notifyUser } from "../src/services/notification.service";
import type { OrderStatus } from "../src/generated/prisma/client";

const DEMO_PASSWORD = "Demo@12345";

const TABLES = [
  "Notification", "AuditLog", "Refund", "ReturnRequest", "Review", "ReviewImage", "SellerReview",
  "CouponUsage", "Coupon", "WalletTransaction", "Wallet", "Payout", "PaymentTransaction", "Payment",
  "OrderStatusEvent", "OrderItem", "SellerOrder", "Order", "CartItem", "Cart", "WishlistItem", "Wishlist",
  "RecentlyViewed", "StoreFollow", "InventoryMovement", "Inventory", "ProductVariant", "ProductTag",
  "ProductImage", "Product", "Commission", "ShippingZone", "Store", "Seller", "Tag", "Brand", "Category",
  "Address", "EmailVerificationToken", "PasswordResetToken", "VerificationToken", "Session", "Account",
  "Setting", "FeatureFlag", "Banner", "User",
];

async function wipeDatabase() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`);
}

function img(seed: string, n = 0) {
  return `https://picsum.photos/seed/bazarx-${seed}-${n}/800/800`;
}

const DIVISIONS: Record<string, string[]> = {
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj"],
  Chattogram: ["Chattogram", "Cox's Bazar"],
  Khulna: ["Khulna", "Jessore"],
  Rajshahi: ["Rajshahi", "Bogura"],
  Sylhet: ["Sylhet"],
  Barishal: ["Barishal"],
  Rangpur: ["Rangpur"],
  Mymensingh: ["Mymensingh"],
};
const DIVISION_NAMES = Object.keys(DIVISIONS);

function randomAddressData() {
  const division = faker.helpers.arrayElement(DIVISION_NAMES);
  const city = faker.helpers.arrayElement(DIVISIONS[division]);
  return {
    fullName: faker.person.fullName(),
    phone: `01${faker.string.numeric(9)}`,
    line1: `House ${faker.number.int({ min: 1, max: 200 })}, Road ${faker.number.int({ min: 1, max: 30 })}, ${faker.location.street()}`,
    city,
    division,
    postalCode: faker.location.zipCode("####"),
    country: "Bangladesh",
  };
}

// ── Category tree ────────────────────────────────────────────────

const CATEGORY_TREE: { name: string; children: string[] }[] = [
  { name: "Electronics", children: ["Mobile Phones", "Laptops & Computers", "Audio & Headphones", "Cameras"] },
  { name: "Fashion", children: ["Men's Clothing", "Women's Clothing", "Shoes"] },
  { name: "Home & Living", children: ["Furniture", "Kitchen & Dining", "Home Decor"] },
  { name: "Beauty & Health", children: ["Skincare", "Personal Care"] },
  { name: "Sports & Outdoors", children: ["Fitness Equipment"] },
  { name: "Books, Toys & Baby", children: ["Books & Stationery", "Toys & Games"] },
];

const CATEGORY_BLURB: Record<string, string> = {
  "mobile-phones": "a powerful smartphone with a stunning display, all-day battery life, and a versatile camera system",
  "laptops-and-computers": "a fast, reliable machine built for work, study, and everything in between",
  "audio-and-headphones": "immersive sound with a comfortable fit for all-day listening",
  cameras: "sharp, professional-grade image quality in a body that's easy to carry anywhere",
  "mens-clothing": "a comfortable, everyday essential made from breathable fabric",
  "womens-clothing": "a flattering, versatile piece that moves easily from day to night",
  shoes: "a supportive, cushioned fit designed for all-day comfort",
  furniture: "sturdy, well-built furniture that fits naturally into any home",
  "kitchen-and-dining": "a kitchen essential that makes everyday cooking faster and easier",
  "home-decor": "a small touch that instantly makes a room feel more finished",
  skincare: "a dermatologist-friendly formula for healthy, glowing skin",
  "personal-care": "a reliable everyday grooming essential",
  "fitness-equipment": "durable gear to help you build a consistent home workout routine",
  "books-and-stationery": "a well-made everyday essential for work, study, or creativity",
  "toys-and-games": "a fun, safe way to keep kids engaged for hours",
};

type ProductTemplate = {
  name: string;
  category: string; // leaf slug
  brand?: string;
  price: number;
  compareAtPrice?: number;
  variants?: { axis: "Color" | "Size"; values: string[] }[];
};

const PRODUCTS: ProductTemplate[] = [
  // Mobile Phones
  { name: "iPhone 15", category: "mobile-phones", brand: "Apple", price: 99999, compareAtPrice: 109999, variants: [{ axis: "Color", values: ["Black", "Blue", "Pink"] }, { axis: "Size", values: ["128GB", "256GB"] }] },
  { name: "iPhone 15 Pro", category: "mobile-phones", brand: "Apple", price: 139999 },
  { name: "iPhone 15 Pro Max", category: "mobile-phones", brand: "Apple", price: 159999 },
  { name: "iPhone 14", category: "mobile-phones", brand: "Apple", price: 84999, compareAtPrice: 92999 },
  { name: "Samsung Galaxy S24", category: "mobile-phones", brand: "Samsung", price: 89999, variants: [{ axis: "Color", values: ["Onyx Black", "Marble Gray", "Cobalt Violet"] }] },
  { name: "Samsung Galaxy S24 Ultra", category: "mobile-phones", brand: "Samsung", price: 129999 },
  { name: "Samsung Galaxy A55", category: "mobile-phones", brand: "Samsung", price: 42999, compareAtPrice: 46999 },
  { name: "Samsung Galaxy Z Flip5", category: "mobile-phones", brand: "Samsung", price: 109999 },
  { name: "Xiaomi Redmi Note 13", category: "mobile-phones", brand: "Xiaomi", price: 24999, compareAtPrice: 27999 },
  { name: "Xiaomi 14", category: "mobile-phones", brand: "Xiaomi", price: 69999 },
  { name: "Xiaomi Poco X6", category: "mobile-phones", brand: "Xiaomi", price: 32999 },

  // Laptops & Computers
  { name: "MacBook Air M2", category: "laptops-and-computers", brand: "Apple", price: 149999, compareAtPrice: 159999 },
  { name: 'MacBook Pro 14"', category: "laptops-and-computers", brand: "Apple", price: 219999 },
  { name: "Dell XPS 13", category: "laptops-and-computers", brand: "Dell", price: 129999 },
  { name: "Dell Inspiron 15", category: "laptops-and-computers", brand: "Dell", price: 59999, compareAtPrice: 64999 },
  { name: "HP Pavilion 15", category: "laptops-and-computers", brand: "HP", price: 74999 },
  { name: "HP Spectre x360", category: "laptops-and-computers", brand: "HP", price: 159999 },
  { name: "HP Envy 14", category: "laptops-and-computers", brand: "HP", price: 99999 },
  { name: "Mechanical Keyboard RGB", category: "laptops-and-computers", brand: "Logitech", price: 4999, variants: [{ axis: "Color", values: ["Black", "White"] }] },
  { name: "Logitech MX Master 3S Mouse", category: "laptops-and-computers", brand: "Logitech", price: 9999 },
  { name: "Lenovo IdeaPad Slim 3", category: "laptops-and-computers", price: 54999 },

  // Audio & Headphones
  { name: "Sony WH-1000XM5 Headphones", category: "audio-and-headphones", brand: "Sony", price: 34999, compareAtPrice: 38999 },
  { name: "Sony WF-1000XM5 Earbuds", category: "audio-and-headphones", brand: "Sony", price: 24999 },
  { name: "JBL Flip 6 Speaker", category: "audio-and-headphones", brand: "JBL", price: 12999, variants: [{ axis: "Color", values: ["Black", "Blue", "Red"] }] },
  { name: "JBL Tune 720BT Headphones", category: "audio-and-headphones", brand: "JBL", price: 6999 },
  { name: "JBL Tune Buds", category: "audio-and-headphones", brand: "JBL", price: 5499 },
  { name: "Samsung Galaxy Buds2 Pro", category: "audio-and-headphones", brand: "Samsung", price: 17999 },
  { name: "Logitech G435 Gaming Headset", category: "audio-and-headphones", brand: "Logitech", price: 8999 },

  // Cameras
  { name: "Canon EOS R50 Camera", category: "cameras", brand: "Canon", price: 89999 },
  { name: "Canon PowerShot G7X", category: "cameras", brand: "Canon", price: 59999 },
  { name: "Canon EOS 200D", category: "cameras", brand: "Canon", price: 69999, compareAtPrice: 74999 },
  { name: "Sony Alpha a6400 Camera", category: "cameras", brand: "Sony", price: 109999 },
  { name: "Sony ZV-1 Vlogging Camera", category: "cameras", brand: "Sony", price: 64999 },

  // Men's Clothing
  { name: "Cotton T-Shirt", category: "mens-clothing", brand: "Puma", price: 899, variants: [{ axis: "Color", values: ["Black", "White", "Navy"] }, { axis: "Size", values: ["S", "M", "L", "XL"] }] },
  { name: "Casual Polo Shirt", category: "mens-clothing", brand: "Nike", price: 1499, variants: [{ axis: "Color", values: ["Black", "Green"] }, { axis: "Size", values: ["S", "M", "L", "XL"] }] },
  { name: "Formal Shirt", category: "mens-clothing", price: 1299 },
  { name: "Hooded Sweatshirt", category: "mens-clothing", brand: "Adidas", price: 2499, variants: [{ axis: "Color", values: ["Grey", "Black"] }, { axis: "Size", values: ["M", "L", "XL"] }] },
  { name: "Cargo Pants", category: "mens-clothing", price: 1799 },
  { name: "Formal Blazer", category: "mens-clothing", price: 3999, compareAtPrice: 4599 },
  { name: "Men's Track Suit", category: "mens-clothing", brand: "Adidas", price: 2999 },
  { name: "Winter Jacket", category: "mens-clothing", price: 3499 },
  { name: "Denim Jeans Slim Fit", category: "mens-clothing", price: 1999 },

  // Women's Clothing
  { name: "Floral Summer Dress", category: "womens-clothing", price: 1999, variants: [{ axis: "Size", values: ["S", "M", "L"] }] },
  { name: "Women's Denim Jacket", category: "womens-clothing", price: 2799 },
  { name: "Georgette Saree", category: "womens-clothing", price: 3499, compareAtPrice: 3999 },
  { name: "Women's Kurti", category: "womens-clothing", price: 1299, variants: [{ axis: "Color", values: ["Maroon", "Teal", "Mustard"] }, { axis: "Size", values: ["S", "M", "L"] }] },
  { name: "Yoga Leggings", category: "womens-clothing", brand: "Adidas", price: 1599, variants: [{ axis: "Size", values: ["S", "M", "L"] }] },
  { name: "Party Gown", category: "womens-clothing", price: 4999 },
  { name: "Cotton Kurti Set", category: "womens-clothing", price: 1899 },
  { name: "Women's Cardigan", category: "womens-clothing", price: 1699 },

  // Shoes
  { name: "Running Shoes", category: "shoes", brand: "Nike", price: 5999, compareAtPrice: 6999, variants: [{ axis: "Size", values: ["40", "41", "42", "43", "44"] }] },
  { name: "Air Cushion Sneakers", category: "shoes", brand: "Adidas", price: 6499, variants: [{ axis: "Size", values: ["40", "41", "42", "43"] }] },
  { name: "Puma Sports Sandals", category: "shoes", brand: "Puma", price: 2499 },
  { name: "Formal Leather Shoes", category: "shoes", price: 3999 },
  { name: "Women's Heels", category: "shoes", price: 2999 },
  { name: "Kids Sneakers", category: "shoes", brand: "Puma", price: 2799, variants: [{ axis: "Size", values: ["28", "30", "32", "34"] }] },
  { name: "Men's Sandals", category: "shoes", price: 1499 },
  { name: "Casual Loafers", category: "shoes", price: 3299 },

  // Furniture
  { name: "Ergonomic Office Chair", category: "furniture", price: 8999, compareAtPrice: 10999 },
  { name: "Wooden Dining Table Set", category: "furniture", price: 24999 },
  { name: "3-Seater Sofa", category: "furniture", price: 39999 },
  { name: "Bookshelf Cabinet", category: "furniture", price: 6999 },
  { name: "Study Table", category: "furniture", price: 5499 },
  { name: "TV Unit Cabinet", category: "furniture", price: 8499 },
  { name: "Shoe Rack Organizer", category: "furniture", price: 2499 },

  // Kitchen & Dining
  { name: "Non-Stick Cookware Set", category: "kitchen-and-dining", brand: "Philips", price: 3999 },
  { name: "Electric Kettle", category: "kitchen-and-dining", brand: "Philips", price: 1799 },
  { name: "Blender & Juicer", category: "kitchen-and-dining", brand: "Bosch", price: 3499 },
  { name: "Dinner Set 24-Piece", category: "kitchen-and-dining", price: 2999 },
  { name: "Air Fryer", category: "kitchen-and-dining", brand: "Philips", price: 6999, compareAtPrice: 7999 },
  { name: "Rice Cooker", category: "kitchen-and-dining", brand: "Philips", price: 2499 },
  { name: "Microwave Oven", category: "kitchen-and-dining", brand: "Bosch", price: 12999 },

  // Home Decor
  { name: "Wall Clock", category: "home-decor", price: 999 },
  { name: "LED String Lights", category: "home-decor", price: 599 },
  { name: "Decorative Vase Set", category: "home-decor", price: 1299 },
  { name: "Photo Frame Set", category: "home-decor", price: 799 },
  { name: "Wall Art Canvas", category: "home-decor", price: 1499 },
  { name: "Table Lamp", category: "home-decor", price: 1199 },
  { name: "Curtain Set", category: "home-decor", price: 1899 },

  // Skincare
  { name: "Vitamin C Face Serum", category: "skincare", price: 899 },
  { name: "Hydrating Face Moisturizer", category: "skincare", price: 749 },
  { name: "Sunscreen SPF50", category: "skincare", price: 649 },
  { name: "Charcoal Face Wash", category: "skincare", price: 399 },
  { name: "Anti-Aging Night Cream", category: "skincare", price: 1299, compareAtPrice: 1499 },
  { name: "Lip Balm Set", category: "skincare", price: 349 },
  { name: "Face Mask Pack (5-Pack)", category: "skincare", price: 599 },

  // Personal Care
  { name: "Electric Shaver", category: "personal-care", brand: "Philips", price: 2999 },
  { name: "Hair Dryer", category: "personal-care", brand: "Philips", price: 1899 },
  { name: "Electric Toothbrush", category: "personal-care", brand: "Philips", price: 2499 },
  { name: "Trimmer Kit", category: "personal-care", brand: "Bosch", price: 1999 },
  { name: "Nail Care Kit", category: "personal-care", price: 699 },
  { name: "Perfume Gift Set", category: "personal-care", price: 1799 },

  // Fitness Equipment
  { name: "Yoga Mat", category: "fitness-equipment", price: 899 },
  { name: "Adjustable Dumbbell Set", category: "fitness-equipment", price: 4999 },
  { name: "Treadmill Home Edition", category: "fitness-equipment", price: 59999 },
  { name: "Resistance Bands Set", category: "fitness-equipment", price: 599 },
  { name: "Smart Watch Fitness Tracker", category: "fitness-equipment", brand: "Samsung", price: 8999, compareAtPrice: 10499, variants: [{ axis: "Color", values: ["Black", "Silver", "Rose Gold"] }] },
  { name: "Jump Rope", category: "fitness-equipment", price: 399 },
  { name: "Gym Gloves", category: "fitness-equipment", price: 599 },
  { name: "Cycling Helmet", category: "fitness-equipment", price: 1999 },

  // Books & Stationery
  { name: "Notebook Set (5-Pack)", category: "books-and-stationery", price: 299 },
  { name: "Fountain Pen Set", category: "books-and-stationery", price: 599 },
  { name: "Desk Organizer", category: "books-and-stationery", price: 799 },
  { name: "Backpack", category: "books-and-stationery", price: 1999, compareAtPrice: 2399, variants: [{ axis: "Color", values: ["Black", "Grey", "Blue"] }] },
  { name: "Kids Story Book Bundle", category: "books-and-stationery", price: 899 },
  { name: "Art Supplies Kit", category: "books-and-stationery", price: 1199 },
  { name: "Sticky Notes Pack", category: "books-and-stationery", price: 199 },
  { name: "Scientific Calculator", category: "books-and-stationery", price: 899 },

  // Toys & Games
  { name: "Building Blocks Set", category: "toys-and-games", price: 1499 },
  { name: "Remote Control Car", category: "toys-and-games", price: 2499, compareAtPrice: 2999 },
  { name: "Educational Puzzle Set", category: "toys-and-games", price: 699 },
  { name: "Plush Teddy Bear", category: "toys-and-games", price: 899 },
  { name: "Baby Stroller", category: "toys-and-games", price: 8999 },
  { name: "Board Game Classic", category: "toys-and-games", price: 1299 },
  { name: "Mini Drone Toy", category: "toys-and-games", price: 3499 },
  { name: "Building Bricks Mega Set", category: "toys-and-games", price: 2999 },
];

const SELLERS = [
  { store: "TechWorld", business: "TechWorld Electronics Ltd.", city: "Dhaka", division: "Dhaka", focus: ["mobile-phones", "laptops-and-computers", "cameras"] },
  { store: "GadgetHub", business: "GadgetHub Trading Co.", city: "Dhaka", division: "Dhaka", focus: ["mobile-phones", "audio-and-headphones", "cameras"] },
  { store: "Urban Fashion", business: "Urban Fashion House", city: "Dhaka", division: "Dhaka", focus: ["mens-clothing", "womens-clothing"] },
  { store: "Style House", business: "Style House BD", city: "Chattogram", division: "Chattogram", focus: ["womens-clothing", "shoes"] },
  { store: "HomeNest", business: "HomeNest Living Ltd.", city: "Dhaka", division: "Dhaka", focus: ["furniture", "home-decor"] },
  { store: "KitchenCraft", business: "KitchenCraft Supplies", city: "Khulna", division: "Khulna", focus: ["kitchen-and-dining"] },
  { store: "BeautyBox", business: "BeautyBox Cosmetics BD", city: "Dhaka", division: "Dhaka", focus: ["skincare", "personal-care"] },
  { store: "SportsZone", business: "SportsZone BD", city: "Rajshahi", division: "Rajshahi", focus: ["fitness-equipment", "shoes"] },
  { store: "BookNest", business: "BookNest Publishers", city: "Dhaka", division: "Dhaka", focus: ["books-and-stationery"] },
  { store: "KidsCorner", business: "KidsCorner Toys & Baby", city: "Sylhet", division: "Sylhet", focus: ["toys-and-games", "books-and-stationery"] },
];

const BRAND_NAMES = ["Apple", "Samsung", "Sony", "Xiaomi", "HP", "Dell", "Logitech", "Nike", "Adidas", "Puma", "JBL", "Canon", "Philips", "Bosch", "LG"];

async function main() {
  console.log("🌱 Wiping database...");
  await wipeDatabase();

  console.log("⚙️  Seeding settings & feature flags...");
  await setGlobalCommissionRate(10);
  await prisma.featureFlag.createMany({
    data: [
      { key: "ENABLE_WISHLIST", label: "Wishlist", isEnabled: true },
      { key: "ENABLE_PRODUCT_COMPARISON", label: "Product Comparison", isEnabled: true },
      { key: "ENABLE_SELLER_REVIEWS", label: "Seller Reviews", isEnabled: true },
      { key: "ENABLE_COD", label: "Cash on Delivery", isEnabled: true },
    ],
  });
  await prisma.shippingZone.createMany({
    data: [
      { name: "Inside Dhaka", division: "Dhaka", flatRate: 60, isDefault: true },
      { name: "Outside Dhaka", flatRate: 120, isDefault: false },
    ],
  });

  console.log("📁 Seeding categories...");
  const categoryBySlug = new Map<string, string>();
  for (const parent of CATEGORY_TREE) {
    const parentSlug = toSlug(parent.name);
    const parentRow = await prisma.category.create({ data: { name: parent.name, slug: parentSlug, isActive: true } });
    categoryBySlug.set(parentSlug, parentRow.id);
    for (const childName of parent.children) {
      const childSlug = toSlug(childName);
      const childRow = await prisma.category.create({
        data: { name: childName, slug: childSlug, parentId: parentRow.id, isActive: true, imageUrl: img(`cat-${childSlug}`) },
      });
      categoryBySlug.set(childSlug, childRow.id);
    }
  }

  console.log("🏷️  Seeding brands...");
  const brandByName = new Map<string, string>();
  for (const name of BRAND_NAMES) {
    const brand = await prisma.brand.create({ data: { name, slug: toSlug(name), logoUrl: img(`brand-${toSlug(name)}`), isActive: true } });
    brandByName.set(name, brand.id);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("👑 Seeding admins...");
  await prisma.user.create({ data: { name: "BazarX Super Admin", email: "superadmin@bazarx.demo", password: passwordHash, role: "SUPER_ADMIN", emailVerified: new Date() } });
  await prisma.user.create({ data: { name: "Admin One", email: "admin@bazarx.demo", password: passwordHash, role: "ADMIN", emailVerified: new Date() } });
  await prisma.user.create({ data: { name: "Admin Two", email: "admin2@bazarx.demo", password: passwordHash, role: "ADMIN", emailVerified: new Date() } });

  console.log("🏪 Seeding sellers & stores...");
  const sellers: { id: string; userId: string; storeId: string; focus: string[]; storeName: string }[] = [];
  for (let i = 0; i < SELLERS.length; i++) {
    const s = SELLERS[i];
    const email = i === 0 ? "seller@bazarx.demo" : `seller${i + 1}@bazarx.demo`;
    const user = await prisma.user.create({
      data: { name: `${s.store} Owner`, email, phone: `01${faker.string.numeric(9)}`, password: passwordHash, role: "SELLER", emailVerified: new Date() },
    });
    await prisma.cart.create({ data: { userId: user.id } });
    await prisma.wishlist.create({ data: { userId: user.id } });

    const seller = await prisma.seller.create({
      data: { userId: user.id, businessName: s.business, businessType: "Retail", phone: user.phone!, status: "APPROVED", approvedAt: new Date() },
    });
    await prisma.wallet.create({ data: { sellerId: seller.id } });

    const store = await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: s.store,
        slug: toSlug(s.store),
        description: `${s.store} is a trusted BazarX seller specializing in ${s.focus.map((f) => f.replace(/-/g, " ")).join(", ")}.`,
        logoUrl: img(`store-logo-${toSlug(s.store)}`),
        bannerUrl: img(`store-banner-${toSlug(s.store)}`, 1),
        city: s.city,
        country: "Bangladesh",
        email,
        phone: user.phone!,
      },
    });

    sellers.push({ id: seller.id, userId: user.id, storeId: store.id, focus: s.focus, storeName: s.store });
  }

  // One seller-specific commission override + one category override, to demonstrate priority resolution.
  await prisma.commission.create({ data: { scope: "SELLER", sellerId: sellers[0].id, rate: 7 } });
  await prisma.commission.create({ data: { scope: "CATEGORY", categoryId: categoryBySlug.get("mobile-phones"), rate: 8 } });
  await prisma.shippingZone.create({ data: { sellerId: sellers[0].id, name: "TechWorld Express (Dhaka)", division: "Dhaka", flatRate: 40 } });

  console.log("👥 Seeding customers...");
  const customers: { id: string; addressId: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const email = i === 0 ? "customer@bazarx.demo" : faker.internet.email({ provider: "example.com" }).toLowerCase() + i;
    const name = i === 0 ? "Demo Customer" : faker.person.fullName();
    const user = await prisma.user.create({
      data: { name, email, phone: `01${faker.string.numeric(9)}`, password: passwordHash, role: "CUSTOMER", emailVerified: new Date() },
    });
    await prisma.cart.create({ data: { userId: user.id } });
    await prisma.wishlist.create({ data: { userId: user.id } });

    const addr = randomAddressData();
    const address = await prisma.address.create({ data: { ...addr, userId: user.id, isDefault: true, type: "HOME" } });
    customers.push({ id: user.id, addressId: address.id });
  }

  console.log("📦 Seeding products (this creates 100+ listings)...");
  const approvedProductIds: { id: string; price: number; categoryId: string; sellerId: string }[] = [];
  let skuCounter = 1000;

  for (const template of PRODUCTS) {
    const categoryId = categoryBySlug.get(template.category);
    if (!categoryId) continue;

    const candidateSellers = sellers.filter((s) => s.focus.includes(template.category));
    const seller = candidateSellers.length > 0 ? faker.helpers.arrayElement(candidateSellers) : faker.helpers.arrayElement(sellers);

    const slug = await (async () => {
      const base = toSlug(template.name);
      let candidate = base;
      let n = 2;
      // Product names repeat across sellers in real marketplaces — keep slugs unique.
      while (await prisma.product.findUnique({ where: { slug: candidate } })) {
        candidate = `${base}-${n}`;
        n += 1;
      }
      return candidate;
    })();

    const sku = `BX-${skuCounter++}`;
    const statusRoll = faker.number.int({ min: 1, max: 100 });
    const status = statusRoll <= 82 ? "APPROVED" : statusRoll <= 92 ? "PENDING_REVIEW" : statusRoll <= 97 ? "DRAFT" : "REJECTED";
    const isPublished = status === "APPROVED";
    const isFeatured = status === "APPROVED" && faker.number.int({ min: 1, max: 100 }) <= 15;

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        storeId: seller.storeId,
        categoryId,
        brandId: template.brand ? brandByName.get(template.brand) : undefined,
        name: template.name,
        slug,
        sku,
        description: `${template.name} — ${CATEGORY_BLURB[template.category] ?? "a quality product available on BazarX"}. Sold and shipped by ${seller.storeName}.`,
        shortDescription: `${template.name} from ${template.brand ?? seller.storeName}.`,
        price: template.price,
        compareAtPrice: template.compareAtPrice,
        costPrice: Math.round(template.price * 0.7),
        lowStockThreshold: 5,
        status,
        isPublished,
        isFeatured,
        rejectionReason: status === "REJECTED" ? "Product images do not meet quality guidelines. Please upload clearer photos." : undefined,
        seoTitle: `Buy ${template.name} in Bangladesh | BazarX`,
        seoDescription: `${template.name} — ${CATEGORY_BLURB[template.category] ?? "shop now on BazarX"}.`,
        images: {
          create: [0, 1, 2].map((n) => ({ url: img(slug, n), isPrimary: n === 0, sortOrder: n, altText: template.name })),
        },
      },
    });

    if (template.variants && template.variants.length > 0) {
      const [axis1, axis2] = template.variants;
      const combos: Record<string, string>[] = [];
      for (const v1 of axis1.values) {
        if (axis2) {
          for (const v2 of axis2.values) combos.push({ [axis1.axis]: v1, [axis2.axis]: v2 });
        } else {
          combos.push({ [axis1.axis]: v1 });
        }
      }
      for (const [i, combo] of combos.entries()) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `${sku}-V${i + 1}`,
            name: Object.values(combo).join(" / "),
            options: combo,
          },
        });
        await prisma.inventory.create({ data: { productId: product.id, variantId: variant.id, stock: faker.number.int({ min: 8, max: 60 }) } });
      }
    } else {
      await prisma.inventory.create({ data: { productId: product.id, stock: faker.number.int({ min: 5, max: 100 }) } });
    }

    if (status === "APPROVED") approvedProductIds.push({ id: product.id, price: template.price, categoryId, sellerId: seller.id });
  }
  console.log(`   → ${PRODUCTS.length} products created (${approvedProductIds.length} approved & live).`);

  console.log("🎟️  Seeding coupons...");
  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 86_400_000);
  const past = (days: number) => new Date(now.getTime() - days * 86_400_000);
  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME10", discountType: "PERCENTAGE", value: 10, maxDiscount: 500, usageLimit: 1000, perUserLimit: 1, startsAt: past(30), endsAt: future(60), description: "10% off your first order" },
      { code: "SAVE500", discountType: "FIXED_AMOUNT", value: 500, minOrderAmount: 3000, usageLimit: 500, perUserLimit: 2, startsAt: past(10), endsAt: future(30), description: "৳500 off orders over ৳3000" },
      { code: "FREESHIP", discountType: "FREE_SHIPPING", value: 0, usageLimit: 1000, perUserLimit: 3, startsAt: past(10), endsAt: future(90), description: "Free shipping on any order" },
      { code: "TECH15", discountType: "PERCENTAGE", value: 15, maxDiscount: 3000, categoryId: categoryBySlug.get("mobile-phones"), startsAt: past(5), endsAt: future(20), description: "15% off mobile phones" },
      { code: "TECHWORLD20", discountType: "PERCENTAGE", value: 20, maxDiscount: 5000, sellerId: sellers[0].id, startsAt: past(5), endsAt: future(20), description: "20% off at TechWorld" },
      { code: "EXPIRED5", discountType: "PERCENTAGE", value: 5, startsAt: past(60), endsAt: past(30), description: "An expired promo (for demo)" },
    ],
  });

  console.log("🖼️  Seeding banners...");
  await prisma.banner.createMany({
    data: [
      { title: "One Marketplace. Thousands of Stores.", subtitle: "Discover products from trusted sellers across Bangladesh", imageUrl: img("hero-1"), ctaText: "Shop Now", ctaUrl: "/search", type: "HERO", isActive: true, sortOrder: 0 },
      { title: "Flash Sale — Up to 30% Off Electronics", subtitle: "Limited time only", imageUrl: img("hero-2"), ctaText: "Shop Deals", ctaUrl: "/search?hasDiscount=true", type: "HERO", isActive: true, sortOrder: 1 },
      { title: "Start Selling on BazarX", subtitle: "Create your store and reach thousands of customers", imageUrl: img("hero-3"), ctaText: "Become a Seller", ctaUrl: "/register/seller", type: "HERO", isActive: true, sortOrder: 2 },
      { title: "New Season Fashion", imageUrl: img("promo-fashion"), ctaText: "Explore", ctaUrl: `/category/${"fashion"}`, type: "PROMOTIONAL", isActive: true, sortOrder: 0 },
      { title: "Home Essentials", imageUrl: img("promo-home"), ctaText: "Shop Home", ctaUrl: `/category/${"home-living"}`, type: "PROMOTIONAL", isActive: true, sortOrder: 1 },
    ],
  });

  console.log("🛒 Seeding orders (this exercises the real checkout pipeline)...");
  const paymentMethods = ["COD", "MOCK_CARD", "MOCK_WALLET"] as const;
  const orderIds: string[] = [];

  for (let i = 0; i < 55; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const lineCount = faker.number.int({ min: 1, max: 3 });
    const products = faker.helpers.arrayElements(approvedProductIds, Math.min(lineCount, approvedProductIds.length));

    try {
      const order = await createOrder({
        userId: customer.id,
        addressId: customer.addressId,
        paymentMethod: faker.helpers.arrayElement(paymentMethods),
        lines: products.map((p) => ({ productId: p.id, quantity: faker.number.int({ min: 1, max: 2 }) })),
      });
      orderIds.push(order.id);
    } catch {
      // A rare stock clash between seeded orders is fine — just skip this one.
    }
  }
  console.log(`   → ${orderIds.length} orders created.`);

  console.log("🚚 Advancing order lifecycles...");
  const FORWARD: OrderStatus[] = ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
  const deliveredItemsForReview: { orderItemId: string; userId: string }[] = [];

  for (const orderId of orderIds) {
    const sellerOrders = await prisma.sellerOrder.findMany({ where: { orderId }, include: { items: true, order: true } });
    for (const so of sellerOrders) {
      const roll = faker.number.int({ min: 1, max: 100 });
      if (roll <= 8) continue; // stays PENDING
      if (roll <= 15) {
        await updateSellerOrderStatus(so.id, "CANCELLED", { cancelReason: "Customer requested cancellation" });
        continue;
      }
      const steps = roll <= 30 ? 2 : roll <= 45 ? 4 : 6; // how far to advance
      for (let s = 0; s < steps; s++) {
        const next = FORWARD[s];
        try {
          await updateSellerOrderStatus(so.id, next, s === 3 ? { trackingNumber: `TRK${faker.string.numeric(9)}`, shippingCarrier: "Pathao Courier" } : {});
        } catch {
          break;
        }
      }
      if (steps === 6) {
        for (const item of so.items) deliveredItemsForReview.push({ orderItemId: item.id, userId: so.order.userId });
      }
    }
  }

  console.log("⭐ Seeding reviews...");
  let reviewIndex = 0;
  for (const { orderItemId, userId } of deliveredItemsForReview) {
    if (faker.number.int({ min: 1, max: 100 }) > 60) continue; // not every delivered item gets reviewed
    try {
      const review = await createReview({
        userId,
        orderItemId,
        rating: faker.number.int({ min: 3, max: 5 }),
        title: faker.helpers.arrayElement(["Great product!", "Highly recommend", "Good value for money", "Exactly as described", "Fast delivery"]),
        comment: faker.helpers.arrayElement([
          "Exactly what I was looking for. Quality is great and delivery was fast.",
          "Good value for the price. Would buy again from this seller.",
          "Product matches the description perfectly. Packaging was solid.",
          "Really happy with this purchase, works as expected.",
          "Decent quality, delivery took a bit longer than expected but worth it.",
        ]),
      });
      reviewIndex += 1;
      // Most reviews get approved; moderate a couple explicitly (one rejected) for the admin demo queue.
      await moderateReview(review.id, reviewIndex % 11 === 0 ? "REJECTED" : "APPROVED");
    } catch {
      // Skip if already reviewed etc.
    }
  }
  console.log(`   → ${reviewIndex} reviews created.`);

  console.log("↩️  Seeding a couple of return/refund flows...");
  const returnCandidates = deliveredItemsForReview.slice(0, 3);
  for (const [i, { orderItemId, userId }] of returnCandidates.entries()) {
    try {
      const rr = await requestReturn({ userId, orderItemId, reason: "DAMAGED", description: "Item arrived with a small defect." });
      if (i === 0) {
        await respondToReturn(rr.id, "APPROVE", { note: "Approved — please ship it back." });
        await completeReturnRefund(rr.id);
      } else if (i === 1) {
        await respondToReturn(rr.id, "REJECT", { note: "Item shows signs of use beyond normal wear." });
      }
      // i === 2 stays REQUESTED, pending seller response — a live demo item for the seller/admin queue.
    } catch {
      // ignore
    }
  }

  console.log("💰 Seeding payouts...");
  for (const seller of sellers.slice(0, 4)) {
    const wallet = await prisma.wallet.findUnique({ where: { sellerId: seller.id } });
    if (!wallet || Number(wallet.balance) < 100) continue;
    const amount = Math.floor(Number(wallet.balance) * 0.5);
    if (amount <= 0) continue;
    try {
      const payout = await requestPayout(seller.id, amount);
      if (seller === sellers[0]) {
        await approvePayout(payout.id);
        await markPayoutPaid(payout.id, "Paid via bank transfer");
      } else if (seller === sellers[1]) {
        await rejectPayout(payout.id, "Bank details need verification");
      }
      // others stay PENDING for the admin queue demo.
    } catch {
      // insufficient balance edge case — ignore
    }
  }

  console.log("🔔 Seeding a couple of system notifications for admins...");
  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  for (const admin of admins) {
    await notifyUser({ userId: admin.id, type: "SYSTEM", title: "Welcome to BazarX Admin", message: "Your marketplace is live with demo data. Review pending sellers and products to get started.", link: "/admin/dashboard" });
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Demo accounts (password: Demo@12345):");
  console.log("  Super Admin:  superadmin@bazarx.demo");
  console.log("  Admin:        admin@bazarx.demo");
  console.log("  Seller:       seller@bazarx.demo  (store: TechWorld)");
  console.log("  Customer:     customer@bazarx.demo\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
