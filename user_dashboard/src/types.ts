export type StoreStatus =
  | "provisioning"
  | "ready"
  | "failed"
  | "deleting"
  | "deleted"
  | "delete_failed"
  | string;

export interface StoreRecord {
  id: string;
  name: string;
  engine: string;
  namespace?: string | null;
  status: StoreStatus;
  store_url?: string | null;
  admin_url?: string | null;
  error_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  ready_at?: string | null;
  storeUrl?: string | null;
  adminUrl?: string | null;
  errorReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  readyAt?: string | null;
}

export type EngineOption = "woocommerce" | "medusa";
