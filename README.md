# Hotel Offer Orchestrator

This service aggregates two mock hotel suppliers.

## How it works

1. `GET /api/hotels?city=delhi` starts a Temporal workflow.
2. The workflow invokes Supplier A and Supplier B activities in parallel.
3. The workflow deduplicates by hotel name and keeps the cheaper offer.
4. The resulting list is stored in Redis. Redis stores both a hash of hotel data and a sorted-set price index.
5. Optional `minPrice` and `maxPrice` values are applied with Redis `ZRANGEBYSCORE`, so filtering happens in Redis rather than in application memory.
6. If one supplier is unavailable, the workflow continues with the other supplier; if both fail, the API returns an error.

The supplier routes are mock endpoints:

- `GET /supplierA/hotels?city=delhi`
- `GET /supplierB/hotels?city=delhi`

`GET /health` checks both supplier endpoints.

## Run with Docker

```bash
docker compose up --build
```

Then call (port `3001` is used here because port `3000` may already be occupied by another local service):

```text
http://127.0.0.1:3001/api/hotels?city=delhi&minPrice=5500&maxPrice=7000
```

## Run locally

Start Redis and Temporal, install dependencies, then run the API and worker in separate terminals:

```bash
npm install
npm run build
npm test
npm run dev:api
npm run dev:worker
```

Import `postman/Hotel-Offer-Orchestrator.postman_collection.json` into Postman for example requests.
