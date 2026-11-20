import assert from "node:assert/strict";
import test from "node:test";
import { getSupplierOffers } from "../src/suppliers";

test("suppliers provide overlapping Delhi hotels", () => {
  const supplierA = getSupplierOffers("Supplier A", "DELHI");
  const supplierB = getSupplierOffers("Supplier B", "delhi");
  const namesA = new Set(supplierA.map((hotel) => hotel.name));
  assert.ok(supplierB.some((hotel) => namesA.has(hotel.name)));
});

test("unknown cities return no offers", () => {
  assert.deepEqual(getSupplierOffers("Supplier A", "jaipur"), []);
});
