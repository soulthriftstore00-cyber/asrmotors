import { describe, it, expect } from "vitest";
import { can, stockDelta, stockLevel, vehicleProfit } from "@/lib/admin/perms";
import { toCsv, parseCsv } from "@/lib/admin/csv";

describe("staff permissions", () => {
  it("service advisor can manage enquiries but not stock", () => {
    expect(can(["service_advisor"], "enquiries")).toBe(true);
    expect(can(["service_advisor"], "inventory")).toBe(false);
  });
  it("inventory manager manages parts and suppliers, not vehicles", () => {
    expect(can(["inventory_manager"], "inventory")).toBe(true);
    expect(can(["inventory_manager"], "suppliers")).toBe(true);
    expect(can(["inventory_manager"], "vehicles")).toBe(false);
  });
  it("sales staff manage vehicles and customers", () => {
    expect(can(["sales"], "vehicles")).toBe(true);
    expect(can(["sales"], "customers")).toBe(true);
    expect(can(["sales"], "enquiries")).toBe(false);
  });
  it("read-only staff can only read", () => {
    expect(can(["readonly"], "read")).toBe(true);
    expect(can(["readonly"], "enquiries")).toBe(false);
  });
  it("users with no role can't read", () => expect(can([], "read")).toBe(false));
  it("only administrators manage staff", () => {
    expect(can(["admin"], "admin")).toBe(true);
    expect(can(["sales", "service_advisor"], "admin")).toBe(false);
  });
});

describe("stock rules", () => {
  it("received adds, consumed subtracts", () => {
    expect(stockDelta("received", 5)).toBe(5);
    expect(stockDelta("consumed", 2)).toBe(-2);
    expect(stockDelta("sold", 3)).toBe(-3);
  });
  it("flags out-of-stock at zero and low at or below minimum", () => {
    expect(stockLevel(0, 3)).toBe("out");
    expect(stockLevel(3, 3)).toBe("low");
    expect(stockLevel(4, 3)).toBe("ok");
  });
});

describe("vehicle profit", () => {
  it("profit = sale price − purchase − expenses", () => {
    expect(vehicleProfit({ purchase_price: 500000, sale_price: 620000 }, 40000)).toEqual({ cost: 540000, profit: 80000 });
  });
  it("unsold vehicle has no profit yet", () => {
    expect(vehicleProfit({ purchase_price: 500000, sale_price: null }, 0).profit).toBeNull();
  });
});

describe("csv", () => {
  it("round-trips commas and quotes", () => {
    const csv = toCsv([{ a: 'Oil, 5W-30 "synthetic"' }], [{ header: "Name", value: (r) => r.a }]);
    expect(parseCsv(csv)).toEqual([{ name: 'Oil, 5W-30 "synthetic"' }]);
  });
});
