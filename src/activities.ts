import Redis from "ioredis";
import pino from "pino";
import { Hotel, HotelResult, SupplierName } from "./types";

const logger = pino({ name: "hotel-activities" });
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const supplierBaseUrl = process.env.SUPPLIER_BASE_URL ?? "http://localhost:3000";

export async function fetchSupplierOffers(supplier: SupplierName, city: string): Promise<Hotel[]> {
  const path = supplier === "Supplier A" ? "supplierA" : "supplierB";
  const response = await fetch(`${supplierBaseUrl}/${path}/hotels?city=${encodeURIComponent(city)}`);
  if (!response.ok) {
    throw new Error(`${supplier} returned HTTP ${response.status}`);
  }
  return (await response.json()) as Hotel[];
}

export async function saveHotels(city: string, hotels: HotelResult[]): Promise<void> {
  const key = hotelsKey(city);
  const indexKey = hotelsIndexKey(city);
  const pipeline = redis.pipeline();
  pipeline.del(key, indexKey);
  for (const hotel of hotels) {
    pipeline.hset(key, hotel.name, JSON.stringify(hotel));
    pipeline.zadd(indexKey, hotel.price, hotel.name);
  }
  const commands = await pipeline.exec();
  const failedCommand = commands?.find(([error]) => error !== null);
  if (failedCommand) {
    throw failedCommand[0];
  }
  logger.info({ city, count: hotels.length }, "Saved hotel offers in Redis");
}

export async function filterHotelsByPrice(city: string, minPrice = 0, maxPrice = Number.POSITIVE_INFINITY): Promise<HotelResult[]> {
  const names = await redis.zrangebyscore(hotelsIndexKey(city), minPrice, maxPrice);
  if (names.length === 0) {
    return [];
  }
  const values = await redis.hmget(hotelsKey(city), ...names);
  return values.filter((value): value is string => value !== null).map((value) => JSON.parse(value) as HotelResult);
}

function hotelsKey(city: string): string {
  return `hotels:${city.toLowerCase()}`;
}

function hotelsIndexKey(city: string): string {
  return `hotels:price:${city.toLowerCase()}`;
}
