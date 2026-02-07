import { db } from "./db"
import { Store } from "../types/store"

export function createStore(store: Store){
    const stmt = db.prepare(
        `INSERT INTO stores (id, name, engine, namespace, status, store_url, admin_url, error_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
    );

    stmt.run(
        store.id,
        store.name,
        store.engine,
        store.namespace,
        store.status,
        store.storeUrl ?? null,
        store.adminUrl ?? null,
        store.errorReason ?? null,
        store.createdAt,
        store.updatedAt
    );
}

export function listStores(): Store[] {
    return db.prepare(`SELECT * FROM stores`).all() as Store[];
}



