import { Router } from "express";
import { createStore, listStores } from "../db/storeRepo"
import { Store } from "../types/store";
import { createNamespace } from "../k8s/namespace";


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

    res.status(201).json(store);
});

storesRouter.get('/', (_, res)=>{
    res.json(listStores());
})


