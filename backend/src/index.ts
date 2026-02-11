import { app } from "./server";
import { provisioningWorker } from "./provisioning/worker";

const PORT = 3000;
const WORKER_INTERVAL_MS = 10_000;

app.listen(PORT, () => {
  // console.log(`Platform API running on port ${PORT}`);
  console.log(`server is running at http://localhost:${PORT}`);
  setInterval(() => {
    provisioningWorker().catch(err => {
      console.error("Provisioning worker error:", err);
    });
  }, WORKER_INTERVAL_MS);
});
