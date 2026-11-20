import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";
import { chooseBestOffers } from "./aggregation";
import { HotelResult } from "./types";

const { fetchSupplierOffers, saveHotels, filterHotelsByPrice } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 3 }
});

export async function aggregateHotels(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelResult[]> {
  const supplierResults = await Promise.allSettled([
    fetchSupplierOffers("Supplier A", city),
    fetchSupplierOffers("Supplier B", city)
  ]);

  const successfulOffers = supplierResults
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchSupplierOffers>>> => result.status === "fulfilled")
    .flatMap((result) => result.value);
  if (successfulOffers.length === 0 && supplierResults.some((result) => result.status === "rejected")) {
    throw new Error("Both hotel suppliers failed");
  }

  const results: HotelResult[] = chooseBestOffers(successfulOffers);
  await saveHotels(city, results);
  return minPrice !== undefined || maxPrice !== undefined
    ? filterHotelsByPrice(city, minPrice, maxPrice)
    : results;
}
