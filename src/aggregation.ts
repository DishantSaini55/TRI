import { Hotel, HotelResult } from "./types";

export function chooseBestOffers(offers: Hotel[]): HotelResult[] {
  const bestByName = new Map<string, Hotel>();
  for (const hotel of offers) {
    const current = bestByName.get(hotel.name);
    if (!current || hotel.price < current.price) {
      bestByName.set(hotel.name, hotel);
    }
  }

  return [...bestByName.values()].map(({ name, price, supplier, commissionPct }) => ({
    name,
    price,
    supplier,
    commissionPct
  }));
}
