import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run(): Promise<void> {
  const connection = await connectWithRetry();
  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: "hotel-offers",
    workflowsPath: require.resolve("./workflows"),
    activities
  });
  await worker.run();
}

async function connectWithRetry(): Promise<NativeConnection> {
  const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
  let lastError: unknown;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      return await NativeConnection.connect({ address });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  throw lastError;
}

run().catch((error) => {
  console.error("Worker failed", error);
  process.exitCode = 1;
});
