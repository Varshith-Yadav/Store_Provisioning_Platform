import { Router } from "express";
import { createStore, listStores } from "../db/storeRepo"
import { randomBytes } from "crypto";
import { Store, StoreEngine } from "../types/store";
import { createNamespace } from "../k8s/namespace";
import { applyResourceQuota } from "../k8s/quota";
import { applyLimitRange } from "../k8s/limitRange";
import { upsertOpaqueSecret } from "../k8s/secret";
import { installWooCommerce } from "../helm/installer";
import { installMedusa } from "../helm/medusa_installer";
import { deleteStore } from "../provisioning/delete_worker";

const STORE_DOMAIN = process.env.STORE_DOMAIN ?? "localhost";
const STORE_PROTOCOL = process.env.STORE_PROTOCOL ?? "http";
const STORE_VALUES_FILE = process.env.STORE_VALUES_FILE;
const MEDUSA_VALUES_FILE = process.env.MEDUSA_VALUES_FILE;
const WORDPRESS_SECRET_NAME = process.env.WORDPRESS_SECRET_NAME ?? "wordpress-credentials";

const allowedEngines: StoreEngine[] = ["woocommerce", "medusa"];

function normalizeEngine(engine: string): StoreEngine | null {
    const value = engine.toLowerCase().trim();
    return allowedEngines.includes(value as StoreEngine)
        ? (value as StoreEngine)
        : null;
}

function computeUrls(storeId: string, namespace: string, engine: StoreEngine) {
    const release = `store-${storeId}`;
    const host = `${release}.${STORE_DOMAIN}`;
    const storeUrl = `${STORE_PROTOCOL}://${host}`;
    const adminUrl = engine === "woocommerce"
        ? `${storeUrl}/wp-admin`
        : engine === "medusa"
            ? `${storeUrl}/app`
            : undefined;
    return { host, storeUrl, adminUrl };
}

function generatePassword(): string {
    return randomBytes(24)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 16);
}

export const storesRouter = Router();

storesRouter.post('/', async (req, res)=>{
    const { name, engine} = req.body;

    if(!name || !engine){
        return res.status(400).json({ error: "Missing required fields: name, engine" });
    }

    const normalizedEngine = normalizeEngine(engine);
    if (!normalizedEngine) {
        return res.status(400).json({ error: "Invalid engine. Use 'woocommerce' or 'medusa'." });
    }

    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const namespace = `store-${id}`;

    const now = new Date().toISOString();
    const { host, storeUrl, adminUrl } = computeUrls(id, namespace, normalizedEngine);

    const store: Store = {
        id,
        name,
        engine: normalizedEngine,
        namespace,
        status: "provisioning",
        storeUrl,
        adminUrl,
        createdAt: now,
        updatedAt: now
    }

    createStore(store);

    await createNamespace(namespace, {
        "platform/store-id": id,
        "platform/engine": normalizedEngine
    });

    await applyResourceQuota(namespace);
    await applyLimitRange(namespace);

    if (normalizedEngine === "woocommerce") {
        const password = generatePassword();
        await upsertOpaqueSecret(namespace, WORDPRESS_SECRET_NAME, {
            "wordpress-password": password
        });
        await installWooCommerce(
            id,
            namespace,
            host,
            STORE_VALUES_FILE,
            STORE_PROTOCOL,
            WORDPRESS_SECRET_NAME
        );
    } else {
        await installMedusa(id, namespace, host, MEDUSA_VALUES_FILE, STORE_PROTOCOL);
    }
    
    res.status(201).json(store);
});

storesRouter.get('/', (_, res)=>{
    res.json(listStores());
})

storesRouter.delete("/:id", async (req, res)=>{
    try{
        await deleteStore(req.params.id);
        res.status(202).json({message: "Store deletion started"});
    }catch(err){
        res.status(500).json({error: String(err)});
    }
})

