import { db } from "../db/db";
import { isMedusaReady, isWordPressReady } from "./readiness";
import { getServiceExternalUrl } from "../k8s/service";

const STORE_PROTOCOL = process.env.STORE_PROTOCOL ?? "http";

export async function provisioningWorker(): Promise<void> {
  const stores = db
    .prepare(`SELECT * FROM stores WHERE status IN ('provisioning', 'ready')`)
    .all() as Array<{ id: string; namespace?: string; engine?: string; status?: string }>;

  for (const store of stores) {
    try {
      if (!store.namespace) {
        const reason = "missing namespace";
        db.prepare(`
          UPDATE stores
          SET status = 'failed', error_reason = ?, updated_at = ?
          WHERE id = ?
        `).run(reason, new Date().toISOString(), store.id);
        console.warn(`Store ${store.id} missing namespace - marked failed`);
        continue;
      }

      const engine = (store.engine ?? "").toLowerCase();

      if (engine !== "woocommerce" && engine !== "medusa") {
        const reason = "unknown engine";
        db.prepare(`
          UPDATE stores
          SET status = 'failed', error_reason = ?, updated_at = ?
          WHERE id = ?
        `).run(reason, new Date().toISOString(), store.id);
        console.warn(`Store ${store.id} failed: ${reason}`);
        continue;
      }
      
      const ready = engine === "woocommerce"
        ? await isWordPressReady(store.namespace)
        : await isMedusaReady(store.namespace);

      if (engine === "woocommerce") {
        const serviceName = `store-${store.id}-wordpress`;
        const externalUrl = await getServiceExternalUrl(
          store.namespace,
          serviceName,
          STORE_PROTOCOL
        );
        if (externalUrl) {
          const adminUrl = `${externalUrl}/wp-admin`;
          db.prepare(`
            UPDATE stores
            SET store_url = ?, admin_url = ?, updated_at = ?
            WHERE id = ?
          `).run(externalUrl, adminUrl, new Date().toISOString(), store.id);
        }
      }

      if (ready && store.status === "provisioning") {
        const now = new Date().toISOString();
        db.prepare(`
          UPDATE stores
          SET status = 'ready', ready_at = ?, updated_at = ?
          WHERE id = ?
        `).run(now, now, store.id);

        console.log(`Store ${store.id} is READY`);
      }
    } catch (err: any) {
      const reason = err instanceof Error ? err.message : String(err);
      db.prepare(`
        UPDATE stores
        SET status = 'failed', error_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(reason, new Date().toISOString(), store.id);
      console.error(`Provisioning failed for ${store.id}: ${reason}`);
    }
  }
}
