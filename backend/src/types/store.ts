export type StoreStatus =
    | "provisioning"
    | "ready"
    | "failed"
    | "deleting"
    | "deleted"
    | "delete_failed"



export type StoreEngine = "woocommerce" | "medusa";

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


    
