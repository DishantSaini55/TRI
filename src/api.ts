import express, { Request, Response } from "express";
import pinoHttp from "pino-http";
import { Connection, Client } from "@temporalio/client";
import { getSupplierOffers } from "./suppliers";

const app = express();
app.use(express.json());
app.use(pinoHttp());

const temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
const port = Number(process.env.PORT ?? 3000);
let temporalClient: Client;

app.get("/supplierA/hotels", (req: Request, res: Response) => {
  res.json(getSupplierOffers("Supplier A", String(req.query.city ?? "")));
});

app.get("/supplierB/hotels", (req: Request, res: Response) => {
  res.json(getSupplierOffers("Supplier B", String(req.query.city ?? "")));
});

app.get("/health", async (_req: Request, res: Response) => {
  const [supplierA, supplierB] = await Promise.all(
    ["supplierA", "supplierB"].map(async (supplier) => {
      try {
        const response = await fetch(`http://localhost:${port}/${supplier}/hotels?city=delhi`);
        return response.ok;
      } catch {
        return false;
      }
    })
  );
  const healthy = supplierA && supplierB;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    suppliers: { supplierA: supplierA ? "up" : "down", supplierB: supplierB ? "up" : "down" }
  });
});

app.get("/api/hotels", async (req: Request, res: Response) => {
  const city = String(req.query.city ?? "").trim().toLowerCase();
  if (!city) {
    res.status(400).json({ error: "Query parameter 'city' is required" });
    return;
  }

  const minPrice = parseOptionalPrice(req.query.minPrice, "minPrice", res);
  const maxPrice = parseOptionalPrice(req.query.maxPrice, "maxPrice", res);
  if (minPrice === null || maxPrice === null) {
    return;
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    res.status(400).json({ error: "minPrice must be less than or equal to maxPrice" });
    return;
  }

  try {
    const result = await temporalClient.workflow.execute("aggregateHotels", {
      taskQueue: "hotel-offers",
      workflowId: `hotel-offers-${city}-${Date.now()}`,
      args: [city, minPrice, maxPrice]
    });
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "Hotel aggregation failed");
    res.status(502).json({ error: "Unable to aggregate hotel offers" });
  }
});

function parseOptionalPrice(value: unknown, name: string, res: Response): number | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    res.status(400).json({ error: `${name} must be a single non-negative number` });
    return null;
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({ error: `${name} must be a non-negative number` });
    return null;
  }
  return price;
}

async function start(): Promise<void> {
  const connection = await connectWithRetry();
  temporalClient = new Client({ connection });
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

async function connectWithRetry(): Promise<Connection> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      return await Connection.connect({ address: temporalAddress });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  throw lastError;
}

start().catch((error) => {
  console.error("API failed to start", error);
  process.exitCode = 1;
});
