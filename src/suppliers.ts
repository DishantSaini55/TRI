import { Hotel, SupplierName } from "./types";

const offers: Record<SupplierName, Hotel[]> = {
  "Supplier A": [
    { hotelId: "a1", name: "Holtin", price: 6000, city: "delhi", commissionPct: 10, supplier: "Supplier A" },
    { hotelId: "a2", name: "Radison", price: 5900, city: "delhi", commissionPct: 13, supplier: "Supplier A" },
    { hotelId: "a3", name: "Taj View", price: 7200, city: "delhi", commissionPct: 15, supplier: "Supplier A" },
    { hotelId: "a4", name: "Ocean Pearl", price: 4500, city: "mumbai", commissionPct: 12, supplier: "Supplier A" }
  ],
  "Supplier B": [
    { hotelId: "b1", name: "Holtin", price: 5340, city: "delhi", commissionPct: 20, supplier: "Supplier B" },
    { hotelId: "b2", name: "Radison", price: 6100, city: "delhi", commissionPct: 11, supplier: "Supplier B" },
    { hotelId: "b3", name: "Grand Plaza", price: 6800, city: "delhi", commissionPct: 17, supplier: "Supplier B" },
    { hotelId: "b4", name: "Ocean Pearl", price: 4700, city: "mumbai", commissionPct: 9, supplier: "Supplier B" }
  ]
};

export function getSupplierOffers(supplier: SupplierName, city: string): Hotel[] {
  return offers[supplier]
    .filter((hotel) => hotel.city === city.toLowerCase())
    .map((hotel) => ({ ...hotel }));
}
