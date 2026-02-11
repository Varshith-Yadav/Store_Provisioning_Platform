import { db } from "../db/db";
import { uninstallMedusa, uninstallWooCommerce } from "./helm_delete";
import { deleteNamespace } from "../k8s/namespace_delete";

export async function deleteStore(storeId: string): Promise<void> {
  const store = db
    .prepare(`SELECT * FROM stores WHERE id = ?`)
    .get(storeId) as { id: string; namespace?: string; engine?: string } | undefined;

  if (!store) throw new Error("Store not found");

  if (!store.namespace) {
    db.prepare(`
      UPDATE stores SET status = 'deleted', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), storeId);
    console.warn(`Store ${storeId} missing namespace - marked deleted`);
    return;
  }

  try {
    // 1. mark deleting
    db.prepare(`
      UPDATE stores SET status = 'deleting', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), storeId);

    // 2. uninstall app
    const engine = (store.engine ?? "woocommerce").toLowerCase();
    try {
      if (engine === "woocommerce") {
        await uninstallWooCommerce(storeId, store.namespace);
      } else if (engine === "medusa") {
        await uninstallMedusa(storeId, store.namespace);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("not found")) {
        throw err;
      }
      console.warn(`Release not found for ${storeId}, continuing cleanup`);
    }

    // 3. delete namespace
    await deleteNamespace(store.namespace);

    // 4. mark deleted (or remove row)
    db.prepare(`
      UPDATE stores SET status = 'deleted', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), storeId);

    console.log(`Store ${storeId} deleted successfully`);
  } catch (err: any) {
    const reason = err instanceof Error ? err.message : String(err);
    db.prepare(`
      UPDATE stores SET status = 'delete_failed', error_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, new Date().toISOString(), storeId);
    console.error(`Delete failed for ${storeId}: ${reason}`);
    throw err;
  }
}
