// Mirrors public.has_perm() in the database (the database is the real gate; this only hides controls).
export type Area = "read" | "enquiries" | "customers" | "inventory" | "vehicles" | "suppliers" | "admin";
export const ROLES = ["admin", "service_advisor", "inventory_manager", "sales", "readonly"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  service_advisor: "Service Advisor",
  inventory_manager: "Inventory Manager",
  sales: "Sales Staff",
  readonly: "Read-only Staff",
};

export function can(roles: readonly string[], area: Area): boolean {
  if (roles.includes("admin")) return true;
  if (roles.length === 0) return false;
  switch (area) {
    case "read": return true;
    case "enquiries": return roles.includes("service_advisor");
    case "customers": return roles.includes("service_advisor") || roles.includes("sales");
    case "inventory": return roles.includes("inventory_manager");
    case "vehicles": return roles.includes("sales");
    case "suppliers": return roles.includes("inventory_manager") || roles.includes("sales");
    default: return false;
  }
}

// Stock maths mirrored from record_stock_movement() for previews and tests.
export function stockDelta(type: string, qty: number): number {
  if (type === "received" || type === "returned") return qty;
  if (type === "sold" || type === "consumed") return -qty;
  if (type === "adjusted") return qty;
  throw new Error("Unknown movement type");
}

export function stockLevel(quantity: number, min: number): "out" | "low" | "ok" {
  if (quantity <= 0) return "out";
  if (quantity <= min) return "low";
  return "ok";
}

export function vehicleProfit(v: { purchase_price: number; sale_price: number | null }, expenses: number) {
  const cost = Number(v.purchase_price) + expenses;
  return { cost, profit: v.sale_price == null ? null : Number(v.sale_price) - cost };
}
