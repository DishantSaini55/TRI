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

app.get("/", (_req: Request, res: Response) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hotel Offer Finder</title>
  <style>
    :root { color-scheme: light; --navy:#102542; --blue:#177ddc; --cream:#f4f7fb; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter,Segoe UI,Arial,sans-serif; background:var(--cream); color:#162033; }
    header { padding:22px 6%; background:var(--navy); color:white; display:flex; justify-content:space-between; align-items:center; }
    header strong { font-size:20px; }
    header span { color:#a9c8e8; }
    main { width:min(1100px,88%); margin:48px auto; }
    .hero { background:white; border-radius:20px; padding:30px; box-shadow:0 12px 40px rgba(16,37,66,.10); }
    h1 { margin:0 0 8px; font-size:36px; }
    .subtitle { margin:0 0 24px; color:#68758a; }
    form { display:grid; grid-template-columns:1.4fr 1fr 1fr auto; gap:12px; }
    label { font-size:12px; font-weight:700; color:#536176; display:block; margin-bottom:7px; }
    input { width:100%; height:48px; border:1px solid #d5dde8; border-radius:10px; padding:0 14px; font-size:15px; }
    button { height:48px; align-self:end; border:0; border-radius:10px; background:var(--blue); color:white; padding:0 22px; font-weight:800; cursor:pointer; }
    button:disabled { opacity:.65; cursor:wait; }
    .status { margin-top:18px; min-height:24px; color:#68758a; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:22px; }
    .card { background:white; border-radius:16px; padding:22px; box-shadow:0 8px 24px rgba(16,37,66,.08); border-top:4px solid var(--blue); }
    .card h2 { margin:0 0 18px; font-size:20px; }
    .price { font-size:28px; font-weight:850; color:var(--navy); }
    .meta { margin-top:12px; color:#68758a; display:flex; justify-content:space-between; gap:12px; }
    .empty { grid-column:1/-1; background:white; border-radius:16px; padding:30px; text-align:center; color:#68758a; }
    @media (max-width:800px) { form { grid-template-columns:1fr 1fr; } button { width:100%; } .grid { grid-template-columns:1fr; } h1 { font-size:28px; } }
  </style>
</head>
<body>
  <header><strong>StayScout</strong><span>Hotel Offer Finder</span></header>
  <main>
    <section class="hero">
      <h1>Find the best hotel price</h1>
      <p class="subtitle">Compare offers from two suppliers and instantly see the cheapest rate.</p>
      <form id="search">
        <div><label for="city">CITY</label><input id="city" value="delhi" required></div>
        <div><label for="minPrice">MINIMUM PRICE</label><input id="minPrice" type="number" min="0" placeholder="No minimum"></div>
        <div><label for="maxPrice">MAXIMUM PRICE</label><input id="maxPrice" type="number" min="0" placeholder="No maximum"></div>
        <button id="submit" type="submit">Search hotels</button>
      </form>
      <div id="status" class="status"></div>
    </section>
    <section id="results" class="grid"></section>
  </main>
  <script>
    const form = document.querySelector("#search");
    const results = document.querySelector("#results");
    const status = document.querySelector("#status");
    const submit = document.querySelector("#submit");
    async function search(event) {
      if (event) event.preventEvent ? event.preventEvent() : event.preventDefault();
      const city = document.querySelector("#city").value.trim();
      const minPrice = document.querySelector("#minPrice").value;
      const maxPrice = document.querySelector("#maxPrice").value;
      const params = new URLSearchParams({ city });
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      submit.disabled = true;
      status.textContent = "Searching supplier offers...";
      results.innerHTML = "";
      try {
        const response = await fetch("/api/hotels?" + params);
        if (!response.ok) throw new Error((await response.json()).error || "Unable to load hotels");
        const hotels = await response.json();
        status.textContent = hotels.length ? hotels.length + " hotel offer" + (hotels.length === 1 ? "" : "s") + " found" : "No hotels match your search";
        results.innerHTML = hotels.length ? hotels.map(hotel => 
          '<article class="card"><h2>' + escapeHtml(hotel.name) + '</h2><div class="price">₹' + hotel.price.toLocaleString("en-IN") + '</div><div class="meta"><span>' + escapeHtml(hotel.supplier) + '</span><span>' + hotel.commissionPct + '% commission</span></div></article>'
        ).join("") : '<div class="empty">Try another city or wider price range.</div>';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    }
    function escapeHtml(value) {
      const node = document.createElement("div");
      node.textContent = String(value);
      return node.innerHTML;
    }
    form.addEventListener("submit", search);
    search();
  </script>
</body>
</html>`);
});

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
