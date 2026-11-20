import assert from "node:assert/strict";
import test from "node:test";
import { chooseBestOffers } from "../src/aggregation";
import { Hotel } from "../src/types";

const offers: Hotel[] = [
  { hotelId: "a1", name: "Holtin", price: 6000, city: "delhi", commissionPct: 10, supplier: "Supplier A" },
  { hotelId: "b1", name: "Holtin", price: 5340, city: "delhi", commissionPct: 20, supplier: "Supplier B" },
  { hotelId: "a2", name: "Radison", price: 5900, city: "delhi", commissionPct: 13, supplier: "Supplier A" }
];

test("chooses the cheapest offer and removes duplicate hotel names", () => {
  assert.deepEqual(chooseBestOffers(offers), [
    { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 },
    { name: "Radison", price: 5900, supplier: "Supplier A", commissionPct: 13 }
  ]);
});

test("returns an empty result for a city with no offers", () => {
  assert.deepEqual(chooseBestOffers([]), []);
});
