export type StoreStatus = 
    | "provisioning"
    | "ready"
    | "failed"
    | "deleting"



export type StoreEngine = "woocommerece" | "medusa";

export interface Store {
    id: string;
    name: string;
    engine: StoreEngine;
    namespace: string;
    status: StoreStatus;
    storeUrl?: string;
    adminUrl?: string;
    errorReason?: string;
    createdAt: string;
    updatedAt: string;
}


    