import { Router } from "express";
import { createStore, listStores } from "../db/storeRepo"
import { Store } from "../types/store";
import { createNamespace } from "../k8s/namespace";
import { applyResourceQuota } from "../k8s/quota";
import { applyLimitRange } from "../k8s/limitRange";
import { installWooCommerce } from "../helm/installer";
import { provisioningWorker } from "../provisioning/worker";
import { deleteStore } from "../provisioning/delete_worker";


export const storesRouter = Router();

storesRouter.post('/', async (req, res)=>{
    const { name, engine} = req.body;

    if(!name || ! engine){
        return res.status(400).json({ error: "Missing required fields: name, engine" });
    }

    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const namespace = `store-${id}`;

    const now = new Date().toISOString();

    const store: Store = {
        id,
        name,
        engine,
        namespace,
        status: "provisioning",
        createdAt: now,
        updatedAt: now
    }

    createStore(store);

    await createNamespace(namespace, {
        "platform/store-id": id,
        "platform/engine": engine
    });

    await applyResourceQuota(namespace);
    await applyLimitRange(namespace);

    const releaseName = `store-${id}`;
    await installWooCommerce(releaseName, namespace);

    setInterval(()=>{
        provisioningWorker();
    }, 10_000);
    
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

