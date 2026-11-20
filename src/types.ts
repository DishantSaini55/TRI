export type SupplierName = "Supplier A" | "Supplier B";

export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
  supplier: SupplierName;
}

export interface HotelResult {
  name: string;
  price: number;
  supplier: SupplierName;
  commissionPct: number;
}
